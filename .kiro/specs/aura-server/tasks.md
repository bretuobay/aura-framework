# Implementation Plan: @aura/server

## Overview

Implement the `@aura/server` package — a Hono/Node.js middleware providing AUIP v0 route handlers for the AURA adaptive UI framework. The implementation follows a bottom-up approach: package setup → types → storage interfaces and in-memory adapters → core services → route handlers → registration function → property-based tests. Each step builds on prior work and integrates incrementally.

## Tasks

- [ ] 1. Package setup and foundational types
  - [ ] 1.1 Initialize package structure with package.json, tsconfig, tsup config, and vitest config
    - Create `packages/aura-server/package.json` with dependencies (hono ^4.4.0, @aura/protocol workspace:*), peerDependencies (@aura/rules workspace:*), devDependencies (tsup ^8.0.0, typescript ^5.4.0, vitest ^2.0.0, fast-check ^3.19.0)
    - Create `tsconfig.json` targeting ES2022, module NodeNext, strict mode
    - Create `tsup.config.ts` with entry `src/index.ts`, formats cjs + esm, dts generation
    - Create `vitest.config.ts` with TypeScript support
    - Create directory structure: `src/routes/`, `src/services/`, `src/storage/`, `src/storage/memory/`, `src/types/`, `tests/properties/`, `tests/generators/`, `tests/unit/`, `tests/integration/`
    - _Requirements: 1.1, 1.4, 1.6_

  - [ ] 1.2 Define internal types and configuration types
    - Create `src/types/internal.types.ts` with `SessionRecord`, `ContextModel`, `ProfileAttribute`, `FeedbackEvent`, `ExplanationRecord`, `UIPrescription`, `CapabilityManifest`, `ConsentProfile`, `AuraEvent`, `RulesPipelineInput` types
    - Create `src/types/config.types.ts` with `AuraServerConfig`, `LatencyBudgetConfig`, `SecurityPolicyConfig`, `IRulesPipeline` interface
    - _Requirements: 1.1, 1.6, 12.1–12.6, 15.1_

  - [ ] 1.3 Define storage interfaces
    - Create `src/storage/interfaces.ts` exporting `ISessionStore`, `IContextStore`, `IUserModelStore`, `IFeedbackStore`, `IExplanationStore`, `IPrescriptionStore` with all method signatures as specified in design
    - _Requirements: 1.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 2. In-memory storage adapters
  - [ ] 2.1 Implement in-memory session store
    - Create `src/storage/memory/session-store.ts` with `createInMemorySessionStore()` factory
    - Implement `create` (throws on duplicate), `get` (returns structuredClone), `update` (throws on missing), `delete`
    - _Requirements: 1.4, 12.1, 12.7, 12.8_

  - [ ] 2.2 Implement in-memory context store
    - Create `src/storage/memory/context-store.ts` with `createInMemoryContextStore()` factory
    - Implement `set` and `get` (returns structuredClone)
    - _Requirements: 1.4, 12.2_

  - [ ] 2.3 Implement in-memory user model store
    - Create `src/storage/memory/user-model-store.ts` with `createInMemoryUserModelStore()` factory
    - Implement `upsertAttribute`, `getAttributes`, `deleteAttribute`, `getAttribute`
    - _Requirements: 1.4, 12.3_

  - [ ] 2.4 Implement in-memory feedback store
    - Create `src/storage/memory/feedback-store.ts` with `createInMemoryFeedbackStore()` factory
    - Implement `record` (append-only, never overwrite), `getByPrescriptionId`
    - _Requirements: 1.4, 12.4_

  - [ ] 2.5 Implement in-memory explanation store
    - Create `src/storage/memory/explanation-store.ts` with `createInMemoryExplanationStore()` factory
    - Implement `store` and `get`
    - _Requirements: 1.4, 12.5_

  - [ ] 2.6 Implement in-memory prescription store
    - Create `src/storage/memory/prescription-store.ts` with `createInMemoryPrescriptionStore()` factory
    - Implement `store`, `get`, and `listActive` (filters by `expiresAt > asOf`)
    - _Requirements: 1.4, 12.6, 16.1, 16.3, 16.4_

  - [ ]* 2.7 Write property test for storage round-trip
    - **Property 17: Storage Interface Round-Trip**
    - **Validates: Requirements 12.7, 12.8, 17.12**

- [ ] 3. Core services — CapabilityRegistry and ConsentEnforcer
  - [ ] 3.1 Implement CapabilityRegistry service
    - Create `src/services/capability-registry.ts` implementing `ICapabilityRegistry`
    - Implement `register` (stores manifest per sessionId), `validate` (checks surface IDs, component IDs, variants, props, manifest version), `getManifestVersion`, `remove`
    - Return `CapabilityValidationResult` with typed errors
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ] 3.2 Implement ConsentEnforcer service
    - Create `src/services/consent-enforcer.ts` implementing `IConsentEnforcer`
    - Implement `filterEvents` (strips fields whose dataClass is revoked), `isPrescriptionPermitted` (checks audit.dataClassesUsed against consent), `filterProfileAttributes` (excludes revoked/expired), `filterPipelineAttributes`
    - _Requirements: 8.4, 8.5, 8.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ]* 3.3 Write property test for consent enforcement invariant
    - **Property 5: Consent Enforcement Invariant**
    - **Validates: Requirements 8.7, 13.3, 13.6, 17.3**

