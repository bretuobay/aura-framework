# Requirements Document

## Introduction

`@aura/devtools` provides inspectability for adaptive behavior in the AURA TypeScript framework. It belongs to the implementation/prototype work described as future work in the reference architecture.

The package exposes a devtools inspector for the architecture's observable runtime concerns: session, manifest, events, prescriptions, consent, profile attributes, rule or decision traces, feedback, latency, policy, model routing, and audit metadata. It may include simulation tools for consent changes, profile scenarios, event replay, and prescription inspection. It is a tool for developers and UX researchers, not end users, and is therefore explicitly not required to be a polished standalone product in v0.

The devtools may be implemented as a local web route served by the reference Hono server, as an embeddable panel that the host application can mount alongside its own UI, or as a lightweight React component. All three container models are acceptable in v0 provided the core inspection capabilities are present and functionally correct.

Data sourcing must be honest: every persisted-state view must derive its data from the AUIP server's stored state (queried over the same nine AUIP endpoints used by the SDK) or from a dedicated devtools endpoint that the server exposes. Simulation tools that mutate real session state must send real AUIP-protocol requests so that the full rule evaluation, consent gating, manifest checking, and risk-class enforcement pipeline executes. Local-only scenarios must be clearly labeled as simulated and must not be presented as persisted profile or prescription state.

`@aura/devtools` depends on `@aura/protocol` for types and schemas. When implemented as a React component or panel, it additionally depends on React. It must not be imported by `@aura/sdk`, `@aura/react`, `@aura/server`, or `@aura/rules` — the dependency is strictly one-way from devtools toward the rest of the framework.

---

## Glossary

- **Devtools_Package**: The `@aura/devtools` npm package providing the AURA devtools inspector and optional simulation tools.
- **DevtoolsPanel**: The top-level UI container exported by `Devtools_Package`. It may be a React component, an embeddable panel, or a route mounted on the reference Hono server, as determined by the v0 implementation choice.
- **DevtoolsClient**: The data-access layer inside `Devtools_Package` that fetches state from AUIP server endpoints and the devtools-specific endpoint, and exposes it to the views.
- **DevtoolsEndpoint**: A dedicated HTTP endpoint mounted by `@aura/server` (e.g. `GET /aura/devtools/state`) that returns a combined snapshot of session, manifest, event log, prescription log, rule or decision traces, consent state, profile attributes, feedback history, and audit metadata for a given `sessionId`. Used exclusively by `DevtoolsClient`.
- **SessionSummaryView**: The devtools view that displays session metadata: `sessionId`, `userId`, session status, manifest version or identifier, current context sequence ID, session creation timestamp, and current SDK status if available.
- **ManifestSummaryView**: The devtools view that displays the `CapabilityManifest` registered at session initialization — surfaces, slots, components, variants, risk classes, consent requirements, and layout-stability constraints.
- **EventLogView**: The devtools view that displays all `AuraEvent` objects received by the server for the current session, in emission order, with `type`, `surfaceId`, `timestamp`, and payload.
- **PrescriptionLogView**: The devtools view that displays all prescriptions produced during the session, including their final disposition: `accepted` (emitted to the SSE stream), `rejected` (failed manifest check, consent gate, or risk-class enforcement), or `dropped` (expired before delivery or superseded).
- **OperationalAuditView**: The devtools view that displays latency class, observed evaluation time, decision source, model tier, manifest-version checks, policy version, data classes used, rejection reasons, and sanitized security audit records.
- **ConsentStateView**: The devtools view that displays the current `ConsentProfile` for the session, showing each `DataClass` key and its current boolean value.
- **ProfileAttributesView**: The devtools view that displays all `ProfileAttribute` objects in the current user model for the session, including `key`, `value`, source/provenance, `confidence`, `dataClass`, and optional `expiresAt`.
- **RuleMatchesView**: The devtools view that displays rule evaluation results per prescription — which rules were evaluated, which matched, which failed, and which produced the prescription's adaptations.
- **FeedbackHistoryView**: The devtools view that displays all `FeedbackEvent` objects recorded for the session, in timestamp order, with `prescriptionId`, `action`, `timestamp`, and optional `reason`.
- **ConsentEditor**: The simulation tool that allows the developer to toggle `DataClass` consent values locally for the current devtools session and observe the effect on prescription delivery.
- **ProfileSimulator**: The simulation tool that allows the developer to test temporary `ProfileAttribute` scenarios without presenting them as persisted user profile state.
- **EventReplayer**: The simulation tool that allows the developer to select or enter a fixture event supplied by the host/devtools configuration and replay it against the current session state, observing the resulting event log entry, rule match results, and any emitted prescriptions.
- **PrescriptionInspector**: The simulation tool that allows the developer to select any prescription from `PrescriptionLogView` and view a detailed explanation of why it was accepted, rejected, or dropped — including rule match results, consent gate results, manifest check results, and risk-class enforcement results.
- **ContextLock**: The `UIPrescription.contextLock` object that devtools displays to explain whether a prescription was current, stale, or dropped due to a context race.
- **LayoutStability**: Surface-level manifest metadata displayed by devtools so developers can inspect reserved-space, skeleton, host-default, and max-wait constraints.
- **DecisionSource**: A prescription audit value such as `rules`, `recommender`, `slm`, or `llm` used to explain model routing and operational cost.
- **SecurityAuditRecord**: A sanitized devtools-visible record of prompt-injection indicators, suspicious replay, profile-poisoning attempts, policy violations, or model-output validation failures.
- **DevtoolsState**: The combined snapshot object returned by `DevtoolsEndpoint`, containing all data required to populate the devtools inspector for one session.
- **AuraEvent**: A typed interaction, behavioral, task, or domain event emitted by the host application into AUIP (defined in `@aura/protocol`).
- **UIPrescription**: A bounded adaptation recommendation produced by the server rules pipeline (defined in `@aura/protocol`).
- **CapabilityManifest**: The host-authored declaration of surfaces, components, variants, props, risk classes, and consent requirements (defined in `@aura/protocol`).
- **ConsentProfile**: A map of `DataClass` keys to boolean consent values (defined in `@aura/protocol`).
- **ProfileAttribute**: A single adaptive attribute in the AURA user model (defined in `@aura/protocol`).
- **FeedbackEvent**: A signal from the host recording how a user or the host responded to a prescription (defined in `@aura/protocol`).
- **ExplanationRecord**: Audience-specific rationale attached to a `UIPrescription` (defined in `@aura/protocol`).
- **DataClass**: A named category of user data governed by consent, including behavior, personalization, accessibility, approximate location, health, education, demographics, emotion, sensitive inference, model use, retention, and aggregation classes defined by `@aura/protocol`.
- **RiskClass**: An enumerated governance tier (`low`, `medium`, `high`, `critical`) from `@aura/protocol`.
- **PrescriptionDisposition**: The final outcome of a prescription in the server pipeline: `accepted`, `rejected`, or `dropped`.
- **RuleMatchRecord**: A server-side record capturing rule evaluation results for one prescription: `ruleId`, `matched` (boolean), `conditionResults` (per-condition pass/fail), and optional `failureReason` string.
- **ISO_Timestamp**: A string in ISO 8601 format (e.g. `2024-01-15T10:30:00.000Z`).
- **SessionId**: A non-empty string identifying the AUIP session being inspected.
- **SimulationScope**: The constraint that devtools simulations execute against real AUIP server state and pipeline code, not mocked substitutes.

