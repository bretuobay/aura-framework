# Requirements Document

## Introduction

`@aura/server` provides Hono/Node.js middleware helpers and the reference AUIP v0 route handlers for the AURA TypeScript framework. It is the server-side backbone of the implementation/prototype work: it registers all nine AUIP v0 endpoints, validates every incoming request body using `@aura/protocol` schemas, manages in-memory session, context, and profile state, integrates with the `@aura/rules` evaluation pipeline, delivers validated prescriptions over SSE, enforces consent policy at every boundary, records feedback, and exposes the explanation, consent, profile, and correction endpoints. It implements AURA as progressive enhancement: server failure, invalid manifests, stale context, consent revocation, and policy rejection must result in no prescription rather than degraded host rendering.

`@aura/server` must expose typed storage interfaces for every stateful concern so that in-memory implementations can be replaced by Redis, PostgreSQL, Cloudflare Durable Objects, or any other persistence layer without changing the route-handler logic.

The package has a strict dependency on `@aura/protocol` for all schema types and runtime validation. It must not introduce browser-incompatible dependencies in its protocol or type layers, but it may depend on Node.js APIs and Hono in its server layer.

---

## Glossary

- **AUIP**: Adaptive UI Protocol. The JSON-over-HTTP + SSE protocol governing all communication between host SDKs and the AURA server.
- **Server_Package**: The `@aura/server` npm package, providing Hono/Node middleware helpers and reference AUIP v0 route handlers.
- **RouteRegistrar**: The function exported by `Server_Package` that mounts all AUIP v0 routes onto a Hono application instance.
- **SessionStore**: A typed storage interface for AUIP session records, holding session ID, user ID, manifest, consent profile, context model, context sequence ID, creation timestamp, and status.
- **SessionRecord**: A stored entry in `SessionStore` representing one active or terminated AUIP session.
- **ContextStore**: A typed storage interface for the per-session `ContextModel` snapshot.
- **ContextSequenceId**: A non-negative integer representing the latest host context version known to the server for a session.
- **ContextLock**: The `UIPrescription.contextLock` object that binds a prescription to the context sequence used by the rules pipeline.
- **UserModelStore**: A typed storage interface for per-user `ProfileAttribute` collections.
- **FeedbackStore**: A typed storage interface for persisted `FeedbackEvent` records.
- **ExplanationStore**: A typed storage interface for `ExplanationRecord` objects keyed by prescription ID.
- **PrescriptionStore**: A typed storage interface for emitted `UIPrescription` records, used for expiry enforcement and explanation linkage.
- **SSE_Stream**: A server-sent event stream opened by a client on `GET /aura/prescriptions/stream`. The stream carries `UIPrescription` events to the subscribed SDK client.
- **StreamRegistry**: The in-process registry that maps active session IDs to open `SSE_Stream` connections.
- **RulesPipeline**: The integration point with `@aura/rules` that receives events, context, context sequence ID, user model, manifest, and consent state, and returns zero or more candidate `UIPrescription` objects.
- **CapabilityRegistry**: The per-session component that stores the session manifest and validates every candidate prescription against declared surfaces, slots, components, variants, and props.
- **ManifestVersion**: The manifest version pinned at session initialization and used to reject prescriptions created against a different manifest.
- **CapabilityManifest**: A host-authored declaration of the surfaces, components, variants, props, risk classes, and consent requirements that AURA may influence (defined in `@aura/protocol`).
- **UIPrescription**: A bounded prescription produced by the rules pipeline and validated by the `CapabilityRegistry` before delivery (defined in `@aura/protocol`).
- **ConsentProfile**: A map of `DataClass` keys to boolean values governing data collection, inference, retention, and model use (defined in `@aura/protocol`).
- **ProfileAttribute**: A single adaptive attribute in the user model, with provenance, confidence, optional expiry, and data class (defined in `@aura/protocol`).
- **FeedbackEvent**: A user or host signal recording how a prescription was received: accept, dismiss, override, undo, reject, or error (defined in `@aura/protocol`).
- **ExplanationRecord**: Audience-specific rationale attached to a `UIPrescription` (defined in `@aura/protocol`).
- **DataClass**: A named category of user data governed by consent, including behavior, personalization, accessibility, approximate location, health, education, demographics, emotion, sensitive inference, model use, retention, and aggregation classes defined by `@aura/protocol`.
- **RiskClass**: An enumerated governance tier (`low`, `medium`, `high`, `critical`) controlling default prescription mode and human confirmation requirements.
- **PrescriptionMode**: An enumerated delivery mode (`recommend`, `autoApply`, `askUser`, `observeOnly`).
- **ISO_Timestamp**: A string in ISO 8601 format representing a point in time (e.g. `2024-01-15T10:30:00.000Z`).
- **StorageAdapter**: Any concrete implementation of a storage interface (`SessionStore`, `ContextStore`, `UserModelStore`, `FeedbackStore`, `ExplanationStore`, `PrescriptionStore`) that can be substituted for the default in-memory implementation.
- **InMemoryAdapter**: The default `StorageAdapter` implementations bundled with `Server_Package` that keep all state in process memory and require no external dependencies.
- **Hono**: The lightweight TypeScript web framework used as the HTTP routing layer for all AUIP v0 route handlers.
- **SessionId**: A non-empty string uniquely identifying an AUIP session, supplied by the SDK client at session initialization and included in every subsequent request.
- **SecurityAuditRecord**: A structured server log entry recording prompt-injection indicators, suspicious event replay, profile poisoning attempts, rate-limit actions, policy violations, model-output validation failures, and other adversarial-hardening signals.


---

## Requirements

### Requirement 1: Hono Route Registration

**User Story:** As a backend engineer, I want to mount all AUIP v0 routes onto a Hono application with a single function call, so that I can integrate AURA into an existing Hono/Node server without manually wiring each route.

#### Acceptance Criteria

