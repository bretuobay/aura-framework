# Implementation Plan: @aura/sdk

## Overview

Implement the `@aura/sdk` TypeScript client SDK for browser environments following the AUIP v0 protocol. The SDK is structured as 9 internal modules with a state machine architecture (idle → active | degraded), validated through Vitest unit tests and fast-check property-based tests.

## Tasks

- [ ] 1. Set up project structure and foundational modules
  - [ ] 1.1 Initialize project with package.json, tsconfig, and Vitest configuration
    - Create `package.json` with `@aura/protocol` as sole dependency, `fast-check` and `vitest` as devDependencies
    - Create `tsconfig.json` targeting ES2020+ with strict mode, DOM lib, and ESNext module resolution
    - Create `vitest.config.ts` with browser-compatible test configuration
    - Create directory structure: `src/`, `src/__tests__/properties/`, `src/__tests__/unit/`, `src/__tests__/arbitraries/`
    - _Requirements: 1.8, 1.9_

  - [ ] 1.2 Create `src/types.ts` with re-exports and internal SDK types
    - Re-export all protocol types from `@aura/protocol` (CapabilityManifest, ConsentProfile, ContextModel, AuraEvent, UIPrescription, FeedbackEvent, ExplanationRecord, ProfileSummary, ProfileCorrection, etc.)
    - Define internal types: `AuraClientOptions`, `SessionState`, `AuraLogEntry`, `PrescriptionListener`
    - Define the `AuraClient` interface with all public methods
    - _Requirements: 1.2, 15.4_

  - [ ] 1.3 Create `src/errors.ts` with error class hierarchy
    - Implement `AuraConfigError extends Error` with `field` property
    - Implement `AuraValidationError extends Error` with `issues` property (ZodIssue[])
    - Implement `AuraClientError extends Error` with `code` and `context` properties
    - Define error code constants enum/object matching the design error codes table
    - _Requirements: 17.1, 17.2, 17.5_

  - [ ] 1.4 Create `src/log-buffer.ts` implementing circular buffer
    - Implement `LogBuffer` class with configurable `maxEntries` (default: 200)
    - `log(entry)` adds timestamped entry, evicts oldest when full
    - `getAll()` returns entries in chronological order (oldest-first)
    - Entries include: level, timestamp (ISO 8601), code, message, optional context
    - _Requirements: 17.3, 17.4, 17.5_

  - [ ]* 1.5 Write property test for LogBuffer (Property 20: Log buffer circularity and ordering)
    - **Property 20: Log buffer circularity and ordering**
    - **Validates: Requirements 17.3, 17.4, 17.5**
    - For any number of entries n written, getLogs() returns at most 200 in chronological order

- [ ] 2. Implement EventQueue module
  - [ ] 2.1 Create `src/event-queue.ts` with bounded FIFO queue
    - Implement `EventQueue` class with constructor accepting `{ maxCapacity, queueTTL }`
    - `enqueue(event)`: adds event with timestamp, evicts oldest if at capacity
    - `flush()`: returns and removes all non-expired events in FIFO order
    - `size()`: returns current queue length
    - `clear()`: empties the queue
    - In-memory only, no persistence (no localStorage/IndexedDB)
    - _Requirements: 3.5, 3.6, 3.7, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 2.2 Write property test for EventQueue FIFO ordering (Property 6)
    - **Property 6: EventQueue FIFO ordering**
    - **Validates: Requirements 3.6, 13.1, 13.2, 13.6**
    - For any sequence of n valid events enqueued (within TTL and capacity), flush returns them in original order

  - [ ]* 2.3 Write property test for EventQueue capacity eviction (Property 7)
    - **Property 7: EventQueue capacity eviction preserves FIFO among retained**
    - **Validates: Requirements 3.7, 13.3**
    - For a full queue of capacity k, enqueuing event e results in [2..k, e] in FIFO order

  - [ ]* 2.4 Write property test for EventQueue TTL eviction (Property 8)
    - **Property 8: EventQueue TTL eviction**
    - **Validates: Requirements 3.5, 13.4**
    - Events older than queueTTL are removed on flush and never appear in results

  - [ ]* 2.5 Write unit tests for EventQueue
    - Test empty queue flush returns []
    - Test enqueue during flush doesn't lose events
    - Test capacity boundary (exactly at max, one over max)
    - Test TTL boundary (just under, exactly at, just over TTL)
    - _Requirements: 13.5_

