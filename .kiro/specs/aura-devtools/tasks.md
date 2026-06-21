# Implementation Plan: @aura/devtools

## Overview

Implement the `@aura/devtools` package for the AURA adaptive UI framework. This package provides developer inspection and simulation tools for real-time visibility into the AURA server's decision-making pipeline. The implementation follows a bottom-up approach: data layer first (schema, errors, client), then server integration (route), then UI components (inspector views, simulation tools, panel container), and finally comprehensive testing.

## Tasks

- [ ] 1. Set up package structure and core dependencies
  - [ ] 1.1 Create package directory structure and package.json
    - Create `packages/devtools/` with `src/`, `src/components/`, `tests/`, `tests/properties/`, `tests/unit/`, `tests/unit/components/`, `tests/integration/` directories
    - Create `package.json` with `@aura/protocol` as direct dependency, `react` as peer dependency, `vitest`, `fast-check`, `@testing-library/react`, `zod` as dev dependencies
    - Create `tsconfig.json` extending workspace config
    - Create `vitest.config.ts` with test configuration
    - _Requirements: 16.1, 16.2, 16.4_

  - [ ] 1.2 Create barrel export file and error classes
    - Create `src/index.ts` barrel exporting all public APIs (schema, client factory, route registration, DevtoolsPanel)
    - Create `src/errors.ts` with `DevtoolsSessionNotFoundError`, `DevtoolsRequestError`, `DevtoolsNetworkError`, and `DevtoolsValidationError` classes
    - _Requirements: 16.4, 14.3, 14.4, 14.5, 14.6_

- [ ] 2. Implement DevtoolsState schema and validation
  - [ ] 2.1 Implement DevtoolsState Zod schema (`src/schema.ts`)
    - Define all devtools-specific sub-schemas: `PrescriptionDispositionSchema`, `RuleConditionResultSchema`, `RuleMatchRecordSchema`, `ContextLockSnapshotSchema`, `PrescriptionAuditSchema`, `AdaptationSummarySchema`, `PrescriptionEntrySchema`, `SecurityAuditRecordSchema`, `OperationalAuditEntrySchema`, `SessionMetadataSchema`
    - Define the top-level `DevtoolsStateSchema` composing `@aura/protocol` schemas with devtools-specific schemas
    - Export the `DevtoolsState` TypeScript type inferred from the schema
    - _Requirements: 1.5, 1.8, 14.11_

  - [ ]* 2.2 Write property test for DevtoolsState round-trip serialization
    - **Property 1: DevtoolsState Round-Trip Serialization**
    - Create `tests/properties/arbitraries.ts` with custom fast-check generators for all sub-schemas
    - Create `tests/properties/roundtrip.property.test.ts`
    - For any valid `DevtoolsState` value, `JSON.stringify` → `JSON.parse` → `DevtoolsStateSchema.parse` produces a deeply equal value
    - **Validates: Requirements 1.8, 14.11, 17.9**

  - [ ]* 2.3 Write unit tests for schema validation
    - Create `tests/unit/schema.test.ts`
    - Test that valid DevtoolsState objects pass validation
    - Test that invalid objects (missing fields, wrong types, invalid enums) fail with structured errors
    - Test edge cases: empty arrays, optional fields absent, boundary values
    - _Requirements: 1.5, 14.3_

- [ ] 3. Implement DevtoolsClient data access layer
  - [ ] 3.1 Implement createDevtoolsClient factory (`src/client.ts`)
    - Implement `createDevtoolsClient(config: DevtoolsClientConfig): DevtoolsClient`
    - Implement `fetchState()`: GET request, 404 → `DevtoolsSessionNotFoundError`, 400 → `DevtoolsRequestError`, network error → `DevtoolsNetworkError`, schema validation failure → `DevtoolsValidationError`, success → typed `DevtoolsState`
    - Implement `sendConsent(consentPatch)`: POST to `/aura/consent` with `sessionId` and `consentPatch`
    - Implement `sendEvent(event)`: POST to `/aura/events` with `sessionId` and event array
    - Implement `sendProfileCorrection(correction)`: POST to `/aura/profile/correction`
    - Implement `fetchExplanation(prescriptionId)`: GET `/aura/explain/{id}`, return `null` on 404
    - Support `AbortSignal` for cancellation across all methods
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_

  - [ ]* 3.2 Write property test for client schema validation rejection
    - **Property 10: Client Schema Validation Rejection**
    - Create `tests/properties/client-validation.property.test.ts`
    - For any HTTP response body that does not conform to `DevtoolsStateSchema`, `fetchState()` rejects with `DevtoolsValidationError` containing structured field-level error information
    - **Validates: Requirements 14.3**

  - [ ]* 3.3 Write property test for client request envelope conformance
    - **Property 11: Client Request Envelope Conformance**
    - For any `ConsentProfile` patch passed to `sendConsent()`, the HTTP POST body conforms to `ConsentRequestSchema`
    - For any `AuraEvent` passed to `sendEvent()`, the HTTP POST body conforms to `EventsRequestSchema`
    - **Validates: Requirements 14.7, 14.8**

  - [ ]* 3.4 Write unit tests for DevtoolsClient
    - Create `tests/unit/client.test.ts`
    - Test fetchState success, 404, 400, network error, and validation error scenarios
    - Test sendConsent, sendEvent, sendProfileCorrection, and fetchExplanation
    - Test AbortSignal cancellation
    - _Requirements: 14.1–14.10_