1. THE `Server_Package` SHALL export a `registerAuipRoutes` function that accepts a Hono application instance and a configuration object containing `StorageAdapter` instances and a `RulesPipeline` reference, and mounts all nine AUIP v0 routes under the `/aura` prefix.
2. WHEN `registerAuipRoutes` is called, THE `Server_Package` SHALL register the following routes: `POST /aura/session`, `POST /aura/events`, `POST /aura/context`, `GET /aura/prescriptions/stream`, `POST /aura/feedback`, `GET /aura/explain/:id`, `POST /aura/consent`, `GET /aura/profile`, and `POST /aura/profile/correction`.
3. WHEN `registerAuipRoutes` is called with a custom `StorageAdapter` for any store, THE `Server_Package` SHALL use that adapter in place of the `InMemoryAdapter` for the corresponding store without requiring changes to any route handler.
4. THE `Server_Package` SHALL export typed factory functions `createInMemorySessionStore`, `createInMemoryContextStore`, `createInMemoryUserModelStore`, `createInMemoryFeedbackStore`, `createInMemoryExplanationStore`, and `createInMemoryPrescriptionStore` that return `InMemoryAdapter` instances satisfying the corresponding storage interfaces.
5. WHEN a request arrives at any AUIP route before `registerAuipRoutes` has been called, THE `Server_Package` SHALL not be responsible for the response; route registration ordering is the caller's responsibility.
6. THE `Server_Package` SHALL export TypeScript interface types `ISessionStore`, `IContextStore`, `IUserModelStore`, `IFeedbackStore`, `IExplanationStore`, and `IPrescriptionStore` so that third-party `StorageAdapter` authors have a typed contract to implement.

---

### Requirement 2: Session Initialization — POST /aura/session

**User Story:** As an SDK client, I want to start an AUIP session by sending a manifest, consent profile, and initial context, so that the server can initialize state and begin processing events for my user.

#### Acceptance Criteria

1. WHEN a `POST /aura/session` request is received with a body conforming to `SessionRequestSchema`, THE `Server_Package` SHALL validate the body using `@aura/protocol`, create a `SessionRecord` in the `SessionStore`, store the manifest in the `CapabilityRegistry` for the session, persist the consent profile, persist the initial context and `contextSequenceId`, and return an HTTP 200 response with a body conforming to `SessionResponseSchema` with `status: "active"`.
2. WHEN a `POST /aura/session` request body fails `SessionRequestSchema` validation, THE `Server_Package` SHALL return an HTTP 400 response with a JSON body containing a `errors` array of descriptive validation error messages and SHALL NOT create any session state.
3. WHEN a `POST /aura/session` request is received with a `sessionId` that already exists in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 409 response with a JSON body indicating the conflict and SHALL NOT overwrite the existing session.
4. WHEN a `POST /aura/session` request body contains a `manifest` that fails `CapabilityManifestSchema` validation, THE `Server_Package` SHALL return an HTTP 422 response with a JSON body identifying the manifest validation errors and SHALL NOT create any session state.
5. WHEN a session is successfully created, THE `Server_Package` SHALL record the creation `ISO_Timestamp` on the `SessionRecord` and set the session status to `active`.
6. WHEN a valid `POST /aura/session` request is processed, THE `SessionStore` SHALL contain a retrievable `SessionRecord` with a `sessionId` equal to the `sessionId` in the request body (round-trip storage property).
7. FOR ALL valid `SessionRequestSchema`-conforming payloads, re-validating the stored `SessionRecord`'s manifest through `CapabilityManifestSchema` SHALL succeed (manifest storage correctness property).
8. WHEN a session is created, THE `Server_Package` SHALL treat the submitted manifest as immutable and session-scoped; subsequent context, consent, event, feedback, profile, or explanation requests SHALL NOT mutate the stored manifest.
9. WHEN the submitted manifest has no `version`, THE `Server_Package` SHALL store the session manifest version as `"unversioned"` for comparison and devtools display.
10. WHEN a session is created with a manifest `version`, THE `Server_Package` SHALL persist that exact string as the `ManifestVersion` used by the `CapabilityRegistry`.

---

### Requirement 3: Event Ingestion — POST /aura/events

**User Story:** As an SDK client, I want to emit batches of typed events so that the server can update session state, invoke the rules pipeline, and stream any resulting prescriptions back to me.

#### Acceptance Criteria

1. WHEN a `POST /aura/events` request is received with a body conforming to `EventsRequestSchema`, THE `Server_Package` SHALL validate the body using `@aura/protocol`, look up the session by `sessionId`, pass the validated events along with the current context, current `contextSequenceId`, user model, manifest, and consent profile to the `RulesPipeline`, and return an HTTP 200 response with a body conforming to `EventsResponseSchema`.
2. WHEN a `POST /aura/events` request body fails `EventsRequestSchema` validation, THE `Server_Package` SHALL return an HTTP 400 response with a JSON body containing a `errors` array and SHALL NOT invoke the `RulesPipeline`.
3. WHEN a `POST /aura/events` request references a `sessionId` that does not exist in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 404 response and SHALL NOT invoke the `RulesPipeline`.
4. WHEN the `RulesPipeline` returns one or more candidate `UIPrescription` objects, THE `Server_Package` SHALL validate each candidate through `UIPrescriptionSchema` and the `CapabilityRegistry` before accepting it; candidates that fail validation SHALL be dropped atomically and the failure SHALL be logged; valid candidates whose `contextLock.sequenceId` equals the session's current `contextSequenceId` SHALL be stored in the `PrescriptionStore` and pushed to all open `SSE_Stream` connections for the session.
5. WHEN the `RulesPipeline` throws an error, THE `Server_Package` SHALL log the error with the session ID and event batch identifier, SHALL NOT emit any prescription for that evaluation cycle, and SHALL return an HTTP 200 response to the client (rule errors are internal; they must not surface as HTTP 5xx to the SDK).
6. WHEN an event in the batch references a `DataClass` for which the session consent profile has `false`, THE `Server_Package` SHALL filter out that event's sensitive payload fields before passing the event to the `RulesPipeline`.
7. FOR ALL valid batches of `AuraEvent` objects passed to `POST /aura/events` for an active session, the count of events received by the `RulesPipeline` SHALL be less than or equal to the count of events in the request body (consent filtering may reduce the count, but the pipeline SHALL never receive more events than were submitted).
8. FOR ALL candidate prescriptions returned by the `RulesPipeline`, any prescription that fails `UIPrescriptionSchema` validation SHALL NOT appear on any open `SSE_Stream` (invalid prescription exclusion invariant).
9. FOR ALL candidate prescriptions returned by the `RulesPipeline`, any prescription whose `contextLock.sequenceId` does not equal the session's current `contextSequenceId` SHALL NOT appear on any open `SSE_Stream` (stale-context exclusion invariant).
10. WHEN an event type is one of `surface.viewed`, `interaction.clicked`, `interaction.dismissed`, `feedback.submitted`, or `context.changed`, THE `Server_Package` SHALL treat it as part of the minimum AUIP event vocabulary and SHALL accept it if the rest of the `AuraEvent` envelope is valid.
11. WHEN an event type is outside the minimum AUIP event vocabulary, THE `Server_Package` SHALL treat it as a domain event and SHALL NOT reject it solely because the type is application-specific.
12. WHEN an event payload contains fields marked with revoked `DataClass` values or fields configured as sensitive by server policy, THE `Server_Package` SHALL strip or redact those fields before pipeline invocation and SHALL record the redaction in structured logs.

