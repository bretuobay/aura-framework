# Requirements Document

## Introduction

`@aura/sdk` is the framework-neutral client SDK for browser environments in the AURA TypeScript framework. It is the sole owner of transport, session lifecycle, SSE prescription stream management, event queuing, context updates, feedback, consent, profile, and explanation calls. Every `@aura/*` framework adapter (React, Vue, Angular, Svelte, Solid) wraps this package — the SDK itself must have zero framework dependencies.

The SDK is instantiated once per host-application session by calling `createAuraClient(config)`. It manages the HTTP connection to an AUIP v0 server, subscribes to the `/aura/prescriptions/stream` SSE endpoint, queues outbound events in memory during transient network interruptions, tracks the host context sequence, drops prescriptions that have passed their expiry or whose context lock is stale, and degrades to a no-op mode when the AURA server is unavailable. It must never block host application rendering.

All types exchanged with the server conform to schemas defined in `@aura/protocol`. The SDK may import from `@aura/protocol` but must not depend on `@aura/server`, `@aura/rules`, `@aura/react`, or any other `@aura/*` package.

---

## Glossary

- **SDK**: The `@aura/sdk` npm package. The framework-neutral AUIP client for browser environments.
- **AuraClient**: The object returned by `createAuraClient(config)`. It exposes all SDK methods and manages the client-side AUIP session lifecycle.
- **AuraClientConfig**: The configuration object accepted by `createAuraClient`, containing `endpoint`, `manifest`, `userId`, `consentProfile`, and `context`.
- **Endpoint**: A fully qualified HTTPS (or HTTP for localhost) base URL string identifying the AUIP server, e.g. `https://api.example.com`.
- **SessionId**: A non-empty string issued by the server in the `POST /aura/session` response and used as the correlation key for all subsequent AUIP requests within the session.
- **SSE**: Server-Sent Events. The unidirectional HTTP streaming mechanism used by `/aura/prescriptions/stream` to push `UIPrescription` objects from the server to the SDK.
- **SSE_Connection**: The live `EventSource` (or equivalent fetch-based stream) managed by the SDK to receive prescriptions from `/aura/prescriptions/stream`.
- **PrescriptionStore**: The in-memory store maintained by the SDK holding the most recent non-expired and context-current `UIPrescription` per `surfaceId`.
- **PrescriptionListener**: A callback registered by the host application or framework adapter to be notified when a new prescription arrives for a given surface.
- **EventQueue**: The in-memory FIFO queue holding `AuraEvent` objects that have not yet been successfully POSTed to `/aura/events`.
- **Degraded_Mode**: The SDK operating state entered when the AURA server is unreachable, the session initialization fails, or the server returns a non-recoverable error. In this state all methods complete without error but perform no network calls.
- **ConsentPatch**: A partial `ConsentProfile` provided to `updateConsent()` to modify specific data-class consent values.
- **ContextPatch**: A partial `ContextModel` provided to `updateContext()` to update specific context fields without replacing the full context.
- **ContextSequenceId**: A non-negative integer maintained by the SDK that advances whenever the host context changes and is sent with session, event, and context requests.
- **ContextLock**: The `UIPrescription.contextLock` object identifying the context sequence and capture timestamp used to produce a prescription.
- **ExplanationRecord**: The explanation object returned by `explain(prescriptionId)` as defined in `@aura/protocol`.
- **ProfileSummary**: The user-visible adaptive profile returned by `getProfile()`, containing an array of `ProfileAttribute` objects.
- **ProfileCorrection**: The correction payload accepted by `correctProfile(correction)`, conforming to the profile correction schema in `@aura/protocol`.
- **FeedbackEvent**: The feedback object accepted by `feedback(feedbackEvent)` as defined in `@aura/protocol`.
- **AUIP**: Adaptive UI Protocol. The HTTP + SSE protocol defined in `@aura/protocol` governing all communication between SDK and server.
- **ISO_Timestamp**: A string in ISO 8601 format (e.g. `2024-01-15T10:30:00.000Z`) representing a point in time.
- **TTL**: Time-to-live. The duration before a queued event or prescription is considered expired and eligible for discard.
- **Reconnect_Backoff**: An exponential backoff strategy used when re-establishing the SSE connection after a disconnection.
- **DataClass**: A named category of user data governed by consent, as defined in `@aura/protocol` (e.g. `behavior`, `personalization`, `accessibility`, `approximateLocation`, `health`, `education`, `sensitiveInference`, `cloudModelUse`).
- **UIPrescription**: A bounded adaptation recommendation delivered over SSE, as defined in `@aura/protocol`.
- **CapabilityManifest**: The host-authored manifest declaring the surfaces, components, and variants available for adaptation, as defined in `@aura/protocol`.
- **ManifestVersion**: The manifest version pinned at SDK session initialization; prescriptions whose `manifestVersion` differs from this value are rejected before reaching host code.
- **LayoutStability**: Optional surface-level manifest metadata that tells host code and devtools whether an adaptive surface should reserve space, render a skeleton, or fall back to default UI after a decision budget.