- [ ] 4. Checkpoint - Ensure all data layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement server route handler
  - [ ] 5.1 Implement registerDevtoolsRoute (`src/route.ts`)
    - Implement `registerDevtoolsRoute(options: RegisterDevtoolsRouteOptions): void`
    - Register `GET /aura/devtools/state` route on the Hono app
    - Validate `sessionId` query parameter presence (400 if missing)
    - Fetch session from storage (404 if not found)
    - Fetch all data in parallel from 9 storage adapters (manifest, events, prescriptions, ruleMatches, consentProfile, profileAttributes, feedbackHistory, operationalAudit, securityAudit)
    - Assemble and return `DevtoolsState` JSON response
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

  - [ ]* 5.2 Write property tests for event and feedback log ordering
    - **Property 2: Event Log Ordering Invariant**
    - **Property 3: Feedback Log Ordering Invariant**
    - Create `tests/properties/ordering.property.test.ts`
    - For any DevtoolsState returned by the endpoint, events are ordered by timestamp ascending
    - For any DevtoolsState returned by the endpoint, feedbackHistory is ordered by timestamp ascending
    - **Validates: Requirements 4.2, 17.1, 9.2, 17.2**

  - [ ]* 5.3 Write property tests for referential integrity
    - **Property 4: Feedback-to-Prescription Referential Integrity**
    - **Property 5: Prescription-to-Manifest Referential Integrity**
    - Create `tests/properties/referential-integrity.property.test.ts`
    - Every `prescriptionId` in feedbackHistory appears in prescriptions
    - Every `surfaceId` in prescriptions appears in manifest.surfaces
    - **Validates: Requirements 17.3, 17.4**

  - [ ]* 5.4 Write unit tests for route handler
    - Create `tests/unit/route.test.ts`
    - Test valid session returns 200 with complete DevtoolsState
    - Test missing sessionId returns 400
    - Test non-existent session returns 404
    - Test parallel data fetching from all storage adapters
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

- [ ] 6. Implement inspector view components
  - [ ] 6.1 Implement SessionSummaryView (`src/components/SessionSummaryView.tsx`)
    - Display sessionId, userId, status (active/rejected), manifestVersion (or "unversioned"), contextSequenceId, and createdAt timestamp
    - Visual indicator distinguishing active from rejected sessions
    - Error state display for session-not-found scenarios
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 6.2 Implement ManifestSummaryView (`src/components/ManifestSummaryView.tsx`)
    - Display all surfaces with id, slots, layoutStability strategy, and maxDecisionWait
    - For each surface, list all ManifestComponent entries showing id, variants, riskClass, consent requirements
    - Display human-readable adaptable props constraints summary
    - Empty-state message when manifest has zero surfaces
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 6.3 Implement EventLogView (`src/components/EventLogView.tsx`)
    - Display all AuraEvent records showing type, surfaceId, timestamp, and collapsible payload
    - Display total event count at top
    - Support replayed event distinction via `replayedEventIds` prop
    - Empty-state message when no events recorded
    - Preserve server-provided ordering without modification
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 6.4 Implement PrescriptionLogView (`src/components/PrescriptionLogView.tsx`)
    - Display all prescription entries with id, surfaceId, mode, riskClass, manifestVersion, contextLock.sequenceId, disposition, and dispositionTimestamp
    - Visually distinguish accepted/rejected/dropped prescriptions
    - Show adaptation types for each prescription
    - Display rejection reasons, stale context info, and manifest mismatch info
    - Support `onSelectPrescription` callback for PrescriptionInspector navigation
    - Empty-state message when no prescriptions recorded
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ] 6.5 Implement ConsentStateView (`src/components/ConsentStateView.tsx`)
    - Display all standard DataClass keys with on/off indicator
    - Visually highlight disabled (false) data classes
    - Treat missing DataClass keys as false
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 6.6 Implement ProfileAttributesView (`src/components/ProfileAttributesView.tsx`)
    - Display all ProfileAttribute objects showing key, value, source/provenance, confidence, dataClass, expiresAt
    - Distinguish inferred from explicit attributes with label/icon
    - Low-confidence indicator for attributes with confidence < 0.5
    - Expired indicator for attributes with expiresAt in the past
    - Support `simulatedAttributes` prop with simulation indicator
    - Empty-state message when no attributes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 6.7 Implement RuleMatchesView (`src/components/RuleMatchesView.tsx`)
    - Display all RuleMatchRecord entries grouped by prescription
    - Show ruleId, matched boolean, per-condition breakdown (path, operator, expected, passed)
    - Display failureReason for non-matching rules
    - Placeholder for prescriptions with no rule evaluation
    - Navigation callback to PrescriptionLogView via prescription id
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 6.8 Implement FeedbackHistoryView (`src/components/FeedbackHistoryView.tsx`)
    - Display all FeedbackEvent records showing prescriptionId, action, timestamp, reason
    - Display in ascending timestamp order
    - Show total feedback count at top
    - Navigation to corresponding prescription via prescriptionId
    - Empty-state message when no feedback
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 6.9 Implement OperationalAuditView (`src/components/OperationalAuditView.tsx`)
    - Display one row per prescription attempt or security audit event
    - Show latencyClass, evaluationTime, decisionSource, policyVersion, manifestVersion, dataClassesUsed, disposition
    - Display LLM justification and cloudModelUse consent when decisionSource is "llm"
    - Display budget/elapsed/dropReason for latency-dropped prescriptions
    - Display SecurityAuditRecord category and sanitized reason
    - _Requirements: 13a.1, 13a.2, 13a.3, 13a.4, 13a.5, 13a.6_