---

## Requirements

### Requirement 1: Devtools Server Endpoint

**User Story:** As a developer using devtools, I want the server to expose a single endpoint that returns a combined snapshot of all session state needed by the inspector, so that the devtools UI can populate its views with one request.

#### Acceptance Criteria

1. THE `Devtools_Package` SHALL export a `registerDevtoolsRoute` function that mounts a `GET /aura/devtools/state` route on a Hono application instance, accepting `sessionId` as a required query parameter.
2. WHEN `GET /aura/devtools/state?sessionId={id}` is called and the session exists, THE `Devtools_Package` SHALL return an HTTP 200 response with a JSON body conforming to `DevtoolsStateSchema`, including: session metadata with current `contextSequenceId`, the registered `CapabilityManifest`, all `AuraEvent` records for the session in emission order, all prescription log entries with `PrescriptionDisposition`, `contextLock`, audit metadata, and associated `RuleMatchRecord` arrays, the current `ConsentProfile`, all `ProfileAttribute` objects for the user, all `FeedbackEvent` records in timestamp order, operational audit entries, and sanitized security audit records.
3. WHEN `GET /aura/devtools/state?sessionId={id}` is called and the session does not exist, THE `Devtools_Package` SHALL return an HTTP 404 response with a JSON body containing an `error` field identifying the missing session.
4. WHEN `GET /aura/devtools/state` is called without a `sessionId` query parameter, THE `Devtools_Package` SHALL return an HTTP 400 response with a JSON body containing a descriptive `error` field.
5. THE `Devtools_Package` SHALL export a `DevtoolsStateSchema` Zod schema and corresponding `DevtoolsState` TypeScript type so that `DevtoolsClient` can validate and type the response without importing from `@aura/server` internals.
6. THE `GET /aura/devtools/state` route SHALL NOT be registered unless `registerDevtoolsRoute` is explicitly called; AURA server deployments that omit this call SHALL expose no devtools surface.
7. WHEN `registerDevtoolsRoute` is called with the same `StorageAdapter` instances as the main `registerAuipRoutes` call, THE devtools route SHALL read from the same storage instances as the AUIP routes without duplicating or shadowing state.
8. WHEN a valid `DevtoolsState` value `ds` is serialized via `JSON.stringify(ds)` and parsed back through `DevtoolsStateSchema`, THE parsed result SHALL have all fields with values deeply equal to `ds` (round-trip serialization property).

### Requirement 2: Session Summary View