---

### Requirement 4: Context Update — POST /aura/context

**User Story:** As an SDK client, I want to push updated device, environment, or domain context so that the server can apply it to future adaptation decisions.

#### Acceptance Criteria

1. WHEN a `POST /aura/context` request is received with a body conforming to `ContextRequestSchema`, THE `Server_Package` SHALL validate the body using `@aura/protocol`, look up the session by `sessionId`, merge the `contextPatch` fields into the existing `ContextModel` in the `ContextStore`, persist the request `contextSequenceId` as the latest known context sequence for the session, and return an HTTP 200 response with a body conforming to `ContextResponseSchema`.
2. WHEN a `POST /aura/context` request body fails `ContextRequestSchema` validation, THE `Server_Package` SHALL return an HTTP 400 response with a JSON body containing a `errors` array and SHALL NOT modify the stored context.
3. WHEN a `POST /aura/context` request references a `sessionId` that does not exist in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 404 response and SHALL NOT modify any context state.
4. WHEN a `contextPatch` is applied to an existing `ContextModel`, THE `Server_Package` SHALL merge patch fields onto the stored model so that fields present in the patch are updated and fields absent from the patch retain their previous values.
5. FOR ALL valid `contextPatch` objects applied to an existing session context, reading the context from the `ContextStore` after the update SHALL return a value where every field present in `contextPatch` equals the corresponding patch field value (merge correctness property).
6. FOR ALL sequences of independent `contextPatch` objects that do not modify overlapping fields, applying them in any order SHALL produce the same final `ContextModel` (confluence property for non-overlapping patches).
7. WHEN a `POST /aura/context` request arrives with a `contextSequenceId` lower than the session's stored `contextSequenceId`, THE `Server_Package` SHALL ignore the stale patch, return HTTP 200 with a stale-context status or warning field, and SHALL NOT decrement the stored context sequence.
8. FOR ALL context updates applied to an active session, the stored `contextSequenceId` SHALL be monotonically non-decreasing.

---

### Requirement 5: SSE Prescription Streaming — GET /aura/prescriptions/stream

**User Story:** As an SDK client, I want to subscribe to a server-sent event stream so that I receive validated prescriptions in real time without polling.

#### Acceptance Criteria

1. WHEN a `GET /aura/prescriptions/stream` request is received with a valid `sessionId` query parameter matching an active session, THE `Server_Package` SHALL open an `SSE_Stream` connection, register it in the `StreamRegistry` under the session ID, set the `Content-Type` response header to `text/event-stream`, set `Cache-Control: no-cache`, and keep the connection open until the client disconnects or the session is terminated.
2. WHEN a `GET /aura/prescriptions/stream` request is received with a `sessionId` that does not exist in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 404 response and SHALL NOT register an SSE connection.
3. WHEN a validated `UIPrescription` is available for a session and its `contextLock.sequenceId` equals the current session `contextSequenceId`, THE `Server_Package` SHALL serialize it as a JSON string and write it to all open `SSE_Stream` connections registered for that session using the `data:` SSE field and a `\n\n` terminator.
4. WHEN a client disconnects from the `SSE_Stream`, THE `Server_Package` SHALL remove the connection from the `StreamRegistry` and release associated resources.
5. WHEN the client reconnects to `GET /aura/prescriptions/stream` after a disconnection and provides a `Last-Event-ID` header, THE `Server_Package` SHALL NOT replay any `UIPrescription` whose `constraints.expiresAt` is earlier than the reconnection `ISO_Timestamp`.
6. WHEN the `Server_Package` writes a prescription to the SSE stream, THE `Server_Package` SHALL include the prescription `id` as the SSE `id:` field so that the client can use it as `Last-Event-ID` on reconnect.
7. FOR ALL `UIPrescription` objects with `constraints.expiresAt` earlier than the current server time, NONE SHALL be written to any `SSE_Stream` (expired prescription exclusion invariant).
8. WHEN multiple `SSE_Stream` connections are open for the same session, THE `Server_Package` SHALL deliver the same prescription payload to all registered connections for that session.
9. FOR ALL `UIPrescription` objects whose `contextLock.sequenceId` does not equal the current session `contextSequenceId`, NONE SHALL be written to any `SSE_Stream` (stale-context stream exclusion invariant).

---

### Requirement 6: Feedback Recording — POST /aura/feedback

**User Story:** As an SDK client, I want to send accept, dismiss, override, undo, reject, or error feedback so that the server records the adaptation loop outcome and makes it available for observability and future rule tuning.

#### Acceptance Criteria

