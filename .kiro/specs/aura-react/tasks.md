# Implementation Plan: @aura/react

## Overview

This plan implements `@aura/react`, the React adapter for the AURA TypeScript framework. The implementation follows a bottom-up approach: project scaffolding first, then internal context, provider component, individual hooks, barrel entry point, and finally property-based and unit tests. All code is TypeScript targeting React 18+/19+.

## Tasks

- [ ] 1. Project scaffolding and build configuration
  - [ ] 1.1 Create package.json with peer dependencies, dev dependencies, and dual CJS/ESM exports
    - Define `name: "@aura/react"`, `version: "0.1.0"`, `type: "module"`
    - Configure `exports`, `main`, `module`, `types` fields for dual output
    - Add peer dependencies: `react ^18.0.0 || ^19.0.0`, `@aura/sdk ^0.1.0`, `@aura/protocol ^0.1.0`
    - Add dev dependencies: `tsup`, `typescript`, `vitest`, `fast-check`, `@testing-library/react`, `react`, `react-dom`
    - _Requirements: 11.1, 11.3_

  - [ ] 1.2 Create tsconfig.json for strict TypeScript with JSX support
    - Set `strict: true`, `jsx: "react-jsx"`, `target: "ES2020"`, `module: "ESNext"`
    - Configure `moduleResolution: "bundler"`, `declaration: true`
    - Set `include: ["src"]` and `outDir: "dist"`
    - _Requirements: 11.3_

  - [ ] 1.3 Create tsup.config.ts for dual CJS/ESM build output
    - Configure entry point `src/index.ts`
    - Set `format: ["cjs", "esm"]`, `dts: true`, `splitting: false`
    - Mark `react`, `@aura/sdk`, `@aura/protocol` as external
    - _Requirements: 11.1_

  - [ ] 1.4 Create vitest.config.ts with React Testing Library and fast-check setup
    - Configure `test.environment: "jsdom"`
    - Set `test.globals: true` for cleaner test syntax
    - Configure `test.include` to cover both `properties/` and `unit/` directories
    - _Requirements: 12.1–12.10_

- [ ] 2. AuraContext internal module
  - [ ] 2.1 Create `src/AuraContext.ts` with context definition and internal type
    - Define `AuraContextValue` interface: `{ client: AuraClient | null; status: SdkStatus; error: AuraClientError | null }`
    - Create `AuraContext` via `React.createContext<AuraContextValue>` with default value `{ client: null, status: "degraded", error: null }`
    - Do NOT export from public API — internal only
    - _Requirements: 10.1, 10.5, 3.6_

- [ ] 3. AuraProvider component
  - [ ] 3.1 Create `src/AuraProvider.tsx` implementing the provider component
    - Accept `AuraProviderProps` (endpoint, manifest, userId, consentProfile, context, children)
    - Use `useRef` for `clientRef`, `initPromiseRef`, `unmountedRef`, `errorUnsubRef`
    - Use `useState<{ status: SdkStatus; error: AuraClientError | null }>` for render-triggering state
    - In mount effect: call `createAuraClient(config)` in try/catch, store in ref, register `onError`, call `init()` (fire-and-forget), update status on resolution
    - In cleanup effect: set unmounted flag, unregister onError, await initPromise if in flight, then call `disconnect()` (wrapped in try/catch to suppress errors)
    - Render children unconditionally wrapped in `AuraContext.Provider`
    - Handle config errors by entering degraded mode (null client, status="degraded", store error)
    - _Requirements: 1.1–1.9, 2.1–2.6, 7.1, 7.6, 10.1, 10.4_