---

## Requirements

### Requirement 1: Client Factory and Configuration

**User Story:** As a frontend engineer, I want to create an AURA client instance by calling `createAuraClient(config)` with a typed configuration object, so that I can integrate AURA into any browser application without framework-specific boilerplate.

#### Acceptance Criteria

1. THE `SDK` SHALL export a `createAuraClient(config: AuraClientConfig): AuraClient` function that accepts a typed configuration object and returns an `AuraClient` instance without performing any network call at construction time.
2. THE `AuraClientConfig` type SHALL require the following fields: `endpoint` (non-empty string), `manifest` (a value conforming to `CapabilityManifest` from `@aura/protocol`), `userId` (non-empty string), `consentProfile` (a value conforming to `ConsentProfile` from `@aura/protocol`), and `context` (a value conforming to `ContextModel` from `@aura/protocol`).
3. WHEN `createAuraClient` is called with a missing or empty `endpoint`, THE `SDK` SHALL throw a synchronous `AuraConfigError` before returning.
4. WHEN `createAuraClient` is called with a missing or empty `userId`, THE `SDK` SHALL throw a synchronous `AuraConfigError` before returning.
5. WHEN `createAuraClient` is called with a `manifest` that fails `CapabilityManifestSchema` validation from `@aura/protocol`, THE `SDK` SHALL throw a synchronous `AuraConfigError` before returning.
6. WHEN `createAuraClient` is called with a `consentProfile` that fails `ConsentProfileSchema` validation from `@aura/protocol`, THE `SDK` SHALL throw a synchronous `AuraConfigError` before returning.
7. WHEN `createAuraClient` is called with a `context` that fails `ContextModelSchema` validation from `@aura/protocol`, THE `SDK` SHALL throw a synchronous `AuraConfigError` before returning.
8. THE `SDK` SHALL NOT import React, Vue, Angular, Svelte, Solid, or any other framework runtime; the package MUST be importable in a plain TypeScript browser module without framework dependencies.
9. THE `SDK` SHALL NOT import Node.js built-in modules (`fs`, `path`, `http`, `net`, etc.) such that it is bundleable for browser environments without Node.js polyfills.
10. FOR ALL valid `AuraClientConfig` values `c`, calling `createAuraClient(c)` SHALL return an `AuraClient` instance whose `status` property equals `"idle"` before `init()` is called (pre-init invariant).


### Requirement 2: Session Initialization

**User Story:** As a frontend engineer, I want to call `aura.init()` to initialize the AURA session and subscribe to prescriptions, so that the SDK establishes a server-side session and begins receiving adaptive recommendations.

#### Acceptance Criteria

1. WHEN `init()` is called on an `AuraClient` in `"idle"` status, THE `SDK` SHALL initialize `contextSequenceId` to `config.context.sequenceId` when present or `0` otherwise, and POST a `SessionRequest` (conforming to `SessionRequestSchema` from `@aura/protocol`) to `{endpoint}/aura/session` containing `sessionId` (SDK-generated), `userId`, `manifest`, `consentProfile`, `context`, and `contextSequenceId`.
2. WHEN the server responds to `POST /aura/session` with a `200` status and a valid `SessionResponse`, THE `SDK` SHALL store the `sessionId` from the response and transition to `"active"` status.
3. WHEN `init()` completes successfully, THE `SDK` SHALL open the SSE connection to `{endpoint}/aura/prescriptions/stream` with the `sessionId` as a query parameter or request header.
4. WHEN `init()` completes successfully, THE `SDK` SHALL flush any events previously queued in the `EventQueue` by POSTing them to `{endpoint}/aura/events`.
5. WHEN the server responds to `POST /aura/session` with a `4xx` status, THE `SDK` SHALL transition to `"degraded"` status, resolve `init()` without throwing, and log a structured error entry including the HTTP status code.
6. WHEN the server is unreachable or the request times out during `init()`, THE `SDK` SHALL transition to `"degraded"` status and resolve `init()` without throwing.
7. WHEN `init()` is called on a client that is already `"active"`, THE `SDK` SHALL resolve immediately without making additional network requests (idempotent init).
8. WHEN `init()` is called on a client that is `"degraded"`, THE `SDK` SHALL resolve immediately without making additional network requests.
9. THE `init()` method SHALL return a `Promise<void>` that resolves after the session request completes or the client enters `"degraded"` status, such that the host application can `await init()` without the promise rejecting under any server-side failure condition.
10. THE `SDK` SHALL expose a read-only `status` property on `AuraClient` with values `"idle"`, `"active"`, or `"degraded"`, reflecting the current session lifecycle state.
11. WHEN `init()` is called, THE `SDK` SHALL pin the session `ManifestVersion` to `config.manifest.version` when present, or `"unversioned"` when absent; this value SHALL NOT change for the lifetime of the `AuraClient` instance.