**User Story:** As a developer inspecting AURA behavior, I want to see a session summary that shows me who the session belongs to, what manifest was registered, when it started, and whether the server considers it active, so that I can orient myself before examining events and prescriptions.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `SessionSummaryView` SHALL display the `sessionId`, `userId`, session status (`active` or `rejected`), the manifest version identifier if present, the current `contextSequenceId`, and the session creation `ISO_Timestamp`.
2. WHEN the session status is `active`, THE `SessionSummaryView` SHALL display a visual indicator that distinguishes it from a `rejected` session.
3. WHEN the `CapabilityManifest` registered at session init contains an optional `version` field, THE `SessionSummaryView` SHALL display that version string; WHEN no `version` field is present, THE `SessionSummaryView` SHALL display a placeholder such as `"unversioned"`.
4. IF the `DevtoolsEndpoint` returns an HTTP 404 for the provided `sessionId`, THEN THE `SessionSummaryView` SHALL display an error state indicating the session was not found, without throwing or crashing the devtools panel.
5. THE `SessionSummaryView` SHALL NOT expose internal server identifiers, storage keys, or implementation details beyond the fields listed in acceptance criteria 1–3.
6. FOR ALL `DevtoolsState` values returned by the endpoint, the session metadata fields displayed by `SessionSummaryView` SHALL be structurally equal to the corresponding fields in `DevtoolsState.session` (display accuracy invariant).

---

### Requirement 3: Manifest Summary View

**User Story:** As a developer inspecting AURA behavior, I want to see the full capability manifest registered for the session, so that I can verify which surfaces, components, variants, and risk classes are declared and available for adaptation.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `ManifestSummaryView` SHALL display all surfaces declared in the `CapabilityManifest`, each showing the surface `id`, any declared slots, and any `layoutStability` strategy or max decision wait.
2. FOR EACH surface displayed in `ManifestSummaryView`, THE view SHALL list all `ManifestComponent` entries under that surface, showing the component `id`, declared `variants` array, `riskClass`, and consent requirements.
3. THE `ManifestSummaryView` SHALL display every surface and component declared in the `CapabilityManifest` without omitting any entry (completeness invariant: displayed surface count equals manifest surface count, and displayed component count equals the total component count across all surfaces).
4. WHEN a `ManifestComponent` declares adaptable props constraints, THE `ManifestSummaryView` SHALL display a human-readable summary of those constraints; THE summary need not be a full JSON schema dump in v0.
5. IF the manifest contains zero surfaces, THE `ManifestSummaryView` SHALL display an empty-state message such as `"No surfaces declared"` rather than rendering a blank panel.
6. FOR ALL `DevtoolsState` values `ds`, the surfaces and components rendered by `ManifestSummaryView` SHALL be structurally equal to the `manifest.surfaces` array in `ds` (manifest display round-trip property).

---

### Requirement 4: Event Log View

**User Story:** As a developer tracing why a prescription was emitted, I want to see all events the server received for the current session in the order they arrived, so that I can correlate events with rule matches and prescription outcomes.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `EventLogView` SHALL display all `AuraEvent` records received by the server for that session, with each entry showing `type`, `surfaceId`, `timestamp`, and a collapsible or abbreviated view of `payload`.
2. THE `EventLogView` SHALL display events in the same order they were received by the server (emission order invariant: event at index `i` in the log must have `timestamp` ≤ `timestamp` of event at index `i+1`).
3. WHEN zero events have been received for the session, THE `EventLogView` SHALL display an empty-state message such as `"No events recorded"`.
4. THE `EventLogView` SHALL display a count of total events at the top of the view.
5. FOR ALL `DevtoolsState` values `ds`, the event entries rendered by `EventLogView` SHALL be structurally equal to the `events` array in `ds`, and the displayed count SHALL equal `ds.events.length` (event log accuracy invariant).
6. THE `EventLogView` SHALL NOT modify, filter, or reorder the events array from `DevtoolsState`; all received events SHALL appear in the view regardless of their `type` or payload content.

---

### Requirement 5: Prescription Log View