- [ ] 4. Core services — StreamRegistry, PrescriptionEmitter, SecurityAuditor
  - [ ] 4.1 Implement StreamRegistry service
    - Create `src/services/stream-registry.ts` implementing `IStreamRegistry`
    - Implement `register`, `remove`, `removeAll`, `broadcast` (writes SSE event to all connections for session), `connectionCount`
    - _Requirements: 5.1, 5.3, 5.4, 5.8_

  - [ ] 4.2 Implement PrescriptionEmitter service
    - Create `src/services/prescription-emitter.ts` implementing `IPrescriptionEmitter`
    - Implement multi-gate validation: schema → capability → consent → context-lock → expiry → latency budget
    - On pass: store prescription, store explanation, broadcast via StreamRegistry
    - On fail: return structured `EmitResult` with `RejectionReason`
    - Handle atomic rejection and independent `adaptationGroups`
    - _Requirements: 3.4, 3.8, 3.9, 5.3, 5.7, 11.5, 11.10, 11.11, 14.2, 14.3, 15.8, 15.9, 16.2_

  - [ ] 4.3 Implement SecurityAuditor service
    - Create `src/services/security-auditor.ts` implementing `ISecurityAuditor`
    - Implement `scanForInjection` (pattern matching against configurable regexes), `detectReplay` (window-based duplicate detection), `isCorrectionEligible`, `record`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ]* 4.4 Write property tests for prescription emission gates
    - **Property 6: Invalid Prescription Exclusion**
    - **Property 7: Undeclared Capability Exclusion**
    - **Property 8: Expired Prescription Exclusion**
    - **Property 9: Stale Context Exclusion**
    - **Property 18: Manifest Version Pinning**
    - **Property 19: Atomic Prescription Validation**
    - **Validates: Requirements 3.8, 3.9, 5.7, 11.1–11.6, 14.2, 16.2, 17.4, 17.5, 17.6, 17.13, 17.14**

- [ ] 5. Checkpoint — Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Route handlers — Session, Context, Stream
  - [ ] 6.1 Implement POST /aura/session route handler
    - Create `src/routes/session.ts` with `createSessionHandler(deps)` factory
    - Validate body via @aura/protocol SessionRequestSchema
    - Create SessionRecord, register manifest in CapabilityRegistry, store context and consent
    - Return 200 with SessionResponseSchema on success; 400/409/422 on failures
    - Handle unversioned manifest (store as "unversioned")
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ] 6.2 Implement POST /aura/context route handler
    - Create `src/routes/context.ts` with `createContextHandler(deps)` factory
    - Validate body via ContextRequestSchema
    - Merge contextPatch into stored ContextModel, enforce monotonic contextSequenceId
    - Return 200 with ContextResponseSchema; 400/404 on failures; handle stale sequence gracefully
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 6.3 Implement GET /aura/prescriptions/stream route handler
    - Create `src/routes/stream.ts` with `createStreamHandler(deps)` factory
    - Set SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache)
    - Register connection in StreamRegistry, handle client disconnect cleanup
    - Include prescription id as SSE `id:` field
    - Handle Last-Event-ID on reconnect (skip expired/stale prescriptions)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 6.4 Write property tests for session and context
    - **Property 1: Session Initialization Round-Trip**
    - **Property 2: Context Merge Correctness**
    - **Property 3: Context Patch Confluence**
    - **Property 4: Context Sequence Monotonicity**
    - **Validates: Requirements 2.6, 2.7, 4.4, 4.5, 4.6, 4.7, 4.8, 17.1, 17.2**

- [ ] 7. Route handlers — Events (critical path)
  - [ ] 7.1 Implement POST /aura/events route handler
    - Create `src/routes/events.ts` with `createEventsHandler(deps)` factory
    - Validate body via EventsRequestSchema, look up session
    - Filter events through ConsentEnforcer, scan via SecurityAuditor
    - Build RulesPipelineInput with current context, consent, profile attributes, manifest
    - Invoke pipeline with configurable timeout, handle pipeline errors gracefully (return 200)
    - Pass candidates to PrescriptionEmitter, return processed/emitted counts
    - Accept minimum vocabulary events and domain events
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 14.1, 14.7, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10_

  - [ ]* 7.2 Write property tests for event processing
    - **Property 15: Event Count Invariant Under Consent Filtering**
    - **Property 16: Rules Pipeline Consent Consistency**
    - **Validates: Requirements 3.7, 15.3, 15.5, 17.11**