1. WHEN a `POST /aura/feedback` request is received with a body conforming to `FeedbackRequestSchema`, THE `Server_Package` SHALL validate the body using `@aura/protocol`, look up the session by `sessionId`, persist the `FeedbackEvent` in the `FeedbackStore` keyed by the `feedback.prescriptionId` and session ID, and return an HTTP 200 response with a body conforming to `FeedbackResponseSchema`.
2. WHEN a `POST /aura/feedback` request body fails `FeedbackRequestSchema` validation, THE `Server_Package` SHALL return an HTTP 400 response with a JSON body containing a `errors` array and SHALL NOT persist any feedback record.
3. WHEN a `POST /aura/feedback` request references a `sessionId` that does not exist in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 404 response.
4. THE `Server_Package` SHALL accept `FeedbackEvent` objects with `action` values of `accept`, `dismiss`, `override`, `undo`, `reject`, and `error` without treating any of these as an error condition.
5. FOR ALL valid `FeedbackEvent` objects successfully stored via `POST /aura/feedback`, retrieving the feedback record from the `FeedbackStore` by prescription ID and session ID SHALL return a record with field values equal to the submitted `FeedbackEvent` (round-trip storage property).
6. WHEN the same `prescriptionId` receives multiple `FeedbackEvent` submissions for the same session, THE `Server_Package` SHALL store all submissions without overwriting earlier records, and each stored record SHALL be individually retrievable.

---


### Requirement 7: Explanation Endpoint — GET /aura/explain/:id

**User Story:** As an SDK client or devtools user, I want to fetch the explanation for a specific prescription by its ID so that I can present rationale to the user or developer.

#### Acceptance Criteria

1. WHEN a `GET /aura/explain/:id` request is received with a valid prescription ID that exists in the `ExplanationStore`, THE `Server_Package` SHALL return an HTTP 200 response with a JSON body containing the `ExplanationRecord` conforming to `ExplanationRecordSchema`.
2. WHEN a `GET /aura/explain/:id` request references a prescription ID that does not exist in the `ExplanationStore`, THE `Server_Package` SHALL return an HTTP 404 response with a JSON body containing a `message` field.
3. WHEN a `GET /aura/explain/:id` request references a prescription ID that exists but the session ID provided in the request (via query parameter or header) does not match the session under which the explanation was recorded, THE `Server_Package` SHALL return an HTTP 403 response.
4. WHEN the `Server_Package` stores an `ExplanationRecord` for a prescription, THE `Server_Package` SHALL key it by the prescription `id` so that it is retrievable via `GET /aura/explain/:id`.
5. WHEN a valid `UIPrescription` containing an `explanation` field is emitted, THE `Server_Package` SHALL store the explanation in the `ExplanationStore` before or at the time the prescription is written to the `SSE_Stream`.

---

### Requirement 8: Consent Update — POST /aura/consent

**User Story:** As an SDK client, I want to update the session consent profile so that data collection and prescription generation reflect the user's current permissions.

#### Acceptance Criteria

1. WHEN a `POST /aura/consent` request is received with a body conforming to `ConsentRequestSchema`, THE `Server_Package` SHALL validate the body using `@aura/protocol`, look up the session by `sessionId`, merge the `consentPatch` into the stored `ConsentProfile`, persist the updated profile on the `SessionRecord`, and return an HTTP 200 response with a body conforming to `ConsentResponseSchema`.
2. WHEN a `POST /aura/consent` request body fails `ConsentRequestSchema` validation, THE `Server_Package` SHALL return an HTTP 400 response with a JSON body containing a `errors` array and SHALL NOT modify the stored consent profile.
3. WHEN a `POST /aura/consent` request references a `sessionId` that does not exist in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 404 response.
4. WHEN a `consentPatch` sets one or more `DataClass` keys to `false`, THE `Server_Package` SHALL immediately stop collecting or forwarding events whose payload is exclusively sourced from the revoked data classes, effective for all events received after the consent update is persisted.
5. WHEN a `consentPatch` sets one or more `DataClass` keys to `false`, THE `Server_Package` SHALL cancel any in-flight prescription that depends on the revoked data classes by removing it from the emission queue before it is written to the `SSE_Stream`.
6. FOR ALL consent patches applied to an active session, reading the `ConsentProfile` from the `SessionRecord` after the update SHALL return a profile where every `DataClass` key present in the patch equals the patch value (merge correctness property).
7. FOR ALL `DataClass` keys revoked in a consent patch, no `UIPrescription` that declares that `DataClass` in its audit `dataClassesUsed` field SHALL be written to the `SSE_Stream` after the revocation is persisted (post-revocation prescription exclusion invariant).
8. WHEN a consent patch grants a previously revoked `DataClass` by setting it to `true`, THE `Server_Package` SHALL resume collecting and forwarding events that depend on that data class for requests received after the grant is persisted.

---

### Requirement 9: Profile Endpoint — GET /aura/profile

**User Story:** As an SDK client, I want to fetch the adaptive profile summary for the current user so that I can display profile attributes and offer correction controls.

#### Acceptance Criteria

1. WHEN a `GET /aura/profile` request is received with a valid `sessionId` query parameter matching an active session, THE `Server_Package` SHALL look up the user ID from the `SessionRecord`, retrieve all `ProfileAttribute` objects for that user from the `UserModelStore`, filter the result to include only attributes where `userVisible` is `true` or where the attribute is not marked as internal, and return an HTTP 200 response with a JSON body containing the filtered profile attribute array.
2. WHEN a `GET /aura/profile` request references a `sessionId` that does not exist in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 404 response.
3. WHEN a `ProfileAttribute` has an `expiresAt` field and the current server time is after `expiresAt`, THE `Server_Package` SHALL exclude that attribute from the profile response.
4. FOR ALL active sessions, the profile response SHALL contain only attributes whose `dataClass` is permitted by the session's current `ConsentProfile` (consent-gated profile visibility property).
5. WHEN the `UserModelStore` contains no `ProfileAttribute` records for a user, THE `Server_Package` SHALL return an HTTP 200 response with an empty array.

---

### Requirement 10: Profile Correction — POST /aura/profile/correction

**User Story:** As an SDK client, I want to submit a profile correction so that the user can remove or override inferred attributes that are incorrect, and AURA stops using the corrected value.