---

### Requirement 3: Event Emission

**User Story:** As a frontend engineer, I want to call `aura.emit(event)` to send interaction and behavioral events to the AURA server, so that the rules engine receives the signals needed to evaluate adaptation rules.

#### Acceptance Criteria

1. WHEN `emit(event)` is called and the SDK status is `"active"`, THE `SDK` SHALL POST an `EventsRequest` (conforming to `EventsRequestSchema` from `@aura/protocol`) to `{endpoint}/aura/events` containing the `sessionId`, the current `contextSequenceId`, and the provided `event` in the `events` array.
2. WHEN `emit(event)` is called and the SDK status is `"idle"` or `"degraded"`, THE `SDK` SHALL enqueue the event in the `EventQueue` and resolve without making a network call.
3. WHEN `emit(event)` is called with an `event` that fails `AuraEventSchema` validation from `@aura/protocol`, THE `SDK` SHALL reject with an `AuraValidationError` without enqueuing or posting the event.
4. WHEN the network request for `emit(event)` fails with a transient error (connection reset, timeout, `5xx` response), THE `SDK` SHALL re-enqueue the event in the `EventQueue` for retry and resolve without throwing.
5. WHEN a queued event has been in the `EventQueue` for longer than a configurable `queueTTL` (default: 60 seconds), THE `SDK` SHALL drop the event from the queue without posting it and SHALL NOT re-add it.
6. THE `EventQueue` SHALL hold events in FIFO order and SHALL NOT persist events beyond the browser session (in-memory only, no localStorage or IndexedDB).
7. THE `EventQueue` SHALL enforce a configurable maximum capacity (default: 100 events); WHEN the queue is full and a new event arrives, THE `SDK` SHALL drop the oldest event to make room (FIFO eviction).
8. WHEN the SDK transitions from `"degraded"` or `"idle"` to `"active"` after `init()` completes, THE `SDK` SHALL flush the `EventQueue` by posting all queued events in FIFO order.
9. THE `emit(event)` method SHALL return `Promise<void>` that resolves once the event is either posted or enqueued, and SHALL NOT reject under network failure conditions.
10. FOR ALL valid `AuraEvent` values `e` posted in a single `emit(e)` call, the `events` array in the outgoing `EventsRequest` SHALL contain exactly one entry equal to `e` (single-event emission invariant).

---

### Requirement 4: Context Updates

**User Story:** As a frontend engineer, I want to call `aura.updateContext(contextPatch)` to push incremental context changes to the server, so that adaptation rules can react to changes in device, viewport, locale, or domain state without reinitializing the session.

#### Acceptance Criteria

1. WHEN `updateContext(contextPatch)` is called with a valid patch, THE `SDK` SHALL increment its in-memory `contextSequenceId` before sending the patch, so that subsequent prescriptions computed against earlier context can be rejected as stale.
2. WHEN `updateContext(contextPatch)` is called with a valid patch and the SDK status is `"active"`, THE `SDK` SHALL POST a `ContextRequest` (conforming to `ContextRequestSchema` from `@aura/protocol`) to `{endpoint}/aura/context` containing the `sessionId`, the incremented `contextSequenceId`, and the provided `contextPatch`.
3. WHEN `updateContext(contextPatch)` is called and the SDK status is `"degraded"` or `"idle"`, THE `SDK` SHALL update the in-memory context and `contextSequenceId`, resolve without making a network call, and SHALL NOT throw.
4. WHEN `updateContext(contextPatch)` is called with a patch that fails partial `ContextModelSchema` validation from `@aura/protocol`, THE `SDK` SHALL reject with an `AuraValidationError`.
5. THE `contextPatch` parameter SHALL be typed as `Partial<ContextModel>` from `@aura/protocol`, allowing the caller to update one or more fields without replacing the full context.
6. WHEN the network request for `updateContext` fails with a transient error, THE `SDK` SHALL log a structured warning and resolve without throwing; context updates SHALL NOT be queued for retry (context is always superseded by the next update).
7. THE `SDK` SHALL expose a read-only `getContextSequenceId(): number` method for adapters and devtools integration.
8. THE `updateContext(contextPatch)` method SHALL return `Promise<void>`.

---

### Requirement 5: SSE Prescription Stream

**User Story:** As a frontend engineer or framework adapter, I want the SDK to manage a subscription to the AURA prescription stream, so that prescriptions are delivered in real time without polling and without blocking the host application.

#### Acceptance Criteria