**User Story:** As a developer debugging adaptation behavior, I want to see all prescriptions produced during the session — including those that were rejected or dropped — along with their final disposition, so that I understand what the rules pipeline attempted and what reached the SDK.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `PrescriptionLogView` SHALL display all prescription entries for the session, each showing the prescription `id`, `surfaceId`, `mode`, `riskClass`, `manifestVersion`, `contextLock.sequenceId`, `PrescriptionDisposition` (`accepted`, `rejected`, or `dropped`), and the `ISO_Timestamp` at which the disposition was recorded.
2. THE `PrescriptionLogView` SHALL visually distinguish entries by `PrescriptionDisposition` using labels, colors, or icons, so that `accepted`, `rejected`, and `dropped` prescriptions are immediately differentiable.
3. FOR EACH prescription entry in `PrescriptionLogView`, THE view SHALL display the list of `Adaptation` types contained in that prescription (e.g. `rank`, `componentVariant`, `filter`) without requiring the developer to open the `PrescriptionInspector` to see adaptation types.
4. WHEN zero prescriptions have been produced for the session, THE `PrescriptionLogView` SHALL display an empty-state message such as `"No prescriptions recorded"`.
5. FOR ALL `DevtoolsState` values `ds`, the prescription entries rendered by `PrescriptionLogView` SHALL be structurally equal to the `prescriptions` array in `ds`; the displayed disposition for each entry SHALL equal the `PrescriptionDisposition` stored in `ds` (prescription log accuracy invariant).
6. WHEN a prescription entry has `PrescriptionDisposition` of `rejected`, THE `PrescriptionLogView` SHALL display a brief rejection reason summary (e.g. `"manifest check failed"`, `"consent revoked"`, `"risk-class enforcement"`, `"stale context"`) derived from the associated `RuleMatchRecord` array without requiring the developer to open `PrescriptionInspector`.
7. WHEN a prescription entry was dropped because it arrived after the session context advanced, THE `PrescriptionLogView` SHALL display `"stale context"` and both the prescription `contextLock.sequenceId` and current session `contextSequenceId`.
8. WHEN a prescription entry was rejected because of manifest-version mismatch, THE `PrescriptionLogView` SHALL display `"manifest mismatch"` with the prescription `manifestVersion` and the session manifest version.

---

### Requirement 6: Consent State View

**User Story:** As a developer or UX researcher auditing data-collection boundaries, I want to see the current consent profile for the session, so that I can verify which data classes are enabled and understand which prescriptions are blocked by consent.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `ConsentStateView` SHALL display all standard `DataClass` keys exported by `@aura/protocol` and their current boolean value from the session's `ConsentProfile`.
2. THE `ConsentStateView` SHALL display each `DataClass` value as a clear on/off indicator so that a developer can read the consent state at a glance without parsing raw JSON.
3. WHEN a `DataClass` value is `false`, THE `ConsentStateView` SHALL visually highlight that class as disabled so that blocked data classes are immediately visible.
4. FOR ALL `DevtoolsState` values `ds`, the consent values rendered by `ConsentStateView` SHALL be structurally equal to the corresponding entries in `ds.consentProfile` (consent display accuracy invariant).
5. WHEN the session's `ConsentProfile` does not include an entry for one of the standard `DataClass` keys, THE `ConsentStateView` SHALL treat the missing key as `false` and display it as disabled.

---

### Requirement 7: Profile Attributes View

**User Story:** As a developer or UX researcher auditing adaptive personalization, I want to see all profile attributes stored for the user in the current session, so that I can inspect inferred and explicit attributes, their confidence, and their data class.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `ProfileAttributesView` SHALL display all `ProfileAttribute` objects for the user, each showing `key`, `value`, source/provenance (`explicit`, `inferred`, or `imported`), `confidence` (as a percentage or decimal), `dataClass`, and `expiresAt` if present.
2. THE `ProfileAttributesView` SHALL visually distinguish `inferred` attributes from `explicit` attributes using a label or icon.
3. FOR EACH `ProfileAttribute` with `confidence` less than 0.5, THE `ProfileAttributesView` SHALL display a low-confidence indicator so that developers can identify uncertain inferences.
4. WHEN zero profile attributes exist for the user in the current session, THE `ProfileAttributesView` SHALL display an empty-state message such as `"No profile attributes recorded"`.
5. FOR ALL `DevtoolsState` values `ds`, the attributes rendered by `ProfileAttributesView` SHALL be structurally equal to the `profileAttributes` array in `ds` (profile display accuracy invariant).
6. THE `ProfileAttributesView` SHALL display attributes whose `expiresAt` is in the past with a visual expired indicator rather than hiding them, so that developers can see what attributes have lapsed.

---

### Requirement 8: Rule Matches View

**User Story:** As a developer debugging a rule that is not firing, I want to see which rules were evaluated for each prescription attempt, which conditions passed or failed, and why a rule matched or did not match, so that I can diagnose rule-logic errors without modifying server code.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `RuleMatchesView` SHALL display all `RuleMatchRecord` entries associated with the current session's prescriptions, grouped by prescription.
2. FOR EACH `RuleMatchRecord` entry, THE `RuleMatchesView` SHALL display the `ruleId`, the `matched` boolean outcome, and a per-condition breakdown showing each condition path, operator, expected value, and whether that condition passed or failed.
3. WHEN a `RuleMatchRecord` has `matched: false`, THE `RuleMatchesView` SHALL display the `failureReason` string for that record.
4. WHEN a prescription has zero associated `RuleMatchRecord` entries (e.g. it was dropped due to expiry before rule evaluation completed), THE `RuleMatchesView` SHALL display a placeholder row stating `"No rule evaluation recorded"` for that prescription.
5. FOR ALL `DevtoolsState` values `ds`, the rule match entries rendered by `RuleMatchesView` SHALL be structurally equal to the `ruleMatches` array in `ds` (rule match display accuracy invariant).
6. THE `RuleMatchesView` SHALL allow the developer to navigate from a rule match entry directly to the corresponding prescription entry in `PrescriptionLogView`, using the shared prescription `id` as the link key.