- [ ] 7. Checkpoint - Ensure all inspector view tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement simulation tool components
  - [ ] 8.1 Implement ConsentEditor (`src/components/ConsentEditor.tsx`)
    - Toggle UI for each standard DataClass between true/false
    - On toggle, call `DevtoolsClient.sendConsent()` with sessionId and consentPatch
    - Show inline error on failure without updating ConsentStateView
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 8.2 Write property test for consent editor request fidelity
    - **Property 12: Consent Editor Request Fidelity**
    - For any DataClass key `k` and boolean `v`, toggling produces a POST with `consentPatch[k] === v`
    - **Validates: Requirements 10.2, 10.3**

  - [ ]* 8.3 Write property test for consent toggle idempotence
    - **Property 13: Consent Toggle Idempotence**
    - Create `tests/properties/simulation.property.test.ts`
    - Toggling a DataClass to false then back to true restores original state
    - **Validates: Requirements 10.7**

  - [ ] 8.4 Implement ProfileSimulator (`src/components/ProfileSimulator.tsx`)
    - Form inputs for key, value, source/provenance, confidence, dataClass
    - Local-only scenario application (not submitted to server profile correction)
    - Validation: reject confidence outside [0,1] or unrecognized DataClass with field-level errors
    - Clear scenario functionality
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 8.5 Write property test for profile simulator validation
    - **Property 16: Profile Simulator Validation**
    - For any `ProfileAttribute` with confidence outside [0,1] or unrecognized DataClass, display field-level error and do not submit
    - **Validates: Requirements 11.6**

  - [ ] 8.6 Implement EventReplayer (`src/components/EventReplayer.tsx`)
    - Display fixture event list from props
    - Allow manual AuraEvent payload entry
    - On replay, POST EventsRequest via DevtoolsClient.sendEvent()
    - Show loading state during replay
    - Show inline error on failure without adding entry to EventLogView
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7_

  - [ ]* 8.7 Write property test for event replayer request fidelity
    - **Property 15: Event Replayer Request Fidelity**
    - For any valid AuraEvent, the POST body conforms to EventsRequestSchema with configured sessionId
    - **Validates: Requirements 12.2**

  - [ ]* 8.8 Write property test for deterministic event replay
    - **Property 14: Deterministic Event Replay**
    - Replaying the same event twice against identical state produces same disposition and ruleId set
    - **Validates: Requirements 12.6, 17.8**

  - [ ] 8.9 Implement PrescriptionInspector (`src/components/PrescriptionInspector.tsx`)
    - Detail panel showing full prescription breakdown
    - For accepted: fetch and display ExplanationRecord (factors, summary, confidence, userVisible)
    - For rejected: display pipeline stages with first rejecting stage identified
    - For dropped: display drop reason with relevant IDs/timestamps
    - Display full RuleMatchRecord array with per-condition breakdown
    - Display consent gate results per DataClass
    - Display manifest check results (surface, slot, component, variant presence)
    - Display layoutStability constraints when present
    - Display audit metadata (decisionSource, policyVersion, dataClassesUsed, latencyClass, evaluationTime, modelTier)
    - Handle explanation 404 gracefully with "Explanation not available" message
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.7a, 13.8, 13.9, 13.10_