1. WHEN the SDK transitions to `"active"` status, THE `SDK` SHALL open an SSE connection to `{endpoint}/aura/prescriptions/stream` using `EventSource` or an equivalent fetch-based streaming reader.
2. WHEN an SSE message arrives containing a valid `UIPrescription` (as defined by `UIPrescriptionSchema` from `@aura/protocol`) whose `contextLock.sequenceId` equals the SDK's current `contextSequenceId` and whose `manifestVersion` equals the pinned session `ManifestVersion`, THE `SDK` SHALL store the prescription in the `PrescriptionStore` keyed by `surfaceId` and notify all registered `PrescriptionListener` callbacks for that surface.
3. WHEN an SSE message arrives containing a payload that fails `UIPrescriptionSchema` validation, THE `SDK` SHALL discard the message, log a structured validation warning, and keep the existing prescription for that surface unchanged.
4. WHEN a `UIPrescription` arrives whose `constraints.expiresAt` is in the past (relative to the client clock), THE `SDK` SHALL discard it without storing or notifying listeners.
5. WHEN a `UIPrescription` arrives whose `contextLock.sequenceId` is lower than or higher than the SDK's current `contextSequenceId`, THE `SDK` SHALL discard it as stale, log a structured warning with code `STALE_CONTEXT_LOCK`, and keep the existing prescription for that surface unchanged.
6. THE `SDK` SHALL periodically check the `PrescriptionStore` and evict any prescription whose `constraints.expiresAt` has passed or whose `contextLock.sequenceId` no longer equals the current `contextSequenceId`; the check interval SHALL be no longer than 5 seconds.
7. WHEN the SSE connection drops, THE `SDK` SHALL attempt to reconnect using exponential backoff starting at 1 second, doubling up to a maximum of 30 seconds, without throwing or transitioning to `"degraded"` status.
8. WHEN the SSE connection is being re-established, THE `SDK` SHALL continue queuing outbound events in the `EventQueue` so no events are lost during reconnection.
9. WHEN `disconnect()` is called, THE `SDK` SHALL close the SSE connection and stop all reconnection attempts.
10. THE `SDK` SHALL expose a `subscribe(surfaceId: string, listener: PrescriptionListener): () => void` method that registers a callback for prescriptions on a named surface and returns an unsubscribe function.
11. WHEN an unsubscribe function returned by `subscribe()` is called, THE `SDK` SHALL remove the listener and cease delivering prescription notifications to it.
12. FOR ALL `UIPrescription` values `p` delivered to the `PrescriptionStore`, `p.constraints.expiresAt` SHALL be a valid `ISO_Timestamp` in the future at the time of storage, `p.contextLock.sequenceId` SHALL equal the current SDK `contextSequenceId`, and `p.manifestVersion` SHALL equal the pinned session `ManifestVersion` (admission invariant).
13. WHEN a new prescription for a `surfaceId` arrives while a non-expired, context-current prescription for the same `surfaceId` already exists in the `PrescriptionStore`, THE `SDK` SHALL replace the existing prescription with the new one (latest-wins per surface invariant).
14. WHEN a `UIPrescription` arrives whose `manifestVersion` differs from the pinned session `ManifestVersion`, THE `SDK` SHALL discard it, log a structured warning with code `MANIFEST_VERSION_MISMATCH`, and keep the existing prescription for that surface unchanged.
15. WHEN the SDK discards a prescription because of `MANIFEST_VERSION_MISMATCH` and the SDK status is `"active"`, THE `SDK` SHOULD POST a `FeedbackRequest` with `action: "reject"` and `reason: "manifest-mismatch"`; if this feedback POST fails, THE `SDK` SHALL log a warning and SHALL NOT retry it.

---

### Requirement 6: Feedback

**User Story:** As a frontend engineer, I want to call `aura.feedback(feedbackEvent)` to report user responses to prescriptions, so that the AURA server can record accept, dismiss, override, undo, and reject signals for observability and future rule improvement.

#### Acceptance Criteria

1. WHEN `feedback(feedbackEvent)` is called and the SDK status is `"active"`, THE `SDK` SHALL POST a `FeedbackRequest` (conforming to `FeedbackRequestSchema` from `@aura/protocol`) to `{endpoint}/aura/feedback` containing the `sessionId` and the provided `feedbackEvent`.
2. WHEN `feedback(feedbackEvent)` is called with a `feedbackEvent` that fails `FeedbackEventSchema` validation from `@aura/protocol`, THE `SDK` SHALL reject with an `AuraValidationError` without posting.
3. WHEN `feedback(feedbackEvent)` is called and the SDK status is `"degraded"` or `"idle"`, THE `SDK` SHALL resolve without making a network call and SHALL NOT throw.
4. WHEN the network request for `feedback` fails with a transient error, THE `SDK` SHALL log a structured warning and resolve without throwing; feedback events SHALL NOT be re-queued (feedback loss under network failure is acceptable in v0).
5. THE `feedback(feedbackEvent)` method SHALL return `Promise<void>`.
6. WHEN `feedback(feedbackEvent)` is called with `feedbackEvent.action` equal to `"undo"` or `"reject"`, THE `SDK` SHALL additionally remove the prescription identified by `feedbackEvent.prescriptionId` from the `PrescriptionStore` and notify listeners with `undefined` for that surface.
7. WHEN the SDK discards a prescription because its `contextLock` is stale and the SDK status is `"active"`, THE `SDK` SHOULD POST a `FeedbackRequest` with `action: "reject"`, `reason: "stale-context"`, and the current `contextSequenceId`; if this feedback POST fails, THE `SDK` SHALL log a warning and SHALL NOT retry it.