---

### Requirement 9: Feedback History View

**User Story:** As a developer verifying that user feedback is correctly recorded and fed back into the adaptation loop, I want to see all feedback events for the session in order, so that I can confirm accept, dismiss, undo, reject, and override signals are reaching the server.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `FeedbackHistoryView` SHALL display all `FeedbackEvent` records for the session, each showing `prescriptionId`, `action`, `timestamp`, and `reason` if present.
2. THE `FeedbackHistoryView` SHALL display feedback entries in ascending `timestamp` order (earliest first).
3. THE `FeedbackHistoryView` SHALL display a count of total feedback events at the top of the view.
4. WHEN zero feedback events have been recorded for the session, THE `FeedbackHistoryView` SHALL display an empty-state message such as `"No feedback recorded"`.
5. FOR ALL `DevtoolsState` values `ds`, the feedback entries rendered by `FeedbackHistoryView` SHALL be structurally equal to the `feedbackHistory` array in `ds`, and the displayed count SHALL equal `ds.feedbackHistory.length` (feedback display accuracy invariant).
6. FOR EACH feedback entry displayed, THE `FeedbackHistoryView` SHALL provide a way to navigate to the corresponding prescription in `PrescriptionLogView` using the `prescriptionId` as the link key, so that developers can trace a feedback signal back to the prescription it references.

---

### Requirement 10: Consent Editor (Simulation Tool)

**User Story:** As a developer testing consent-gated adaptations, I want to toggle individual data-class consent values in the devtools and immediately see which prescriptions become available or blocked, so that I can verify that consent enforcement is working without modifying application code.

#### Acceptance Criteria

1. THE `ConsentEditor` SHALL allow the developer to toggle any standard `DataClass` consent value between `true` and `false` for the current devtools session.
2. WHEN the developer toggles a `DataClass` to `false` using `ConsentEditor`, THE `Devtools_Package` SHALL POST a `ConsentRequest` (conforming to `ConsentRequestSchema` from `@aura/protocol`) to `POST /aura/consent` with `sessionId` and a `consentPatch` setting the toggled `DataClass` to `false`, so that the server enforces the change through the same consent pipeline as the SDK.
3. WHEN the developer toggles a `DataClass` to `true` using `ConsentEditor`, THE `Devtools_Package` SHALL POST a `ConsentRequest` to `POST /aura/consent` with `sessionId` and a `consentPatch` setting the toggled `DataClass` to `true`.
4. AFTER a `ConsentEditor` toggle is applied, THE `ConsentStateView` SHALL reflect the updated consent value without requiring the developer to manually refresh the devtools panel.
5. AFTER a `ConsentEditor` toggle sets a `DataClass` to `false`, THE `PrescriptionLogView` SHALL show that subsequent prescriptions dependent on the revoked `DataClass` carry a `rejected` disposition with a consent-related reason.
6. WHEN `ConsentEditor` sends a `ConsentRequest` and the server returns an HTTP error, THE `Devtools_Package` SHALL display an error notification identifying the failure and SHALL NOT update `ConsentStateView` to reflect the change.
7. FOR ALL sequences of `ConsentEditor` toggles applied to a `DataClass` key `k`, toggling `k` to `false` and then back to `true` SHALL restore the prior prescription-delivery behavior for that key (consent toggle idempotence property: the net state after an even number of toggles to the same value equals the initial state).

---

### Requirement 11: Profile Scenario Simulator (Simulation Tool)

**User Story:** As a developer testing rule conditions that depend on profile attributes, I want to simulate profile attributes without corrupting the user's real adaptive profile, so that I can verify how profile state affects prescription output.

#### Acceptance Criteria

1. THE `ProfileSimulator` SHALL allow the developer to define a temporary `ProfileAttribute` scenario by entering `key`, `value`, source/provenance, `confidence`, and `dataClass`.
2. WHEN the developer submits a temporary profile scenario, THE `Devtools_Package` SHALL mark it as simulated and SHALL NOT apply it through `POST /aura/profile/correction`, because profile correction is reserved for correcting or removing real inferred attributes.
3. WHEN the implementation supports server-side simulation, THE `Devtools_Package` MAY submit the temporary attribute to a dedicated devtools-only simulation endpoint; otherwise it SHALL keep the scenario local to replay and inspection tools.
4. AFTER the temporary attribute is applied to a simulation, THE `ProfileAttributesView` SHALL distinguish it with a simulation indicator and SHALL NOT present it as persisted user profile state.
5. WHEN the developer clears the temporary profile scenario, THE `ProfileAttributesView` SHALL no longer display the simulated attribute.
6. IF the `ProfileSimulator` submission is rejected by `@aura/protocol` schema validation (e.g. `confidence` outside [0, 1] or unrecognized `dataClass`), THE `Devtools_Package` SHALL display a field-level validation error to the developer before running the simulation.
7. FOR ALL profile scenarios, clearing the scenario and re-fetching `DevtoolsState` SHALL return the real persisted profile attributes without the simulated attribute.

---