- [ ] 4. Implement hooks
  - [ ] 4.1 Create `src/useAura.ts` — SDK status and error access hook
    - Call `useContext(AuraContext)` to read status and error
    - Return `{ status, error }` directly from context value
    - Outside provider: returns default context value `{ status: "degraded", error: null }`
    - Never throws
    - _Requirements: 3.1–3.8_

  - [ ] 4.2 Create `src/useAuraEmit.ts` — event emission hook
    - Call `useContext(AuraContext)` to get client ref
    - Use `useCallback` with stable dependency (client ref) to create emit function
    - If client is null: return `async () => undefined`
    - If client exists: return `(event) => client.emit(event)`
    - Never throws during render
    - _Requirements: 4.1–4.7_

  - [ ] 4.3 Create `src/usePrescription.ts` — per-surface prescription subscription hook
    - Call `useContext(AuraContext)` to get client
    - Use `useState<UIPrescription | undefined>(undefined)` for local prescription state
    - Use `useEffect` with `[client, surfaceId]` deps to manage subscription lifecycle
    - In effect: if client is null or status is degraded, return undefined
    - Subscribe via `client.subscribe(surfaceId, listener)` where listener sets state
    - Return unsubscribe function from effect cleanup
    - On surfaceId change: cleanup unsubscribes old, effect subscribes new
    - Outside provider: returns `undefined`
    - Never throws
    - _Requirements: 5.1–5.12, 9.1–9.6_

  - [ ] 4.4 Create `src/useAuraFeedback.ts` — feedback submission hook
    - Call `useContext(AuraContext)` to get client ref
    - Use `useCallback` with stable dependency (client ref) to create feedback function
    - If client is null: return `async () => undefined`
    - If client exists: return `(feedbackEvent) => client.feedback(feedbackEvent)`
    - Never throws during render
    - _Requirements: 6.1–6.8_

- [ ] 5. Barrel entry point
  - [ ] 5.1 Create `src/index.ts` with all public re-exports
    - Export `AuraProvider` from `./AuraProvider`
    - Export `useAura` from `./useAura`
    - Export `useAuraEmit` from `./useAuraEmit`
    - Export `usePrescription` from `./usePrescription`
    - Export `useAuraFeedback` from `./useAuraFeedback`
    - Re-export types: `AuraClientError`, `AuraValidationError`, `SdkStatus` from `@aura/sdk`
    - Re-export types: `AuraEvent`, `UIPrescription`, `FeedbackEvent`, `CapabilityManifest`, `ConsentProfile`, `ContextModel` from `@aura/protocol`
    - Do NOT export `AuraContext`
    - _Requirements: 11.4, 11.5, 10.2_

- [ ] 6. Checkpoint — Verify build compiles
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Test arbitraries and shared mocks
  - [ ] 7.1 Create `__tests__/arbitraries/config.arbitrary.ts` with fast-check generators for `AuraClientConfig`
    - Generate `endpoint` (valid URL strings), `manifest` (valid CapabilityManifest), `userId` (non-empty strings), `consentProfile`, `context`
    - _Requirements: 12.1_

  - [ ] 7.2 Create `__tests__/arbitraries/event.arbitrary.ts` with fast-check generators for `AuraEvent`
    - Generate valid event type, surfaceId, payload combinations
    - _Requirements: 12.2_

  - [ ] 7.3 Create `__tests__/arbitraries/prescription.arbitrary.ts` with fast-check generators for `UIPrescription`
    - Generate valid prescription objects with constraints, adaptations, contextLock
    - _Requirements: 12.4, 12.5_

  - [ ] 7.4 Create `__tests__/arbitraries/feedback.arbitrary.ts` with fast-check generators for `FeedbackEvent`
    - Generate valid feedback actions ("accept", "reject", "dismiss", "override", "undo"), surfaceId, metadata
    - _Requirements: 12.3_