- [ ] 8. Route handlers — Feedback, Explain, Consent, Profile, Correction
  - [ ] 8.1 Implement POST /aura/feedback route handler
    - Create `src/routes/feedback.ts` with `createFeedbackHandler(deps)` factory
    - Validate body via FeedbackRequestSchema, look up session
    - Store FeedbackEvent in FeedbackStore (append-only), return 200
    - Accept all 6 action types: accept, dismiss, override, undo, reject, error
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 8.2 Implement GET /aura/explain/:id route handler
    - Create `src/routes/explain.ts` with `createExplainHandler(deps)` factory
    - Look up ExplanationRecord by prescription ID
    - Validate session ownership (403 on mismatch), return 200 with record or 404
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 8.3 Implement POST /aura/consent route handler
    - Create `src/routes/consent.ts` with `createConsentHandler(deps)` factory
    - Validate body via ConsentRequestSchema, look up session
    - Merge consentPatch into stored ConsentProfile
    - Cascade revocation: expire affected ProfileAttributes, cancel in-flight prescriptions
    - Resume collection when previously revoked class is re-granted
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ] 8.4 Implement GET /aura/profile route handler
    - Create `src/routes/profile.ts` with `createProfileHandler(deps)` factory
    - Look up session, retrieve ProfileAttributes from UserModelStore
    - Filter by consent (exclude revoked dataClass), exclude expired, exclude non-visible
    - Return 200 with filtered array or empty array
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 8.5 Implement POST /aura/profile/correction route handler
    - Create `src/routes/correction.ts` with `createCorrectionHandler(deps)` factory
    - Validate body via ProfileCorrectionRequestSchema, look up session
    - For `action: "remove"`: delete attribute from UserModelStore
    - For `action: "correct"`: update value, set provenance to "explicit", confidence to 1.0
    - Check correction eligibility via SecurityAuditor (403 if denied)
    - Return 404 for missing attributes
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 19.3_

  - [ ]* 8.6 Write property tests for feedback, profile, and consent
    - **Property 10: Feedback Round-Trip Storage**
    - **Property 11: Profile Correction Round-Trip**
    - **Property 12: Profile Removal Invariant**
    - **Property 13: Consent-Gated Profile Visibility**
    - **Property 14: Consent Merge Correctness**
    - **Validates: Requirements 6.5, 6.6, 8.1, 8.6, 9.1, 9.3, 9.4, 10.5, 10.7, 10.4, 10.8, 13.5, 17.7, 17.8, 17.9, 17.10**

- [ ] 9. Checkpoint — All route handlers complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Route registration, barrel exports, and error handling
  - [ ] 10.1 Implement registerAuipRoutes function and config resolver
    - Create `src/config.ts` with config defaulting logic (default in-memory stores, default latency budgets, default replay window)
    - Create `src/register.ts` with `registerAuipRoutes(app, config)` — instantiates services, mounts all 9 routes under `/aura` prefix
    - Wire all dependencies: stores → services → route handlers
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 14.6, 14.8, 18.6_

  - [ ] 10.2 Create barrel export index.ts
    - Create `src/index.ts` exporting `registerAuipRoutes`, all storage interfaces, all in-memory factory functions, `IRulesPipeline`, config types
    - _Requirements: 1.1, 1.4, 1.6_

  - [ ]* 10.3 Write property test for error response shape consistency
    - **Property 20: Validation Error Response Shape Consistency**
    - **Validates: Requirements 18.1, 18.4, 18.7**

  - [ ]* 10.4 Write property test for manifest immutability
    - **Property 21: Manifest Immutability**
    - **Validates: Requirements 2.8**

- [ ] 11. Test generators and integration tests
  - [ ] 11.1 Create fast-check generators for all domain types
    - Create `tests/generators/session.gen.ts`, `events.gen.ts`, `context.gen.ts`, `consent.gen.ts`, `prescriptions.gen.ts`, `feedback.gen.ts`, `profile.gen.ts`, `manifest.gen.ts`
    - Each generator produces valid and deliberately invalid instances for property testing
    - _Requirements: 17.1–17.14_

  - [ ]* 11.2 Write integration tests for full session lifecycle
    - Test complete flow: session init → events → prescriptions → feedback → terminate
    - Test consent revocation mid-session
    - Test context update with stale-sequence rejection
    - Test profile correction followed by profile fetch
    - Test SSE stream subscription with real-time delivery
    - Test error response shapes across all endpoints
    - _Requirements: 1.1, 1.2, 1.3, 2.1–2.10, 3.1–3.12, 5.1–5.9, 8.1–8.8, 14.1–14.8, 18.1–18.7_

- [ ] 12. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (21 total)
- Unit tests validate specific examples and edge cases
- The package depends on `@aura/protocol` for all Zod schemas — types in `internal.types.ts` should re-export or reference protocol types where possible
- All storage adapters use `structuredClone` for isolation
- The `IRulesPipeline` is provided by the caller — no default implementation is bundled

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 3, "tasks": ["2.7", "3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3", "4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["6.4", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 8, "tasks": ["8.6", "10.1", "10.2"] },
    { "id": 9, "tasks": ["10.3", "10.4", "11.1"] },
    { "id": 10, "tasks": ["11.2"] }
  ]
}
```