### Requirement 12: Event Replayer (Simulation Tool)

**User Story:** As a developer verifying rule behavior end-to-end, I want to select or enter a fixture event and replay it against the current session state, so that I can observe the complete event-to-prescription flow in the devtools without modifying application code.

#### Acceptance Criteria

1. THE `EventReplayer` SHALL display a list of available fixture event names supplied by devtools configuration or allow the developer to enter a valid `AuraEvent` payload manually; it SHALL NOT require a direct runtime import from `@aura/rules`.
2. WHEN the developer selects or enters a fixture event and activates replay, THE `Devtools_Package` SHALL POST an `EventsRequest` (conforming to `EventsRequestSchema` from `@aura/protocol`) to `POST /aura/events` with `sessionId` and the fixture event's `AuraEvent` payload, so that the replay enters the same server-side pipeline as a real SDK event.
3. AFTER the fixture event is replayed, THE `EventLogView` SHALL display the replayed event as a new entry at the end of the log, distinguishing it from real SDK events with a `"replayed"` label.
4. AFTER the fixture event is replayed, THE `PrescriptionLogView` SHALL display any prescriptions produced as a result of the replay, including their `PrescriptionDisposition` and associated `RuleMatchRecord` entries.
5. AFTER the fixture event is replayed, THE `RuleMatchesView` SHALL display the rule evaluation results triggered by the replayed event, so the developer can see exactly which conditions matched or failed.
6. WHEN the same fixture event is replayed twice against identical session state (same consent, same profile, same prior events), THE `Devtools_Package` SHALL produce the same prescription disposition and rule match results on both replays (deterministic replay property).
7. WHEN the fixture event replay request fails at the server (HTTP error), THE `Devtools_Package` SHALL display an error notification and SHALL NOT add a replayed event entry to `EventLogView`.

---

### Requirement 13: Prescription Inspector (Simulation Tool)

**User Story:** As a developer or UX researcher investigating a specific prescription outcome, I want to select any prescription from the log and see a detailed breakdown of why it was accepted, rejected, or dropped — including which rules matched, which consent gates fired, which manifest checks passed or failed, and which risk-class enforcement decisions were made — so that I can diagnose the root cause of unexpected behavior.

#### Acceptance Criteria

1. THE `PrescriptionInspector` SHALL be accessible by selecting any prescription entry in `PrescriptionLogView`, presenting a detail panel for the selected prescription.
2. WHEN `PrescriptionInspector` is opened for an `accepted` prescription, THE `Devtools_Package` SHALL fetch the `ExplanationRecord` via `GET /aura/explain/{prescriptionId}` and display all `factors`, `summary`, `confidence`, and `userVisible` fields.
3. WHEN `PrescriptionInspector` is opened for a `rejected` prescription, THE `Devtools_Package` SHALL display the sequence of pipeline stages (rule evaluation → consent gate → manifest check → risk-class enforcement → context-lock check) and identify the first stage that rejected the prescription with a human-readable reason.
4. WHEN `PrescriptionInspector` is opened for a `dropped` prescription, THE `Devtools_Package` SHALL display the reason for the drop — either `"expired before delivery"` with the `expiresAt` timestamp, `"stale context"` with the prescription and current context sequence IDs, `"late layout-changing prescription"` with the surface layout-stability budget, or `"superseded by newer prescription"` with the replacement prescription `id`.
5. THE `PrescriptionInspector` SHALL display the full `RuleMatchRecord` array for the prescription, showing each evaluated rule's `ruleId`, `matched` status, and per-condition pass/fail breakdown.
6. THE `PrescriptionInspector` SHALL display the consent gate result for each `DataClass` required by the prescription's explanation, showing whether consent was granted or denied for each required class at the time the prescription was evaluated.
7. THE `PrescriptionInspector` SHALL display the manifest check result showing the surface, slot, component, and variant referenced by the prescription and whether each was present in the registered `CapabilityManifest`.
7a. THE `PrescriptionInspector` SHALL display the `layoutStability` constraints for the prescription's surface when present, including the configured strategy and `maxDecisionWaitMs`.
8. THE `PrescriptionInspector` SHALL display the prescription audit metadata, including `decisionSource`, `policyVersion`, `dataClassesUsed`, latency class, observed evaluation time when available, and model tier when available.
9. WHEN `GET /aura/explain/{prescriptionId}` returns HTTP 404 for an `accepted` prescription, THE `PrescriptionInspector` SHALL display a `"Explanation not available"` message rather than crashing or showing an error boundary.
10. FOR ALL prescription entries in `PrescriptionLogView`, the `PrescriptionDisposition` displayed in the inspector SHALL equal the `PrescriptionDisposition` stored in `DevtoolsState` (inspector accuracy invariant).

---

### Requirement 13a: Operational Audit View

**User Story:** As a developer or architect investigating AURA behavior, I want to inspect latency, model-routing, policy, manifest-version, and security audit records, so that I can verify the architecture's performance, cost, and adversarial-hardening constraints.

#### Acceptance Criteria