#### Acceptance Criteria

1. WHEN a `POST /aura/profile/correction` request is received with a body conforming to `ProfileCorrectionRequestSchema`, THE `Server_Package` SHALL validate the body using `@aura/protocol`, look up the session by `sessionId`, apply the correction to the `UserModelStore`, and return an HTTP 200 response with a body conforming to `ProfileCorrectionResponseSchema`.
2. WHEN a `POST /aura/profile/correction` request body fails `ProfileCorrectionRequestSchema` validation, THE `Server_Package` SHALL return an HTTP 400 response with a JSON body containing a `errors` array and SHALL NOT modify the `UserModelStore`.
3. WHEN a `POST /aura/profile/correction` request references a `sessionId` that does not exist in the `SessionStore`, THE `Server_Package` SHALL return an HTTP 404 response.
4. WHEN the correction payload has `action: "remove"`, THE `Server_Package` SHALL delete the `ProfileAttribute` with the matching `attributeId` from the `UserModelStore` and SHALL stop passing that attribute to the `RulesPipeline` in all subsequent evaluations for that user.
5. WHEN the correction payload has `action: "correct"` and a `newValue` string, THE `Server_Package` SHALL update the matching `ProfileAttribute.value` to `newValue`, set its source or provenance to `explicit`, and reset its `confidence` to `1.0`.
6. WHEN the correction payload references an `attributeId` that does not exist in the `UserModelStore`, THE `Server_Package` SHALL return an HTTP 404 response with a JSON body identifying the missing attribute.
7. FOR ALL profile corrections with `action: "correct"`, re-reading the corrected `ProfileAttribute` from the `UserModelStore` after the update SHALL return a record with `value` equal to `newValue`, source or provenance equal to `explicit`, and `confidence` equal to `1.0` (correction round-trip property).
8. FOR ALL profile corrections with `action: "remove"`, the `UserModelStore` SHALL not contain a `ProfileAttribute` record with the corrected `attributeId` after the removal (removal invariant).

---

### Requirement 11: Capability Registry and Manifest Validation

**User Story:** As a server operator, I want every candidate prescription to be checked against the session manifest before emission, so that prescriptions referencing undeclared surfaces, slots, components, variants, or props never reach the client.

#### Acceptance Criteria

1. WHEN a `UIPrescription` candidate is received from the `RulesPipeline`, THE `Server_Package` SHALL look up the `CapabilityRegistry` entry for the session and validate that every `Adaptation` in the prescription references only surfaces, slots, components, and variants declared in the session manifest.
2. IF any `Adaptation` in a candidate prescription references a surface ID not declared in the session manifest, THE `Server_Package` SHALL reject the entire prescription, log a structured rejection record including the session ID, prescription ID, and the undeclared surface ID, and SHALL NOT write any part of the prescription to the `SSE_Stream`.
3. IF any `Adaptation` in a candidate prescription references a component ID or variant not declared in the session manifest, THE `Server_Package` SHALL reject the prescription and log the undeclared component ID or variant.
4. IF any `componentVariant` adaptation includes a `propsPatch` and the session manifest declares an `adaptableProps` schema for the referenced component, THE `Server_Package` SHALL validate the `propsPatch` against the declared schema using `@aura/protocol`; IF validation fails, THE `Server_Package` SHALL reject the prescription and log the failure.
5. WHEN a candidate prescription passes all `CapabilityRegistry` checks, THE `Server_Package` SHALL re-validate the prescription through `UIPrescriptionSchema` from `@aura/protocol` before writing it to the `SSE_Stream`.
6. FOR ALL candidate prescriptions generated across any valid rule evaluation, any prescription that references an undeclared surface, component, or variant SHALL NOT appear on the `SSE_Stream` (undeclared capability exclusion invariant).
7. WHEN a candidate prescription carries a `manifestVersion` that differs from the version stored for the session in the `CapabilityRegistry`, THE `Server_Package` SHALL reject the prescription and SHALL emit a structured session-refresh request to the `SSE_Stream` indicating a manifest mismatch.
8. WHEN a candidate prescription contains a layout-changing adaptation for a surface with `layoutStability.maxDecisionWaitMs`, THE `Server_Package` SHALL reject or drop the candidate if the elapsed evaluation time exceeds that budget before emission, and SHALL log the disposition as `late-layout-changing-prescription`.
9. WHEN a candidate prescription references a surface with `layoutStability.strategy` of `host-default`, THE `Server_Package` SHALL emit only prescriptions whose `latencyClass` and evaluation time satisfy the surface constraints; otherwise it SHALL keep the host default UI by dropping the prescription.
10. WHEN a candidate prescription contains multiple adaptations and any adaptation fails schema, manifest, consent, policy, context-lock, expiry, or layout-stability validation, THE `Server_Package` SHALL reject the entire prescription unless the prescription declares independent `adaptationGroups`.
11. WHEN a candidate prescription declares independent `adaptationGroups`, THE `Server_Package` SHALL validate and emit only groups that pass all checks; each emitted group SHALL retain its own explanation and audit metadata, and any rejected group SHALL be logged with its `groupId`.
12. WHEN a manifest mismatch is detected, THE `Server_Package` SHALL NOT mutate the session manifest in place; it SHALL request session refresh or reconciliation while the host continues with default UI.

---

### Requirement 12: Storage Interface Abstraction

**User Story:** As a backend engineer, I want all server-side state to be managed through typed storage interfaces, so that I can replace the default in-memory implementations with Redis, PostgreSQL, or any other persistence layer without modifying route handler logic.

#### Acceptance Criteria