- [ ] 3. Implement PrescriptionStore module
  - [ ] 3.1 Create `src/prescription-store.ts` with per-surface storage and listener dispatch
    - Implement `PrescriptionStore` class with all methods from design
    - `store(prescription, currentSeqId, manifestVersion)`: validates admission (schema, expiry, contextLock, manifestVersion), stores per surfaceId, notifies listeners
    - `get(surfaceId, currentSeqId)`: returns prescription or undefined (checking expiry and context lock)
    - `remove(surfaceId)`, `removeByPrescriptionId(id)`, `removeByDataClass(dataClass)`
    - `evictExpiredAndStale(currentSeqId)`: periodic cleanup, returns evicted surfaceIds
    - `subscribe(surfaceId, listener)`: returns unsubscribe function
    - `notifyListeners(surfaceId, prescription)`, `clearListeners()`, `clear()`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.10, 5.11, 5.12, 5.13, 5.14, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ]* 3.2 Write property test for Prescription admission invariant (Property 10)
    - **Property 10: Prescription admission invariant**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.12, 5.14, 14.1, 15.6**
    - All stored prescriptions pass schema, have future expiresAt, matching contextLock.sequenceId, and matching manifestVersion

  - [ ]* 3.3 Write property test for per-surface uniqueness and latest-wins (Property 11)
    - **Property 11: Per-surface uniqueness and latest-wins**
    - **Validates: Requirements 5.13, 14.1, 14.3, 16.4**
    - At most one prescription per surfaceId; new valid prescription replaces the old one

  - [ ]* 3.4 Write property test for expiry safety (Property 12)
    - **Property 12: Expiry safety**
    - **Validates: Requirements 5.6, 14.4, 14.6**
    - For all times at or after expiresAt, getPrescription returns undefined

  - [ ]* 3.5 Write property test for unsubscribe stops delivery (Property 13)
    - **Property 13: Unsubscribe stops delivery**
    - **Validates: Requirements 5.10, 5.11, 10.6**
    - After unsubscribe, listener receives no further notifications

  - [ ]* 3.6 Write unit tests for PrescriptionStore
    - Test store with valid/invalid prescriptions
    - Test removal by prescriptionId and by dataClass
    - Test eviction sweep removes expired and stale prescriptions
    - Test multiple listeners for same surface
    - Test clearListeners stops all delivery
    - _Requirements: 14.2, 14.5, 14.7_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement HTTP Transport and SSE Manager
  - [ ] 5.1 Create `src/http-transport.ts` with fetch-based HTTP client
    - Implement `HttpTransport` class wrapping browser `fetch` API
    - `post<TReq, TRes>(path, body, requestSchema, responseSchema?, sessionId?)`: validates outbound body, sends POST, validates response
    - `get<TRes>(path, responseSchema, sessionId?)`: sends GET, validates response
    - Returns `null` for 404 responses
    - Throws `AuraValidationError` for outbound schema failures
    - Returns `null` and logs warning for inbound schema failures
    - Adds sessionId as header/query parameter
    - Configurable request timeout
    - _Requirements: 12.1, 15.1, 15.2, 15.4_

  - [ ] 5.2 Create `src/sse-manager.ts` with EventSource management and reconnection
    - Implement `SSEManager` class with `connect()`, `disconnect()`, `isConnected()`
    - Manage EventSource or fetch-based SSE stream to `/aura/prescriptions/stream`
    - Parse incoming messages through `UIPrescriptionSchema`
    - Implement exponential backoff: 1s initial, doubling to 30s max
    - Discard invalid messages, invoke onError callback
    - Stop reconnection only on explicit `disconnect()`
    - _Requirements: 5.1, 5.3, 5.7, 5.8, 5.9, 16.1, 16.2, 16.3, 16.5, 16.6_

  - [ ]* 5.3 Write property test for SSE reconnection exponential backoff (Property 21)
    - **Property 21: SSE reconnection exponential backoff**
    - **Validates: Requirements 5.7, 16.1, 16.2**
    - For n consecutive failures, delay for attempt i = min(2^(i-1) * 1000, 30000) ms

  - [ ]* 5.4 Write unit tests for HttpTransport
    - Test successful POST with response validation
    - Test POST with outbound schema failure (throws AuraValidationError)
    - Test 404 GET returns null
    - Test inbound response schema failure returns null and logs
    - Test timeout handling
    - Test sessionId attachment to requests
    - _Requirements: 15.1, 15.2_

  - [ ]* 5.5 Write unit tests for SSEManager
    - Test connection open and message parsing
    - Test invalid message discarding
    - Test reconnection backoff sequence (1s, 2s, 4s, 8s, 16s, 30s, 30s)
    - Test disconnect stops reconnection
    - Test onError invocation on connection drop
    - _Requirements: 5.7, 5.9, 16.1, 16.2_