1. WHEN `DevtoolsPanel` is rendered with a valid `sessionId`, THE `OperationalAuditView` SHALL display one row per prescription attempt or security audit event returned in `DevtoolsState`.
2. FOR EACH prescription attempt, THE `OperationalAuditView` SHALL display `latencyClass`, observed evaluation time when available, `decisionSource`, `policyVersion`, `manifestVersion`, `dataClassesUsed`, and final disposition.
3. WHEN `decisionSource` is `llm`, THE `OperationalAuditView` SHALL display the LLM-use justification when present and SHALL indicate whether `cloudModelUse` consent was granted at decision time.
4. WHEN a prescription is dropped because it exceeded a latency or layout-stability budget, THE `OperationalAuditView` SHALL display the budget, elapsed time, and drop reason.
5. WHEN a `SecurityAuditRecord` is present, THE `OperationalAuditView` SHALL display its category and sanitized reason without exposing raw sensitive payload values.
6. FOR ALL `DevtoolsState` values `ds`, every operational audit row rendered by `OperationalAuditView` SHALL correspond to an audit or security record in `ds` (audit display accuracy invariant).

---

### Requirement 14: DevtoolsClient Data Access

**User Story:** As a devtools implementer, I want a typed data-access layer that fetches and validates all devtools state from the server, so that the views have a consistent, validated data source and do not need to know about HTTP or schema details.

#### Acceptance Criteria

1. THE `Devtools_Package` SHALL export a `createDevtoolsClient(config: DevtoolsClientConfig): DevtoolsClient` factory function that accepts `endpoint` (non-empty string) and `sessionId` (non-empty string) and returns a `DevtoolsClient` instance.
2. THE `DevtoolsClient` SHALL expose a `fetchState(): Promise<DevtoolsState>` method that sends `GET /aura/devtools/state?sessionId={sessionId}` to the configured `endpoint`, validates the response through `DevtoolsStateSchema`, and returns the typed `DevtoolsState`.
3. WHEN `fetchState()` receives a response that fails `DevtoolsStateSchema` validation, THE `DevtoolsClient` SHALL reject with a structured error identifying the validation failures; it SHALL NOT return a partially-typed object.
4. WHEN `fetchState()` receives an HTTP 404 response, THE `DevtoolsClient` SHALL reject with a `DevtoolsSessionNotFoundError` identifying the `sessionId`.
5. WHEN `fetchState()` receives an HTTP 400 response, THE `DevtoolsClient` SHALL reject with a `DevtoolsRequestError` containing the server's error message.
6. WHEN the server is unreachable or the request times out during `fetchState()`, THE `DevtoolsClient` SHALL reject with a `DevtoolsNetworkError`; it SHALL NOT silently resolve with empty or stale data.
7. THE `DevtoolsClient` SHALL expose a `sendConsent(consentPatch: ConsentProfile): Promise<void>` method that POSTs a `ConsentRequest` to `POST /aura/consent` with the configured `sessionId`.
8. THE `DevtoolsClient` SHALL expose a `sendEvent(event: AuraEvent): Promise<void>` method that POSTs an `EventsRequest` to `POST /aura/events` with the configured `sessionId`.
9. THE `DevtoolsClient` SHALL expose a `sendProfileCorrection(correction: ProfileCorrectionPayload): Promise<void>` method that POSTs a `ProfileCorrectionRequest` to `POST /aura/profile/correction` with the configured `sessionId`.
10. THE `DevtoolsClient` SHALL expose a `fetchExplanation(prescriptionId: string): Promise<ExplanationRecord | null>` method that sends `GET /aura/explain/{prescriptionId}` and returns the `ExplanationRecord` or `null` if not found.
11. FOR ALL valid `DevtoolsState` values `ds` returned by `fetchState()`, `JSON.stringify(ds)` parsed through `DevtoolsStateSchema` SHALL produce a value deeply equal to `ds` (client round-trip property).

---

### Requirement 15: UI Container and Rendering

**User Story:** As a developer integrating devtools into a development workflow, I want the devtools to be usable in at least one of: a local web route, an embeddable React panel, or a standalone React component, so that I can choose the integration model that fits my team's setup.

#### Acceptance Criteria

1. THE `Devtools_Package` SHALL implement at least one of the following container models in v0: a React component (`DevtoolsPanel`) that can be mounted anywhere in a React tree, or a Hono route handler that serves an HTML page rendering the core devtools inspector at a configurable local path.
2. WHEN `DevtoolsPanel` is rendered as a React component with a valid `sessionId` and `endpoint` prop, THE component SHALL call `createDevtoolsClient` internally, fetch `DevtoolsState` on mount, and render the available inspector views using the fetched data.
3. WHEN `DevtoolsPanel` is mounted and `fetchState()` returns an error, THE component SHALL render an error state describing the failure without throwing into a React error boundary.
4. THE `DevtoolsPanel` SHALL NOT render any adaptive prescriptions directed at the host application; it SHALL be purely observational and not participate in the AUIP prescription-delivery flow.
5. WHEN `DevtoolsPanel` is unmounted, THE `Devtools_Package` SHALL cancel any in-flight `fetchState()` requests to prevent state updates on unmounted components.
6. THE `DevtoolsPanel` component, if implemented, SHALL be importable without side effects; importing it SHALL NOT register any routes, open any connections, or modify any global state until the component is rendered.
7. WHEN the devtools is implemented as a Hono route, THE route SHALL be accessible only in development environments; THE `Devtools_Package` documentation SHALL note that the route must not be registered in production.