- [ ] 8. Property-based tests
  - [ ]* 8.1 Write property test for config forwarding round-trip
    - **Property 1: Config Forwarding Round-Trip**
    - **Validates: Requirements 1.9, 12.1**
    - File: `__tests__/properties/config-forwarding.property.test.ts`
    - For any valid config, verify `createAuraClient` receives structurally equal config

  - [ ]* 8.2 Write property test for emit forwarding
    - **Property 2: Emit Forwarding**
    - **Validates: Requirements 4.2, 12.2**
    - File: `__tests__/properties/emit-forwarding.property.test.ts`
    - For any valid AuraEvent, verify `client.emit` receives structurally equal event

  - [ ]* 8.3 Write property test for feedback forwarding
    - **Property 3: Feedback Forwarding**
    - **Validates: Requirements 6.2, 6.8, 12.3**
    - File: `__tests__/properties/feedback-forwarding.property.test.ts`
    - For any valid FeedbackEvent, verify `client.feedback` receives structurally equal event

  - [ ]* 8.4 Write property test for hook function reference stability
    - **Property 4: Hook Function Reference Stability**
    - **Validates: Requirements 4.5, 6.5, 12.7, 12.8**
    - File: `__tests__/properties/reference-stability.property.test.ts`
    - For any sequence of re-renders, verify emit/feedback function identity is stable

  - [ ]* 8.5 Write property test for surface isolation
    - **Property 5: Surface Isolation**
    - **Validates: Requirements 5.10, 9.1, 9.2, 12.5**
    - File: `__tests__/properties/surface-isolation.property.test.ts`
    - For any two distinct surfaceIds, verify prescription delivery to one does not re-render the other

  - [ ]* 8.6 Write property test for latest-wins prescription delivery
    - **Property 6: Latest-Wins Prescription Delivery**
    - **Validates: Requirements 5.4, 5.11, 12.4**
    - File: `__tests__/properties/latest-wins.property.test.ts`
    - For any sequence of prescriptions delivered to a surface, verify hook returns the most recent

  - [ ]* 8.7 Write property test for reject clears prescription
    - **Property 7: Reject Clears Prescription**
    - **Validates: Requirements 5.5, 12.9**
    - File: `__tests__/properties/reject-clears.property.test.ts`
    - For any prescription sequence followed by undefined delivery, verify hook returns undefined

  - [ ]* 8.8 Write property test for total render safety
    - **Property 8: Total Render Safety**
    - **Validates: Requirements 3.7, 4.7, 5.9, 6.7, 7.1, 7.7, 12.6**
    - File: `__tests__/properties/render-safety.property.test.ts`
    - For all SDK states and surfaceId inputs, verify all hooks return non-throwing values

  - [ ]* 8.9 Write property test for minimal re-render guarantee
    - **Property 9: Minimal Re-Render Guarantee**
    - **Validates: Requirements 10.3**
    - File: `__tests__/properties/minimal-rerender.property.test.ts`
    - For any status transition, verify emit/feedback-only consumers do not re-render

  - [ ]* 8.10 Write property test for no subscription leak after unmount
    - **Property 10: No Subscription Leak After Unmount**
    - **Validates: Requirements 5.6, 9.3, 9.5, 12.10**
    - File: `__tests__/properties/subscription-leak.property.test.ts`
    - For any provider with k subscriptions, verify all are cleaned up on unmount

- [ ] 9. Unit tests
  - [ ]* 9.1 Write unit tests for AuraProvider lifecycle
    - File: `__tests__/unit/AuraProvider.test.tsx`
    - Test mount/unmount/remount, Strict Mode double-invocation, config error handling
    - Test init-in-flight + unmount race condition, onError handler lifecycle
    - _Requirements: 1.1–1.9, 2.1–2.6, 10.4_

  - [ ]* 9.2 Write unit tests for useAura hook
    - File: `__tests__/unit/useAura.test.tsx`
    - Test status transitions (idle→active, idle→degraded), error propagation
    - Test outside-provider behavior, referential stability of status values
    - _Requirements: 3.1–3.8_

  - [ ]* 9.3 Write unit tests for useAuraEmit hook
    - File: `__tests__/unit/useAuraEmit.test.tsx`
    - Test delegation to client.emit, validation error propagation
    - Test no-op behavior outside provider, stable reference across renders
    - _Requirements: 4.1–4.7_

  - [ ]* 9.4 Write unit tests for usePrescription hook
    - File: `__tests__/unit/usePrescription.test.tsx`
    - Test subscription lifecycle, surfaceId change re-subscription, unmount cleanup
    - Test undefined for empty surfaceId, degraded status, outside provider
    - _Requirements: 5.1–5.12, 9.1–9.6_

  - [ ]* 9.5 Write unit tests for useAuraFeedback hook
    - File: `__tests__/unit/useAuraFeedback.test.tsx`
    - Test delegation to client.feedback, validation error propagation
    - Test no-op behavior outside provider, stable reference across renders
    - _Requirements: 6.1–6.8_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific scenarios, edge cases, and lifecycle behavior
- All source files use TypeScript with strict mode
- The `@aura/sdk` module is mocked in tests via `vi.mock()` to provide controllable client behavior
- React Testing Library's `renderHook` is used for isolated hook testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "8.10"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