---

### Requirement 7: Consent Management

**User Story:** As a frontend engineer or privacy layer, I want to call `aura.updateConsent(consentPatch)` to apply incremental consent changes at runtime, so that data-class permissions granted or revoked by the user take effect immediately without reinitializing the session.

#### Acceptance Criteria

1. WHEN `updateConsent(consentPatch)` is called and the SDK status is `"active"`, THE `SDK` SHALL POST a `ConsentRequest` (conforming to `ConsentRequestSchema` from `@aura/protocol`) to `{endpoint}/aura/consent` containing the `sessionId` and the provided `consentPatch`.
2. WHEN `updateConsent(consentPatch)` is called with a `consentPatch` that fails `ConsentProfileSchema` validation from `@aura/protocol`, THE `SDK` SHALL reject with an `AuraValidationError`.
3. WHEN `updateConsent(consentPatch)` is called and the SDK status is `"degraded"` or `"idle"`, THE `SDK` SHALL resolve without making a network call and SHALL NOT throw.
4. WHEN `updateConsent(consentPatch)` sets any `DataClass` key to `false`, THE `SDK` SHALL remove from the `PrescriptionStore` all prescriptions whose `explanation.dataClasses` list contains that `DataClass`, and SHALL notify affected listeners with `undefined`.
5. THE `SDK` SHALL maintain an in-memory `ConsentProfile` that is updated with each successful `updateConsent` call, so that the current consent state is available synchronously via a `getConsent(): ConsentProfile` method.
6. WHEN the network request for `updateConsent` fails with a transient error, THE `SDK` SHALL log a structured warning and resolve without throwing; the in-memory consent state SHALL still be updated even if the server request fails, to prevent the client from continuing to act on revoked consent.
7. THE `updateConsent(consentPatch)` method SHALL return `Promise<void>`.


### Requirement 8: Explanations

**User Story:** As a frontend engineer or devtools consumer, I want to call `aura.explain(prescriptionId)` to retrieve the explanation record for a prescription, so that users and developers can understand why an adaptation was recommended.

#### Acceptance Criteria

1. WHEN `explain(prescriptionId)` is called and the SDK status is `"active"`, THE `SDK` SHALL send a `GET` request to `{endpoint}/aura/explain/{prescriptionId}` with the `sessionId` as a query parameter or request header.
2. WHEN the server returns a `200` response containing a valid `ExplanationRecord` (as defined by `ExplanationRecordSchema` from `@aura/protocol`), THE `SDK` SHALL return the parsed `ExplanationRecord` to the caller.
3. WHEN the server returns a `404` response, THE `SDK` SHALL resolve with `null` to indicate no explanation exists for the given `prescriptionId`.
4. WHEN `explain(prescriptionId)` is called with an empty or missing `prescriptionId`, THE `SDK` SHALL reject synchronously with an `AuraValidationError`.
5. WHEN `explain(prescriptionId)` is called and the SDK status is `"degraded"` or `"idle"`, THE `SDK` SHALL resolve with `null` without making a network call.
6. THE `explain(prescriptionId)` method SHALL return `Promise<ExplanationRecord | null>`.

---

### Requirement 9: Profile Access and Correction

**User Story:** As a frontend engineer or devtools consumer, I want to call `aura.getProfile()` to retrieve the current adaptive profile summary and `aura.correctProfile(correction)` to remove or correct inferred attributes, so that users have visibility into and control over their adaptive profile.

#### Acceptance Criteria

1. WHEN `getProfile()` is called and the SDK status is `"active"`, THE `SDK` SHALL send a `GET` request to `{endpoint}/aura/profile` with the `sessionId` as a query parameter or request header and return the response as a `ProfileSummary` containing an array of `ProfileAttribute` objects (as defined in `@aura/protocol`).
2. WHEN `getProfile()` is called and the SDK status is `"degraded"` or `"idle"`, THE `SDK` SHALL resolve with `{ attributes: [] }` without making a network call.
3. WHEN `correctProfile(correction)` is called and the SDK status is `"active"`, THE `SDK` SHALL POST a `ProfileCorrectionRequest` (conforming to `ProfileCorrectionRequestSchema` from `@aura/protocol`) to `{endpoint}/aura/profile/correction` containing the `sessionId` and the provided `correction`.
4. WHEN `correctProfile(correction)` is called with a `correction` that fails profile correction schema validation from `@aura/protocol`, THE `SDK` SHALL reject with an `AuraValidationError`.
5. WHEN `correctProfile(correction)` is called and the SDK status is `"degraded"` or `"idle"`, THE `SDK` SHALL resolve without making a network call and SHALL NOT throw.
6. WHEN the network request for `correctProfile` fails with a transient error, THE `SDK` SHALL log a structured warning and resolve without throwing.
7. THE `getProfile()` method SHALL return `Promise<ProfileSummary>` and the `correctProfile(correction)` method SHALL return `Promise<void>`.