1. THE `Server_Package` SHALL define `ISessionStore` with at minimum the methods `create(record: SessionRecord): Promise<void>`, `get(sessionId: string): Promise<SessionRecord | null>`, `update(sessionId: string, patch: Partial<SessionRecord>): Promise<void>`, and `delete(sessionId: string): Promise<void>`.
2. THE `Server_Package` SHALL define `IContextStore` with at minimum the methods `set(sessionId: string, context: ContextModel): Promise<void>` and `get(sessionId: string): Promise<ContextModel | null>`.
3. THE `Server_Package` SHALL define `IUserModelStore` with at minimum the methods `upsertAttribute(userId: string, attribute: ProfileAttribute): Promise<void>`, `getAttributes(userId: string): Promise<ProfileAttribute[]>`, `deleteAttribute(userId: string, attributeId: string): Promise<void>`, and `getAttribute(userId: string, attributeId: string): Promise<ProfileAttribute | null>`.
4. THE `Server_Package` SHALL define `IFeedbackStore` with at minimum the methods `record(sessionId: string, event: FeedbackEvent): Promise<void>` and `getByPrescriptionId(sessionId: string, prescriptionId: string): Promise<FeedbackEvent[]>`.
5. THE `Server_Package` SHALL define `IExplanationStore` with at minimum the methods `store(prescriptionId: string, explanation: ExplanationRecord): Promise<void>` and `get(prescriptionId: string): Promise<ExplanationRecord | null>`.
6. THE `Server_Package` SHALL define `IPrescriptionStore` with at minimum the methods `store(sessionId: string, prescription: UIPrescription): Promise<void>`, `get(sessionId: string, prescriptionId: string): Promise<UIPrescription | null>`, and `listActive(sessionId: string, asOf: ISO_Timestamp): Promise<UIPrescription[]>`.
7. WHEN a custom `StorageAdapter` implementing any storage interface is provided to `registerAuipRoutes`, THE `Server_Package` SHALL use that adapter for all reads and writes on the corresponding store without the route handlers needing to know which implementation is active (interface substitution property).
8. FOR ALL implementations that correctly satisfy the `ISessionStore` interface contract, a `SessionRecord` written via `create` SHALL be retrievable via `get` with equal field values (storage interface round-trip property).

---


### Requirement 13: Consent Enforcement at Every Boundary

**User Story:** As a privacy stakeholder, I want the server to enforce consent at every data boundary — event ingestion, rules pipeline input, prescription emission, and profile access — so that no user data is collected, processed, or exposed beyond the user's declared permissions.

#### Acceptance Criteria

1. WHEN an event is received at `POST /aura/events`, THE `Server_Package` SHALL check the session consent profile before forwarding event payload fields; payload fields whose only applicable `DataClass` is revoked SHALL be stripped from the event before it is passed to the `RulesPipeline`.
2. WHEN the `RulesPipeline` is invoked, THE `Server_Package` SHALL provide the current `ConsentProfile` as part of the pipeline input so that rules can gate their own behavior on consent state.
3. WHEN a `UIPrescription` candidate includes an `audit.dataClassesUsed` field, THE `Server_Package` SHALL check that every listed `DataClass` is currently permitted in the session consent profile; IF any listed `DataClass` is revoked, THE `Server_Package` SHALL reject the prescription and SHALL NOT emit it.
4. WHEN a `ConsentProfile` update revokes a `DataClass`, THE `Server_Package` SHALL immediately expire all `ProfileAttribute` objects whose `dataClass` matches the revoked class by setting their `expiresAt` to the current `ISO_Timestamp`, and SHALL stop passing those attributes to the `RulesPipeline`.
5. WHEN the profile endpoint is called, THE `Server_Package` SHALL exclude `ProfileAttribute` objects whose `dataClass` is revoked in the current consent profile from the response.
6. FOR ALL sessions, no `UIPrescription` written to the `SSE_Stream` SHALL declare a `DataClass` in `audit.dataClassesUsed` that is currently revoked in the session's `ConsentProfile` (consent enforcement invariant across all emitted prescriptions).
7. WHEN a session is initialized with an empty `ConsentProfile` (no data classes explicitly granted), THE `Server_Package` SHALL treat all `DataClass` values as revoked and SHALL NOT forward any events, generate any prescriptions, or expose any profile attributes until at least one `DataClass` is explicitly granted.

---

### Requirement 14: Failure and Degradation Handling

**User Story:** As a host application integrator, I want the server to degrade gracefully on internal errors so that failures in the AURA pipeline never surface as application-breaking errors to SDK clients.

#### Acceptance Criteria

1. WHEN the `RulesPipeline` throws an unhandled exception during event processing, THE `Server_Package` SHALL log the error including session ID, the triggering event batch size, and the error message, SHALL emit no prescription for that evaluation cycle, and SHALL return an HTTP 200 response to the `POST /aura/events` caller.
2. WHEN a candidate prescription fails `UIPrescriptionSchema` validation, THE `Server_Package` SHALL log a structured validation failure record including the session ID, the failing prescription ID, and the list of validation errors, and SHALL NOT emit the prescription to the `SSE_Stream`.
3. WHEN a candidate prescription fails `CapabilityRegistry` validation, THE `Server_Package` SHALL log a structured rejection record including the session ID, the prescription ID, and the specific undeclared capability reference, and SHALL NOT emit the prescription.
4. WHEN the `SSE_Stream` connection drops unexpectedly, THE `Server_Package` SHALL remove the connection from the `StreamRegistry` and SHALL NOT attempt to buffer or replay prescriptions that expired before reconnection.
5. WHEN a client reconnects to `GET /aura/prescriptions/stream` and provides a `Last-Event-ID`, THE `Server_Package` SHALL NOT replay any prescription with `constraints.expiresAt` earlier than or equal to the current server time at the moment of reconnect.
6. WHEN any storage operation on an `InMemoryAdapter` throws an error, THE `Server_Package` SHALL propagate the error as an HTTP 500 response to the caller rather than silently swallowing it, so that integration tests can detect storage failures.
7. WHEN a `POST /aura/events` request is received for a session whose consent profile permits no `DataClass`, THE `Server_Package` SHALL accept the request, filter all event payloads to empty, invoke the `RulesPipeline` with an empty event list, and return HTTP 200; no prescription SHALL be generated from an empty event list under a fully revoked consent state.
8. WHEN any AUIP route handler encounters an unhandled exception not covered by the specific failure modes above, THE `Server_Package` SHALL return an HTTP 500 response with a JSON body containing a `message` field and a sanitized error description, and SHALL log the full error details server-side.