- [ ] 6. Implement Config validation module
  - [ ] 6.1 Create `src/config.ts` with AuraClientConfig validation
    - Implement `validateConfig(config: AuraClientConfig): void` that throws `AuraConfigError` on invalid input
    - Validate `endpoint`: non-empty string
    - Validate `userId`: non-empty string
    - Validate `manifest` against `CapabilityManifestSchema`
    - Validate `consentProfile` against `ConsentProfileSchema`
    - Validate `context` against `ContextModelSchema`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 6.2 Write property test for valid config produces idle client (Property 1)
    - **Property 1: Valid config produces idle client**
    - **Validates: Requirements 1.10, 12.2**
    - For any valid AuraClientConfig, createAuraClient returns AuraClient with status "idle" and no network I/O

  - [ ]* 6.3 Write property test for invalid config throws AuraConfigError (Property 2)
    - **Property 2: Invalid config throws AuraConfigError**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7**
    - For any config failing validation, createAuraClient throws AuraConfigError synchronously

  - [ ]* 6.4 Write unit tests for config validation
    - Test each invalid field individually (empty endpoint, empty userId, invalid manifest, etc.)
    - Test valid config passes without error
    - Test AuraConfigError includes correct field name
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 7. Implement AuraClient core — lifecycle and state machine
  - [ ] 7.1 Create `src/client.ts` with AuraClient class implementing state machine and public API
    - Implement `createAuraClient(config)` factory function that validates config and returns AuraClient in "idle" status
    - Implement state machine: idle → active (on init success), idle → degraded (on init failure)
    - Implement `init()`: POST /aura/session, store sessionId, pin manifestVersion, transition state, open SSE, flush queue
    - Implement idempotent init (no-op when active or degraded)
    - Implement `status` read-only property
    - Initialize contextSequenceId from config.context.sequenceId or 0
    - init() never rejects — transitions to degraded on any failure
    - _Requirements: 1.1, 1.10, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 12.2, 12.3_

  - [ ] 7.2 Implement `emit(event)` on AuraClient
    - Validate event against AuraEventSchema, reject with AuraValidationError on failure
    - When active: POST EventsRequest to /aura/events with sessionId, contextSequenceId, and event
    - When idle/degraded: enqueue event in EventQueue, resolve without network call
    - On transient failure: re-enqueue event, resolve without throwing
    - Return Promise<void> that never rejects under network failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.8, 3.9, 3.10, 12.4_

  - [ ] 7.3 Implement `updateContext(contextPatch)` on AuraClient
    - Validate patch against partial ContextModelSchema, reject with AuraValidationError on failure
    - Increment contextSequenceId before sending (regardless of status)
    - When active: POST ContextRequest to /aura/context
    - When idle/degraded: update in-memory context and sequenceId, resolve without network call
    - On transient failure: log warning, resolve
    - Expose `getContextSequenceId()` method
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 7.4 Implement `feedback(feedbackEvent)` on AuraClient
    - Validate against FeedbackEventSchema, reject with AuraValidationError on failure
    - When active: POST FeedbackRequest to /aura/feedback
    - When idle/degraded: resolve without network call
    - On undo/reject action: remove prescription from PrescriptionStore, notify listeners with undefined
    - On transient failure: log warning, resolve (no retry)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 7.5 Implement `updateConsent(consentPatch)` on AuraClient
    - Validate against ConsentProfileSchema, reject with AuraValidationError on failure
    - When active: POST ConsentRequest to /aura/consent
    - When idle/degraded: resolve without network call
    - Update in-memory ConsentProfile immediately (even on network failure)
    - On revocation (any DataClass set to false): remove affected prescriptions from store, notify listeners
    - Expose `getConsent()` method returning current in-memory ConsentProfile
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ] 7.6 Implement `explain(prescriptionId)` and profile methods on AuraClient
    - `explain(prescriptionId)`: GET /aura/explain/{prescriptionId}, return ExplanationRecord or null
    - Reject with AuraValidationError if prescriptionId is empty
    - When degraded/idle: resolve with null
    - `getProfile()`: GET /aura/profile, return ProfileSummary; when degraded: return { attributes: [] }
    - `correctProfile(correction)`: POST to /aura/profile/correction; validate against schema; when degraded: resolve without call
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 7.7 Implement `disconnect()` and `onError()` on AuraClient
    - `disconnect()`: close SSE, cancel timers, clear listeners, clear PrescriptionStore, transition to degraded
    - Synchronous, void return, never throws, idempotent
    - Allow in-flight requests to complete, prevent new requests after disconnect
    - `onError(handler)`: register error handler, return unsubscribe function
    - Route runtime errors to handler before logging; if no handler, use console.warn
    - `getLogs()`: return LogBuffer entries
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.5, 11.6, 11.7, 11.8_

  - [ ] 7.8 Implement SSE prescription handling and periodic eviction in AuraClient
    - Wire SSEManager onMessage to PrescriptionStore.store with admission checks
    - Implement periodic eviction sweep (≤5s interval) via setInterval
    - On admission: check contextLock.sequenceId, manifestVersion, expiresAt
    - On manifest mismatch: discard, log MANIFEST_VERSION_MISMATCH, send reject feedback
    - On stale context: discard, log STALE_CONTEXT_LOCK, send reject feedback
    - On expired: discard, log PRESCRIPTION_EXPIRED
    - `subscribe(surfaceId, listener)` and `getPrescription(surfaceId)` delegate to PrescriptionStore
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.12, 5.13, 5.14, 5.15, 12.5, 12.6_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Create fast-check arbitraries and client-level property tests
  - [ ] 9.1 Create `src/__tests__/arbitraries/` with custom fast-check generators
    - `config.arbitrary.ts`: generators for valid/invalid AuraClientConfig
    - `aura-event.arbitrary.ts`: generator for valid AuraEvent values
    - `prescription.arbitrary.ts`: generator for valid/invalid UIPrescription values (with configurable expiry, contextLock, manifestVersion)
    - `consent.arbitrary.ts`: generator for valid ConsentProfile and patches
    - All generators produce values conforming to @aura/protocol schemas
    - _Requirements: 1.2, 3.3, 5.12, 7.2_

  - [ ]* 9.2 Write property test for schema validation rejects invalid payloads (Property 3)
    - **Property 3: Schema validation rejects invalid payloads**
    - **Validates: Requirements 3.3, 4.4, 6.2, 7.2, 9.4, 15.1**
    - For any method accepting user data and any input failing its schema, the method rejects with AuraValidationError

  - [ ]* 9.3 Write property test for idempotent init (Property 4)
    - **Property 4: Idempotent init**
    - **Validates: Requirements 2.7, 2.8**
    - For any client in active/degraded, init() resolves immediately without network request or status change

  - [ ]* 9.4 Write property test for init never rejects (Property 5)
    - **Property 5: init never rejects**
    - **Validates: Requirements 2.5, 2.6, 2.9**
    - For any server response condition, init() resolves without rejecting

  - [ ]* 9.5 Write property test for context sequence monotonically increases (Property 9)
    - **Property 9: Context sequence monotonically increases**
    - **Validates: Requirements 4.1, 4.3**
    - For any sequence of updateContext calls, contextSequenceId increases by exactly 1 each time

  - [ ]* 9.6 Write property test for undo/reject removes prescription (Property 14)
    - **Property 14: Undo/reject removes prescription**
    - **Validates: Requirements 6.6**
    - For feedback with action "undo" or "reject", the identified prescription is removed and listeners notified with undefined

  - [ ]* 9.7 Write property test for consent revocation removes affected prescriptions (Property 15)
    - **Property 15: Consent revocation removes affected prescriptions**
    - **Validates: Requirements 7.4**
    - For any DataClass set to false, all prescriptions with that DataClass in explanation.dataClasses are removed

  - [ ]* 9.8 Write property test for consent state updated immediately (Property 16)
    - **Property 16: Consent state updated immediately**
    - **Validates: Requirements 7.5, 7.6**
    - After updateConsent(patch), getConsent() reflects the patch regardless of network success

  - [ ]* 9.9 Write property test for degraded mode guarantees (Property 17)
    - **Property 17: Degraded mode guarantees**
    - **Validates: Requirements 11.1, 11.2, 11.3, 3.2, 6.3, 7.3, 8.5, 9.2, 9.5**
    - For any client in degraded, all methods resolve without throwing and no network requests are made

  - [ ]* 9.10 Write property test for no synchronous exceptions from public methods (Property 18)
    - **Property 18: No synchronous exceptions from public methods**
    - **Validates: Requirements 11.5, 11.8, 10.5**
    - For all SDK states and all public methods, no synchronous exception occurs

  - [ ]* 9.11 Write property test for error handler invocation (Property 19)
    - **Property 19: Error handler invocation**
    - **Validates: Requirements 11.6, 17.2**
    - For any registered onError handler and any runtime error, the handler is invoked with AuraClientError containing code, message, context

  - [ ]* 9.12 Write property test for single-event emission invariant (Property 22)
    - **Property 22: Single-event emission invariant**
    - **Validates: Requirements 3.10, 15.5**
    - For any valid AuraEvent e emitted when active, the outgoing EventsRequest.events array contains exactly one entry equal to e

  - [ ]* 9.13 Write property test for serialization round-trip (Property 23)
    - **Property 23: Serialization round-trip**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**
    - For any valid protocol object, JSON.stringify → schema parse produces deeply equal value

  - [ ]* 9.14 Write property test for ManifestVersion pinning invariant (Property 24)
    - **Property 24: ManifestVersion pinning invariant**
    - **Validates: Requirements 2.11**
    - After init(), manifestVersion equals config.manifest.version or "unversioned" and never changes

  - [ ]* 9.15 Write property test for disconnect prevents subsequent network calls (Property 25)
    - **Property 25: Disconnect prevents subsequent network calls**
    - **Validates: Requirements 10.3, 10.1**
    - After disconnect(), all subsequent method calls initiate no network requests