- [ ] 9. Implement DevtoolsPanel container
  - [ ] 9.1 Implement DevtoolsPanel (`src/components/DevtoolsPanel.tsx`)
    - Accept props: endpoint, sessionId, fixtureEvents, className
    - On mount: create AbortController, create DevtoolsClient, fetch state
    - Tab-based navigation across all inspector views and simulation tools
    - Wire simulation callbacks (consent toggle → re-fetch state, event replay → re-fetch state, profile scenario → local state update)
    - Error state rendering (session not found, network error, validation error) without throwing to error boundary
    - On unmount: abort in-flight requests
    - No side effects on import
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 9.2 Write property test for no connection leak after unmount
    - **Property 17: No Connection Leak After Unmount**
    - Mounting and unmounting DevtoolsPanel results in zero open HTTP connections
    - **Validates: Requirements 15.5, 17.10**

  - [ ]* 9.3 Write unit tests for DevtoolsPanel lifecycle
    - Create `tests/unit/components/DevtoolsPanel.test.tsx`
    - Test successful mount and data fetch
    - Test error state rendering for various error types
    - Test unmount cancels in-flight requests
    - Test no side effects on import
    - _Requirements: 15.2, 15.3, 15.5, 15.6_

- [ ] 10. Implement display accuracy property tests
  - [ ]* 10.1 Write property test for manifest display completeness
    - **Property 6: Manifest Display Completeness**
    - Create `tests/properties/display-accuracy.property.test.ts`
    - Displayed surface count equals manifest surface count; displayed component count equals total component count
    - **Validates: Requirements 3.3, 3.6**

  - [ ]* 10.2 Write property test for event log display accuracy
    - **Property 7: Event Log Display Accuracy**
    - Events rendered by EventLogView are structurally equal to input, order matches, count matches
    - **Validates: Requirements 4.1, 4.4, 4.5, 4.6**

  - [ ]* 10.3 Write property test for consent display accuracy
    - **Property 8: Consent Display Accuracy**
    - Consent values rendered equal consentProfile values; missing DataClass keys display as false
    - **Validates: Requirements 6.1, 6.4, 6.5**

  - [ ]* 10.4 Write property test for profile attributes display accuracy
    - **Property 9: Profile Attributes Display Accuracy**
    - Attributes rendered are structurally equal; low-confidence indicator for confidence < 0.5; expired indicator for past expiresAt
    - **Validates: Requirements 7.1, 7.3, 7.5, 7.6**

- [ ] 11. Checkpoint - Ensure all component and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integration tests and final wiring
  - [ ]* 12.1 Write integration test for devtools endpoint round-trip
    - Create `tests/integration/devtools-endpoint.integration.test.ts`
    - Test full round-trip: registerDevtoolsRoute → HTTP GET → response validation through DevtoolsStateSchema
    - Test 404 and 400 error responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [ ]* 12.2 Write integration test for consent simulation flow
    - Create `tests/integration/consent-simulation.integration.test.ts`
    - Test consent toggle → re-fetch → verify prescription blocked
    - Test consent toggle idempotence end-to-end
    - _Requirements: 10.2, 10.3, 10.5, 10.7, 17.6_

  - [ ]* 12.3 Write integration test for event replay flow
    - Create `tests/integration/event-replay.integration.test.ts`
    - Test event replay → verify event log updated → verify prescription log updated
    - Test replay failure error handling
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.7_

  - [ ] 12.4 Update barrel exports and verify package boundary
    - Verify `src/index.ts` exports all public APIs: `DevtoolsStateSchema`, `DevtoolsState`, `createDevtoolsClient`, `registerDevtoolsRoute`, `DevtoolsPanel`, error classes
    - Verify no imports from `@aura/sdk`, `@aura/react`, `@aura/server`, or `@aura/rules`
    - Verify `react` is peer dependency, not bundled
    - Verify no Node.js built-in imports in browser-targeted code paths
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (17 properties total)
- Unit tests validate specific scenarios, error states, and edge cases
- Integration tests verify end-to-end flows through the real server pipeline
- The design specifies TypeScript throughout; all code uses TypeScript with Zod for runtime validation
- Testing stack: vitest (test runner) + fast-check (property-based testing) + @testing-library/react (component testing)
- Custom fast-check arbitraries (`tests/properties/arbitraries.ts`) are shared across all property test files

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9"] },
    { "id": 5, "tasks": ["8.1", "8.4", "8.6", "8.9"] },
    { "id": 6, "tasks": ["8.2", "8.3", "8.5", "8.7", "8.8", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 8, "tasks": ["12.1", "12.2", "12.3", "12.4"] }
  ]
}
```