---

### Requirement 15: Rules Pipeline Integration

**User Story:** As a server operator, I want the server to integrate with the `@aura/rules` evaluation pipeline through a typed interface, so that rules are evaluated consistently and the pipeline can be tested or replaced independently.

#### Acceptance Criteria

1. THE `Server_Package` SHALL define a `IRulesPipeline` interface with at minimum the method `evaluate(input: RulesPipelineInput): Promise<UIPrescription[]>`, where `RulesPipelineInput` contains the validated event batch, current `ContextModel`, current `contextSequenceId`, current `ConsentProfile`, user `ProfileAttribute` array, and session `CapabilityManifest`.
2. WHEN `registerAuipRoutes` is called, the caller SHALL provide a concrete `IRulesPipeline` implementation; THE `Server_Package` SHALL not provide a default no-op pipeline and SHALL require the pipeline to be explicitly configured.
3. WHEN the `RulesPipeline.evaluate` method is called, THE `Server_Package` SHALL pass only event payload fields permitted by the current `ConsentProfile`, and SHALL not pass any `ProfileAttribute` whose `dataClass` is revoked.
4. WHEN the `RulesPipeline.evaluate` method returns an empty array, THE `Server_Package` SHALL not write any prescription to the `SSE_Stream` and SHALL return an HTTP 200 response for the triggering `POST /aura/events` call.
5. FOR ALL `RulesPipelineInput` objects constructed by the `Server_Package`, the `consentProfile` field SHALL match the `ConsentProfile` currently stored for the session in the `SessionRecord` at the time of invocation (consent state consistency property).
6. WHEN the `RulesPipeline.evaluate` call takes longer than the configured pipeline timeout, THE `Server_Package` SHALL cancel the evaluation, log the timeout with session ID and elapsed time, and emit no prescription for that evaluation cycle; the timeout SHALL be configurable via the `registerAuipRoutes` configuration object.
7. WHEN `RulesPipeline.evaluate` returns after the session `contextSequenceId` has advanced beyond the input `contextSequenceId`, THE `Server_Package` SHALL drop all returned prescriptions as stale and SHALL log a stale-context rejection rather than emitting them.
8. THE `Server_Package` SHALL support configurable architectural latency budgets for `immediate`, `fast`, and `deliberate` prescription classes; default budgets SHALL be no more permissive than 50ms P95 target for `immediate`, 200ms P95 target for `fast`, and 2000ms with fallback for `deliberate`.
9. WHEN evaluation exceeds the budget for a prescription's declared `latencyClass`, THE `Server_Package` SHALL drop that prescription or emit a lower-latency fallback if one is already valid; it SHALL never block host rendering while waiting for a late model result.
10. WHEN a prescription includes `audit.decisionSource`, THE `Server_Package` SHALL preserve it in logs and devtools state with values such as `rules`, `recommender`, `slm`, or `llm` so operational cost and model routing decisions are observable.

---

### Requirement 16: Prescription Expiry Enforcement

**User Story:** As a system operator, I want prescriptions to be enforced as expired after their `expiresAt` timestamp so that stale adaptive suggestions never reach the client.

#### Acceptance Criteria

1. WHEN a `UIPrescription` is stored in the `PrescriptionStore`, THE `Server_Package` SHALL record the `constraints.expiresAt` value on the stored record.
2. WHEN writing a prescription to the `SSE_Stream`, THE `Server_Package` SHALL check the prescription's `constraints.expiresAt` against the current server time; IF the current time is greater than or equal to `expiresAt`, THE `Server_Package` SHALL drop the prescription and log the expiry event rather than writing it to the stream.
3. WHEN the `IPrescriptionStore.listActive` method is called with an `asOf` timestamp, THE `Server_Package` SHALL return only prescriptions whose `constraints.expiresAt` is strictly after `asOf`.
4. FOR ALL `UIPrescription` objects stored in the `PrescriptionStore`, re-reading via `listActive` with the current timestamp SHALL not include any prescription whose `constraints.expiresAt` is in the past (expiry filter correctness property).
5. WHEN a client reconnects to the SSE stream, THE `Server_Package` SHALL NOT replay any prescription whose `constraints.expiresAt` is in the past relative to the reconnection timestamp, regardless of whether the prescription was previously delivered.
6. WHEN a client reconnects to the SSE stream, THE `Server_Package` SHALL NOT replay any prescription whose `contextLock.sequenceId` does not equal the current session `contextSequenceId`.

---

### Requirement 17: Correctness Properties for Property-Based Testing

**User Story:** As a developer writing automated tests for `@aura/server`, I want a documented set of correctness properties that hold across the full input space, so that property-based tests can systematically verify server behavior.

#### Acceptance Criteria

1. **Session storage round-trip**: FOR ALL valid `SessionRequestSchema`-conforming payloads `s`, after a successful `POST /aura/session`, calling `ISessionStore.get(s.sessionId)` SHALL return a `SessionRecord` whose `sessionId`, `userId`, and `manifest` fields are deeply equal to the corresponding fields in `s`.

2. **Context merge correctness**: FOR ALL valid `contextPatch` objects `p` applied to an existing session context `c`, the resulting context `c'` stored in `IContextStore` SHALL satisfy: for every field key `k` present in `p`, `c'[k]` equals `p[k]`; and for every field key `k` absent from `p` that was present in `c`, `c'[k]` equals `c[k]`.

3. **Consent enforcement invariant**: FOR ALL active sessions, for all `UIPrescription` objects written to the `SSE_Stream`, the set of `DataClass` values in `audit.dataClassesUsed` SHALL be a subset of the set of `DataClass` keys currently set to `true` in the session's `ConsentProfile`.

4. **Invalid prescription exclusion invariant**: FOR ALL candidate `UIPrescription` objects returned by the `RulesPipeline`, any object that does not satisfy `UIPrescriptionSchema` SHALL NOT appear on any `SSE_Stream` connection. Equivalently, every prescription written to the stream SHALL parse successfully through `UIPrescriptionSchema`.