- [ ] 10. Integration wiring and unit tests for AuraClient
  - [ ] 10.1 Wire the module index — create `src/index.ts` exporting public API
    - Export `createAuraClient` factory function
    - Export `AuraClient` interface type
    - Export `AuraClientConfig`, `AuraClientOptions` types
    - Export error classes: `AuraConfigError`, `AuraValidationError`, `AuraClientError`
    - Export listener type: `PrescriptionListener`
    - Export `AuraLogEntry` type
    - Do NOT export internal modules (EventQueue, PrescriptionStore, SSEManager, HttpTransport, LogBuffer)
    - _Requirements: 1.1, 1.8, 17.1_

  - [ ]* 10.2 Write unit tests for AuraClient lifecycle and state machine
    - Test createAuraClient returns idle client
    - Test init() transitions to active on 200 response
    - Test init() transitions to degraded on 4xx/timeout/unreachable
    - Test idempotent init (active → no-op, degraded → no-op)
    - Test disconnect transitions to degraded, clears SSE, clears store
    - Test disconnect is idempotent and never throws
    - _Requirements: 1.10, 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 10.1, 10.2_

  - [ ]* 10.3 Write unit tests for emit, updateContext, feedback, consent, profile methods
    - Test emit when active sends POST, when idle/degraded enqueues
    - Test emit on network failure re-enqueues event
    - Test updateContext increments sequenceId in all states
    - Test feedback with undo/reject removes from store
    - Test updateConsent revocation removes affected prescriptions
    - Test getConsent reflects immediate update
    - Test explain returns null when degraded, ExplanationRecord when active
    - Test getProfile returns { attributes: [] } when degraded
    - _Requirements: 3.1, 3.2, 3.4, 4.1, 4.3, 6.6, 7.4, 7.5, 8.5, 9.2_

  - [ ]* 10.4 Write unit tests for SSE prescription stream integration
    - Test valid prescription stored and listeners notified
    - Test invalid prescription discarded
    - Test expired prescription discarded
    - Test stale context lock prescription discarded
    - Test manifest version mismatch prescription discarded
    - Test periodic eviction removes expired prescriptions
    - Test reconnection after SSE drop
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.14_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (25 properties total)
- Unit tests validate specific examples, integration points, and edge cases
- The SDK uses TypeScript with Vitest for unit tests and fast-check for property-based tests
- All protocol types and schemas are imported from `@aura/protocol` — no duplicate definitions
- The SDK must remain framework-neutral with zero framework dependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "2.1", "6.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.1", "5.1", "6.2", "6.3", "6.4"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "5.2", "5.4"] },
    { "id": 5, "tasks": ["5.3", "5.5", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "7.7"] },
    { "id": 7, "tasks": ["7.8", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9", "9.10", "9.11", "9.12", "9.13", "9.14", "9.15", "10.1"] },
    { "id": 9, "tasks": ["10.2", "10.3", "10.4"] }
  ]
}
```