---

### Requirement 10: Disconnect and Cleanup

**User Story:** As a frontend engineer or framework adapter, I want to call `aura.disconnect()` to shut down the AURA session cleanly, so that SSE connections, timers, and listeners are released when the host component unmounts or the application navigates away.

#### Acceptance Criteria

1. WHEN `disconnect()` is called on an `AuraClient` in `"active"` status, THE `SDK` SHALL close the SSE connection, cancel all pending reconnection timers, clear all registered `PrescriptionListener` callbacks, clear the `PrescriptionStore`, and transition the client to `"degraded"` status.
2. WHEN `disconnect()` is called on an `AuraClient` in `"idle"` or `"degraded"` status, THE `SDK` SHALL complete without error (idempotent disconnect).
3. WHEN `disconnect()` is called, THE `SDK` SHALL NOT make any further network requests for event emission, context updates, feedback, consent, or profile operations initiated after `disconnect()`.
4. WHEN `disconnect()` is called while an `emit(event)` network request is in flight, THE `SDK` SHALL allow the in-flight request to complete or fail without aborting it, but SHALL NOT enqueue further events.
5. THE `disconnect()` method SHALL return `void` (synchronous) and SHALL NOT throw under any condition.
6. AFTER `disconnect()` is called, all `subscribe()` listeners SHALL stop receiving prescription notifications; any listeners unsubscribed before `disconnect()` SHALL also remain inactive.

---

### Requirement 11: Graceful Degradation

**User Story:** As a product engineer, I want the AURA SDK to degrade gracefully when the server is unavailable, so that the host application continues to function and render its defaults without any runtime errors or blocked rendering.

#### Acceptance Criteria

1. WHEN the SDK is in `"degraded"` status, THE `SDK` SHALL ensure that `emit()`, `updateContext()`, `feedback()`, `updateConsent()`, `correctProfile()`, and `disconnect()` all return resolved `Promise<void>` values without throwing.
2. WHEN the SDK is in `"degraded"` status, THE `SDK` SHALL ensure that `explain()` resolves with `null` and `getProfile()` resolves with `{ attributes: [] }`.
3. WHEN the SDK is in `"degraded"` status, THE `SDK` SHALL NOT open or maintain an SSE connection.
4. WHEN the SDK is in `"degraded"` status and `subscribe(surfaceId, listener)` is called, THE `SDK` SHALL register the listener but SHALL NOT invoke it until and unless the client re-initializes and receives prescriptions.
5. THE `SDK` SHALL NOT throw unhandled promise rejections under any combination of network failures, server errors, invalid server responses, or `disconnect()` calls; all error conditions MUST be handled internally and communicated through a structured error event or log.
6. THE `SDK` SHALL expose an `onError(handler: (error: AuraClientError) => void): () => void` method that allows the host application to register an error handler; WHEN an internal error occurs, THE `SDK` SHALL invoke the registered handler before logging and SHALL continue operating in `"degraded"` mode.
7. WHEN no `onError` handler is registered and an internal error occurs, THE `SDK` SHALL write a structured warning to `console.warn` without throwing.
8. FOR ALL SDK states (`"idle"`, `"active"`, `"degraded"`), calling any public method on `AuraClient` SHALL NOT cause a synchronous exception (all errors communicated via rejected promises or error handlers, never via thrown synchronous errors from public methods).

---

### Requirement 12: Non-Blocking Host Rendering

**User Story:** As a frontend engineer, I want the SDK to perform all network operations asynchronously, so that AURA initialization, event emission, and prescription delivery never block the browser's main thread or delay first render.

#### Acceptance Criteria

1. THE `SDK` SHALL perform all HTTP requests and SSE subscription setup asynchronously using the browser `fetch` API or `EventSource`; THE `SDK` SHALL NOT use synchronous XHR.
2. THE `createAuraClient(config)` factory function SHALL complete synchronously and return an `AuraClient` instance without initiating any network I/O.
3. THE `init()` method SHALL return a `Promise<void>` that resolves asynchronously; the host application SHALL NOT be required to `await init()` before rendering.
4. WHEN `emit(event)` is called synchronously in a render cycle or event handler, THE `SDK` SHALL enqueue the event and return a resolved `Promise<void>` without blocking the call stack.
5. THE `SDK` SHALL NOT hold any `setTimeout` or `setInterval` timers that fire at intervals shorter than 100 milliseconds, so that background SDK activity does not meaningfully contend with rendering.
6. WHEN the SSE connection is established, THE `SDK` SHALL process incoming messages in the browser's event loop without blocking between messages.