5. **Undeclared capability exclusion invariant**: FOR ALL candidate prescriptions whose `adaptations` array includes any entry referencing a surface, slot, component ID, or variant not declared in the session manifest, NONE SHALL be written to the `SSE_Stream`.

6. **Expired prescription exclusion invariant**: FOR ALL `UIPrescription` objects in the `PrescriptionStore`, any object with `constraints.expiresAt` earlier than or equal to the current server time at the time of attempted emission SHALL NOT be written to the `SSE_Stream`.

6a. **Stale context exclusion invariant**: FOR ALL `UIPrescription` objects returned by the `RulesPipeline`, any object whose `contextLock.sequenceId` is not equal to the session's current `contextSequenceId` at the time of attempted emission SHALL NOT be written to the `SSE_Stream`.

7. **Feedback round-trip**: FOR ALL valid `FeedbackEvent` objects `f` successfully stored via `POST /aura/feedback`, calling `IFeedbackStore.getByPrescriptionId(sessionId, f.prescriptionId)` SHALL return a list containing an element with field values deeply equal to `f`.

8. **Profile correction round-trip**: FOR ALL profile corrections with `action: "correct"` and `newValue` string `v`, after the correction is applied, calling `IUserModelStore.getAttribute(userId, attributeId)` SHALL return a `ProfileAttribute` with `value` equal to `v`, source or provenance equal to `"explicit"`, and `confidence` equal to `1.0`.

9. **Profile removal invariant**: FOR ALL profile corrections with `action: "remove"`, after the correction is applied, calling `IUserModelStore.getAttribute(userId, attributeId)` SHALL return `null`.

10. **Consent-gated profile visibility**: FOR ALL calls to `GET /aura/profile`, the response SHALL contain only `ProfileAttribute` objects whose `dataClass` is currently set to `true` in the session consent profile and whose `expiresAt` (if present) is strictly after the current server time.

11. **Rules pipeline consent consistency**: FOR ALL `RulesPipelineInput` objects constructed and dispatched by the `Server_Package`, the `consentProfile` field SHALL match the `ConsentProfile` last successfully persisted for the session by `ISessionStore.update` or from the session initialization record.

12. **Storage interface substitution**: FOR ALL correct implementations of any `IStore` interface, replacing the `InMemoryAdapter` with that implementation and running any route that exercises the store SHALL produce identical HTTP response status codes and response body shapes as the `InMemoryAdapter` implementation (behavioral equivalence under storage substitution).

13. **Manifest-version pinning**: FOR ALL prescriptions emitted for a session whose manifest version is `v`, the prescription `manifestVersion` SHALL equal `v`; prescriptions with any other `manifestVersion` SHALL NOT be written to the `SSE_Stream`.

14. **Atomic validation invariant**: FOR ALL candidate prescriptions without independent `adaptationGroups`, if any adaptation in the prescription fails validation, no adaptation from that prescription SHALL be written to the `SSE_Stream`.

---

### Requirement 18: Request Validation and Error Response Shape

**User Story:** As an SDK or integration test author, I want all validation errors to follow a consistent response shape so that clients can programmatically parse and display error details.

#### Acceptance Criteria

1. WHEN any AUIP POST route returns an HTTP 400 response due to request body validation failure, THE `Server_Package` SHALL include a JSON body with a top-level `errors` array, where each element contains at minimum a `field` string identifying the invalid field path and a `message` string describing the violation.
2. WHEN any AUIP route returns an HTTP 404 response, THE `Server_Package` SHALL include a JSON body with a `message` string identifying the resource that was not found (e.g. `"Session not found"`, `"Explanation not found"`).
3. WHEN any AUIP route returns an HTTP 409 response, THE `Server_Package` SHALL include a JSON body with a `message` string describing the conflict.
4. WHEN any AUIP route returns an HTTP 422 response, THE `Server_Package` SHALL include a JSON body with a `errors` array following the same structure as 400 error responses.
5. WHEN any AUIP route returns an HTTP 500 response, THE `Server_Package` SHALL include a JSON body with a `message` string containing a sanitized description of the failure and SHALL NOT expose internal stack traces or file paths in the response body.
6. THE `Server_Package` SHALL set the `Content-Type: application/json` response header for all non-SSE responses.
7. FOR ALL AUIP POST endpoints, a request with a body that is not valid JSON SHALL result in an HTTP 400 response with an `errors` array describing the parse failure.

---

### Requirement 19: Security and Adversarial Hardening

**User Story:** As a security or compliance stakeholder, I want the server to treat event payloads, profile updates, retrieved content, and model outputs as adversarial inputs, so that prompt injection, profile poisoning, replay, and model manipulation cannot bypass the capability boundary.

#### Acceptance Criteria

1. WHEN event payload text, retrieved content, or profile attribute values contain prompt-injection indicators configured by server policy, THE `Server_Package` SHALL record a `SecurityAuditRecord` and SHALL NOT pass the raw suspicious text to cloud-model decision paths unless `cloudModelUse` consent is granted and the policy allows it.
2. WHEN multiple identical event batches are received with the same `sessionId`, event IDs, and timestamps within a configurable replay window, THE `Server_Package` SHALL treat them as possible replay, rate-limit or drop duplicates according to policy, and record the disposition.
3. WHEN a profile correction attempts to update a sensitive or policy-protected attribute, THE `Server_Package` SHALL require that the attribute is user-visible and correction-eligible before applying the update; otherwise it SHALL return HTTP 403 and log the denial.
4. WHEN a model-produced or externally produced candidate prescription references undeclared capabilities, unsupported props, revoked data classes, or a mismatched manifest version, THE `Server_Package` SHALL reject it through the same `CapabilityRegistry` path as rule-produced candidates.
5. WHEN a high-risk or critical-risk prescription would require human confirmation by domain policy, THE `Server_Package` SHALL enforce `askUser` or `observeOnly` mode before emission and SHALL record the policy decision in the prescription audit log.
6. THE `Server_Package` SHALL expose security audit records to devtools state only when devtools is explicitly registered and SHALL sanitize raw sensitive payload values from those records.