---

### Requirement 16: Package Boundary and Dependency Constraints

**User Story:** As an architect maintaining the AURA monorepo, I want `@aura/devtools` to depend only on `@aura/protocol`, React (if applicable), and standard browser APIs, so that the package never becomes a transitive dependency of the SDK, framework adapters, or server.

#### Acceptance Criteria

1. THE `Devtools_Package` SHALL list `@aura/protocol` as a direct dependency and SHALL NOT import from `@aura/sdk`, `@aura/react`, `@aura/server`, or `@aura/rules` source modules.
2. WHEN the devtools is implemented using React, THE `Devtools_Package` SHALL list `react` as a peer dependency and SHALL NOT bundle React.
3. A static import graph analysis of `@aura/sdk`, `@aura/react`, `@aura/server`, and `@aura/rules` SHALL find no imports of `@aura/devtools` in any of those packages (one-way dependency invariant).
4. THE `Devtools_Package` SHALL export all public APIs from a single package entry point without requiring consumers to import from sub-paths.
5. THE `Devtools_Package` SHALL NOT import Node.js built-in modules in any code path executed in the browser; server-side code (Hono route handlers, `registerDevtoolsRoute`) MAY import Node.js APIs only in files that are not bundled for browser environments.
6. THE `Devtools_Package` SHALL NOT modify any `@aura/protocol` schema or type; it SHALL use the exported schemas as-is for validation.

---

### Requirement 17: Correctness Properties

**User Story:** As a developer writing property-based tests for `@aura/devtools`, I want well-defined data-accuracy invariants, round-trip properties, and simulation-fidelity properties, so that tests can verify devtools correctness across a wide range of session states and simulation inputs.

#### Acceptance Criteria

1. FOR ALL `DevtoolsState` values `ds` returned by `DevtoolsEndpoint`, the `events` array in `ds` SHALL satisfy the ordering invariant: for all adjacent pairs `(ds.events[i], ds.events[i+1])`, `ds.events[i].timestamp` SHALL be less than or equal to `ds.events[i+1].timestamp` (event log ordering property).
2. FOR ALL `DevtoolsState` values `ds` returned by `DevtoolsEndpoint`, the `feedbackHistory` array in `ds` SHALL satisfy the ordering invariant: for all adjacent pairs `(ds.feedbackHistory[i], ds.feedbackHistory[i+1])`, `ds.feedbackHistory[i].timestamp` SHALL be less than or equal to `ds.feedbackHistory[i+1].timestamp` (feedback log ordering property).
3. FOR ALL `DevtoolsState` values `ds` returned by `DevtoolsEndpoint`, each `prescriptionId` referenced in `ds.feedbackHistory` SHALL appear in `ds.prescriptions` (feedback-to-prescription referential integrity property).
4. FOR ALL `DevtoolsState` values `ds` returned by `DevtoolsEndpoint`, each `surfaceId` referenced in `ds.prescriptions` SHALL appear in `ds.manifest.surfaces` (prescription-to-manifest referential integrity property).
5. FOR ALL `DevtoolsState` values `ds`, the count of entries in `ds.prescriptions` with `disposition: "accepted"` SHALL be greater than or equal to zero and less than or equal to the total count of entries in `ds.prescriptions` (accepted-prescription cardinality invariant).
6. WHEN `ConsentEditor` sets a `DataClass` `k` to `false` and a subsequent prescription is produced that depends on `k`, THE `PrescriptionLogView` SHALL show that prescription with `disposition: "rejected"` (consent enforcement fidelity property).
7. WHEN a temporary profile scenario contains a `ProfileAttribute` whose `key` matches a condition in a known rule `r`, and `EventReplayer` replays an event that triggers `r`, THE `PrescriptionLogView` SHALL display a prescription attempt produced by `r` with the expected disposition for that simulated context (profile simulation fidelity property, verifiable via demo rules).
8. WHEN `EventReplayer` replays the same fixture event twice against identical session state, THE `DevtoolsState` after each replay SHALL contain a new prescription entry with the same `disposition` and the same set of `RuleMatchRecord.ruleId` values (deterministic replay property).
9. FOR ALL `DevtoolsState` values `ds`, re-serializing `ds` via `JSON.stringify(ds)` and parsing it back through `DevtoolsStateSchema` SHALL produce a value deeply equal to `ds` (state round-trip serialization property).
10. WHEN `DevtoolsPanel` is mounted and then unmounted without any user interaction, THE count of open HTTP connections initiated by `DevtoolsClient` SHALL return to zero (no connection leak after unmount property).