---

### Requirement 13: In-Memory Event Queue Correctness

**User Story:** As a developer building an integration test or reasoning about SDK correctness, I want the event queue to behave as a bounded FIFO buffer, so that event ordering and capacity limits are predictable.

#### Acceptance Criteria

1. THE `EventQueue` SHALL deliver events to the server in the same order they were enqueued (FIFO order invariant).
2. WHEN `n` events are enqueued and then flushed, THE server SHALL receive exactly `n` events in the original enqueue order, provided none exceeded the `queueTTL`.
3. WHEN the queue is at maximum capacity `k` and event `k+1` is enqueued, THE `SDK` SHALL drop event `1` (the oldest) and retain events `2` through `k+1`, preserving FIFO order among the retained events.
4. WHEN a queued event's age exceeds `queueTTL`, THE `SDK` SHALL remove it from the queue without posting; subsequent flush SHALL NOT include that event.
5. WHEN `emit(event)` is called while the queue is being flushed, THE `SDK` SHALL add the new event to the queue without dropping in-flight events or causing a race condition.
6. FOR ALL sequences of `n` valid `AuraEvent` values enqueued when the SDK is `"idle"`, the flush triggered by transitioning to `"active"` SHALL post events in the original enqueue order (round-trip ordering property).

---

### Requirement 14: Prescription Store Correctness

**User Story:** As a framework adapter author, I want the prescription store to behave predictably with respect to expiry, surface keying, and replacement, so that the adapter always presents either a valid non-expired prescription or nothing.

#### Acceptance Criteria

1. THE `PrescriptionStore` SHALL maintain at most one prescription per `surfaceId` at any given time (per-surface uniqueness invariant).
2. WHEN `getPrescription(surfaceId): UIPrescription | undefined` is called, THE `SDK` SHALL return `undefined` if no prescription exists or if the stored prescription has expired.
3. WHEN a prescription is retrieved via `getPrescription(surfaceId)` and the current time is before `prescription.constraints.expiresAt` and `prescription.contextLock.sequenceId` equals the current `contextSequenceId`, THE returned prescription SHALL be the most recently received prescription for that surface (freshness invariant).
4. WHEN a prescription is retrieved via `getPrescription(surfaceId)` and the current time is at or after `prescription.constraints.expiresAt`, THE `SDK` SHALL return `undefined` and remove the prescription from the store.
5. WHEN a prescription is retrieved via `getPrescription(surfaceId)` and `prescription.contextLock.sequenceId` does not equal the current `contextSequenceId`, THE `SDK` SHALL return `undefined`, remove the prescription from the store, and log a `STALE_CONTEXT_LOCK` warning.
6. FOR ALL `surfaceId` values `s` and all times `t` after `prescription.constraints.expiresAt`, `getPrescription(s)` SHALL return `undefined` (expiry safety property).
7. FOR ALL `surfaceId` values `s`, the sequence of prescriptions delivered to `subscribe(s, listener)` SHALL correspond to the sequence in which they were received from the SSE stream for surface `s`, with expired and context-stale prescriptions removed (ordering, expiry, and context-lock correctness property).


### Requirement 15: Protocol Compliance

**User Story:** As a developer maintaining the AURA system, I want all SDK requests and responses to be validated against `@aura/protocol` schemas, so that malformed payloads never enter or leave the SDK boundary.

#### Acceptance Criteria

1. WHEN the SDK constructs any outbound request body, THE `SDK` SHALL validate it through the corresponding request schema from `@aura/protocol` before sending; IF validation fails, THE `SDK` SHALL reject the operation with an `AuraValidationError` rather than sending a malformed request.
2. WHEN the SDK receives any response body from the server, THE `SDK` SHALL parse it through the corresponding response schema from `@aura/protocol`; IF the response fails validation, THE `SDK` SHALL log a structured warning and treat the response as if the server returned an error.
3. WHEN the SDK receives a `UIPrescription` over the SSE stream, THE `SDK` SHALL parse it through `UIPrescriptionSchema`; IF parsing fails, THE `SDK` SHALL discard the message without updating the `PrescriptionStore` or notifying listeners.
4. THE `SDK` SHALL import all schemas exclusively from `@aura/protocol` and SHALL NOT define its own duplicate schemas for AUIP types.
5. FOR ALL outbound `EventsRequest` values constructed by the SDK, every `AuraEvent` in the `events` array SHALL be a structurally valid `AuraEvent` as defined by `AuraEventSchema` (output protocol compliance property).
6. FOR ALL `UIPrescription` values admitted to the `PrescriptionStore`, every prescription SHALL pass `UIPrescriptionSchema.safeParse()` without error (store validity invariant).

---

### Requirement 16: SSE Reconnection and Expiry Handling

**User Story:** As a developer integrating the SDK into a production host application, I want the SSE connection to recover automatically from network interruptions and not replay expired prescriptions, so that users receive fresh adaptations without stale state after a reconnect.

#### Acceptance Criteria

1. WHEN the SSE connection closes unexpectedly (network drop, server restart, CORS issue), THE `SDK` SHALL schedule a reconnection attempt after an initial delay of 1 second.
2. WHEN a reconnection attempt fails, THE `SDK` SHALL double the retry interval up to a maximum of 30 seconds and retry indefinitely until the connection succeeds or `disconnect()` is called.
3. WHEN the SSE connection is re-established after a drop, THE `SDK` SHALL NOT replay prescriptions received before the drop that have since expired.
4. WHEN the SSE connection is re-established and a new prescription for a surface arrives, THE `SDK` SHALL replace any previously stored prescription for that surface regardless of whether the replacement has a later `createdAt` (latest-from-server wins).
5. WHEN the SSE connection cannot be established during `init()` due to a network error, THE `SDK` SHALL remain in `"active"` status (session POST succeeded) and continue attempting SSE reconnection; the failed SSE connection SHALL NOT downgrade the session to `"degraded"`.
6. WHEN more than a configurable `maxReconnectAttempts` (default: unlimited in v0) reconnection attempts have failed, THE `SDK` SHALL emit an `AuraClientError` to registered `onError` handlers but SHALL continue attempting reconnection.

---

### Requirement 17: Error Types and Structured Logging

**User Story:** As a developer debugging an AURA integration, I want the SDK to emit structured error objects with distinguishable types and machine-readable fields, so that error handlers and devtools can classify and display SDK problems without parsing error message strings.

#### Acceptance Criteria

1. THE `SDK` SHALL export the following error types as classes extending `Error`: `AuraConfigError` (thrown by `createAuraClient` on invalid config), `AuraValidationError` (rejected by methods receiving invalid payloads), and `AuraClientError` (emitted through `onError` handlers for runtime errors).
2. WHEN an `AuraClientError` is emitted, it SHALL include at minimum: `code` (a non-empty string error code), `message` (a human-readable description), and `context` (a plain object with relevant diagnostic fields such as `sessionId`, `statusCode`, `endpoint`, or `surfaceId`).
3. THE `SDK` SHALL expose a structured internal log of recent error and warning events accessible via `getLogs(): AuraLogEntry[]` for use by `@aura/devtools`; THE log SHALL hold at most 200 entries in a circular buffer.
4. WHEN `getLogs()` is called, the returned array SHALL be in chronological order, oldest-first.
5. WHEN an error is logged, THE log entry SHALL include: `level` (`"error"` or `"warn"`), `timestamp` (`ISO_Timestamp`), `code`, `message`, and optional `context` object.
6. THE `SDK` SHALL NOT call `console.error` for errors that are already delivered to a registered `onError` handler; errors SHALL be written to `console.warn` at most once per occurrence if no handler is registered.

---

### Requirement 18: Round-Trip and Serialization Correctness

**User Story:** As a developer building tests or devtools for the AURA SDK, I want the guarantee that SDK request and response payloads survive JSON serialization and deserialization without data loss, so that log replay and test fixtures are accurate.

#### Acceptance Criteria

1. FOR ALL valid `AuraEvent` values `e` emitted through `emit(e)`, serializing `e` via `JSON.stringify(e)` and parsing back through `AuraEventSchema` from `@aura/protocol` SHALL produce a value with all fields deeply equal to `e` (event round-trip property).
2. FOR ALL valid `UIPrescription` values `p` received and stored by the SDK, serializing `p` via `JSON.stringify(p)` and parsing back through `UIPrescriptionSchema` from `@aura/protocol` SHALL produce a value with all fields deeply equal to `p` (prescription round-trip property).
3. FOR ALL valid `FeedbackEvent` values `f` submitted through `feedback(f)`, serializing `f` via `JSON.stringify(f)` and parsing back through `FeedbackEventSchema` from `@aura/protocol` SHALL produce a value with all fields deeply equal to `f` (feedback round-trip property).
4. FOR ALL valid `ConsentProfile` values `cp` provided to `updateConsent(cp)`, serializing `cp` via `JSON.stringify(cp)` and parsing back through `ConsentProfileSchema` from `@aura/protocol` SHALL produce a value with all fields deeply equal to `cp` (consent round-trip property).
5. FOR ALL valid `ExplanationRecord` values `r` returned by `explain()`, serializing `r` via `JSON.stringify(r)` and parsing back through `ExplanationRecordSchema` from `@aura/protocol` SHALL produce a value with all fields deeply equal to `r` (explanation round-trip property).

