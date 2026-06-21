# Requirements Document

## Introduction

`@aura/react` is the React adapter for the AURA TypeScript framework. It wraps `@aura/sdk` for React applications, providing a context provider and five hooks that expose SDK capabilities to React component trees without taking over rendering. It belongs to the implementation/prototype work described as future work in the reference architecture.

The package must initialize and tear down the SDK in alignment with the React component lifecycle, expose all SDK surfaces through idiomatic React APIs, never throw render-blocking exceptions under any SDK state or input condition, and preserve the host application as the sole owner of rendering decisions. Every host component retains the right to ignore, defer, or reject any prescription it receives.

`@aura/react` depends on `@aura/sdk` and `@aura/protocol`. It must not depend on `@aura/server`, `@aura/rules`, or `@aura/devtools`.

---

## Glossary

- **React_Package**: The `@aura/react` npm package. The React adapter for AURA.
- **AuraProvider**: The React context provider exported by `@aura/react`. It owns the `AuraClient` lifecycle and makes SDK state available to all descendant components.
- **AuraContext**: The React context object maintained internally by `AuraProvider`. It holds the `AuraClient` instance, current SDK status, and the most recent SDK error.
- **useAura**: A React hook exported by `@aura/react` that returns the current SDK status and most recent error. Usable by any descendant of `AuraProvider`.
- **useAuraEmit**: A React hook exported by `@aura/react` that returns a stable function for emitting `AuraEvent` objects through the SDK.
- **usePrescription**: A React hook exported by `@aura/react` that accepts a `surfaceId` string and returns the current non-expired and context-current `UIPrescription` for that surface, or `undefined` if none exists.
- **useAuraFeedback**: A React hook exported by `@aura/react` that returns a stable function for submitting `FeedbackEvent` objects through the SDK.
- **AuraClient**: The object returned by `createAuraClient` from `@aura/sdk`. Owned and managed by `AuraProvider`.
- **AuraClientConfig**: The configuration object accepted by `createAuraClient`, containing `endpoint`, `manifest`, `userId`, `consentProfile`, and `context`, as defined in `@aura/sdk`.
- **SdkStatus**: The current lifecycle state of the `AuraClient`, one of `"idle"`, `"active"`, or `"degraded"`, as defined in `@aura/sdk`.
- **UIPrescription**: A bounded adaptation recommendation produced by the AURA server, as defined in `@aura/protocol`.
- **FeedbackEvent**: A feedback signal from the host application, as defined in `@aura/protocol`.
- **AuraEvent**: A typed interaction or behavioral event, as defined in `@aura/protocol`.
- **surfaceId**: A non-empty string identifying a declared UI surface within the host application's `CapabilityManifest`.
- **Degraded_Mode**: The `AuraClient` operating state in which all methods complete without error but perform no network calls, as defined in `@aura/sdk`.
- **PrescriptionStore**: The in-memory per-surface prescription store maintained by `AuraClient`, as defined in `@aura/sdk`.
- **ContextLock**: The temporal validity guard on a `UIPrescription`; stale prescriptions are filtered by `@aura/sdk` before they reach React hooks.
- **LayoutStability**: Optional surface metadata in the host `CapabilityManifest` that host components may read from their own manifest to reserve space, render skeletons, or fall back to default UI.
- **Render_Safety**: The guarantee that no React rendering cycle throws a synchronous exception due to any SDK state, network condition, or prescription content.
- **Stable_Reference**: A function or object reference that is the same JavaScript object identity across multiple re-renders, allowing React `useCallback` / `useMemo` consumers to avoid unnecessary re-renders.
- **Host_Component**: Any React component in the host application tree that consumes `usePrescription`, `useAuraEmit`, or `useAuraFeedback`.
- **AuraProviderProps**: The props accepted by `AuraProvider`, containing all fields required by `AuraClientConfig` plus optional `children`.

---

## Requirements

### Requirement 1: AuraProvider Mounting and SDK Initialization

**User Story:** As a frontend engineer, I want to wrap my application (or a feature subtree) in `AuraProvider` with AURA configuration props, so that the SDK is initialized automatically when the provider mounts and all descendant components have access to SDK state.

#### Acceptance Criteria

1. THE `React_Package` SHALL export an `AuraProvider` React component that accepts all fields of `AuraClientConfig` (`endpoint`, `manifest`, `userId`, `consentProfile`, `context`) as props, plus an optional `children` prop.
2. WHEN `AuraProvider` mounts, THE `React_Package` SHALL call `createAuraClient` from `@aura/sdk` with the supplied configuration props and then call `init()` on the resulting `AuraClient` instance without awaiting `init()` before rendering children.
3. WHEN `AuraProvider` mounts, THE `React_Package` SHALL render its `children` immediately, before `init()` resolves, so that child components are not blocked from rendering during SDK initialization.
4. WHEN `AuraProvider` mounts with a missing or empty `endpoint` prop, THE `React_Package` SHALL catch the synchronous `AuraConfigError` thrown by `createAuraClient`, enter `Degraded_Mode` behavior, and render children without throwing a render-blocking exception.
5. WHEN `AuraProvider` mounts with a missing or empty `userId` prop, THE `React_Package` SHALL catch the synchronous `AuraConfigError` thrown by `createAuraClient`, enter `Degraded_Mode` behavior, and render children without throwing a render-blocking exception.
6. WHEN `AuraProvider` mounts with a `manifest` that fails `CapabilityManifestSchema` validation, THE `React_Package` SHALL catch the synchronous `AuraConfigError` thrown by `createAuraClient`, enter `Degraded_Mode` behavior, and render children without throwing a render-blocking exception.
7. WHEN `init()` completes and the `AuraClient` status transitions to `"active"`, THE `React_Package` SHALL update `AuraContext` so that `useAura().status` reflects `"active"` in all descendant components.
8. WHEN `init()` completes and the `AuraClient` transitions to `"degraded"` status due to a server error, THE `React_Package` SHALL update `AuraContext` so that `useAura().status` reflects `"degraded"` and `useAura().error` reflects the most recent `AuraClientError`, without throwing.
9. FOR ALL valid `AuraClientConfig` values `c` supplied as `AuraProvider` props, `AuraProvider` SHALL pass all config fields to `createAuraClient` without modification (config forwarding invariant).

---

### Requirement 2: AuraProvider Teardown and SDK Disconnection

**User Story:** As a frontend engineer, I want the SDK to be cleanly disconnected when `AuraProvider` unmounts, so that SSE connections, timers, and listeners are released without requiring manual cleanup in host components.

#### Acceptance Criteria

1. WHEN `AuraProvider` unmounts, THE `React_Package` SHALL call `disconnect()` on the `AuraClient` instance exactly once.
2. WHEN `AuraProvider` unmounts while `init()` is still in flight, THE `React_Package` SHALL call `disconnect()` after `init()` resolves or rejects, ensuring no in-flight session request leaves an orphaned `AuraClient`; WHEN `AuraProvider` unmounts and `init()` is not in flight, THE `React_Package` SHALL call `disconnect()` immediately.
3. WHEN `AuraProvider` unmounts, THE `React_Package` SHALL unregister any `onError` handler it registered on the `AuraClient` before calling `disconnect()`.
4. WHEN `AuraProvider` unmounts, THE `React_Package` SHALL cease delivering any further prescription, status, or error state updates to `AuraContext`, so that descendant hooks do not attempt to set React state on unmounted components.
5. WHEN `AuraProvider` re-mounts after a previous unmount (e.g., due to React Strict Mode double-invocation or route navigation), THE `React_Package` SHALL create a new `AuraClient` instance with the current props and call `init()` on the new instance (no reuse of a disconnected client).
6. THE `disconnect()` call during unmount SHALL NOT throw under any condition; if `disconnect()` throws, THE `React_Package` SHALL suppress the exception silently to prevent React error boundary escalation.

---

### Requirement 3: `useAura` — SDK Status and Error Access

**User Story:** As a frontend engineer, I want to call `useAura()` in any descendant component to read the current SDK status and any pending error, so that I can conditionally render loading indicators, fallbacks, or error messages without crashing the component.

#### Acceptance Criteria

1. THE `React_Package` SHALL export a `useAura(): { status: SdkStatus; error: AuraClientError | null }` hook that is callable within any descendant of `AuraProvider`.
2. WHEN `useAura()` is called before `AuraProvider` has initialized the SDK (e.g., before `init()` resolves), THE hook SHALL return `{ status: "idle", error: null }` immediately as a default; it SHALL NOT suspend or wait for the first SDK transition before returning.
3. WHEN the `AuraClient` transitions to `"active"` status, THE `React_Package` SHALL trigger a re-render of all components consuming `useAura()` so that `status` reflects `"active"`.
4. WHEN the `AuraClient` transitions to `"degraded"` status, THE `React_Package` SHALL trigger a re-render of all components consuming `useAura()` so that `status` reflects `"degraded"`.
5. WHEN an `AuraClientError` is emitted by the SDK, THE `React_Package` SHALL update `AuraContext` so that `useAura().error` returns the most recent error; subsequent errors SHALL replace the previous error value.
6. WHEN `useAura()` is called outside of an `AuraProvider` tree, THE hook SHALL return `{ status: "degraded", error: null }` rather than throwing, so that components accidentally used outside a provider do not crash.
7. THE `useAura()` hook SHALL NOT throw under any combination of SDK state, initialization order, or network condition; all error conditions SHALL be communicated through the returned `error` field.
8. WHEN the same component reads `useAura().status` across multiple re-renders without any intervening SDK state change, THE returned `status` value SHALL be referentially equal to the previous value (no unnecessary re-render trigger from status reads).

---

### Requirement 4: `useAuraEmit` — Event Emission Hook

**User Story:** As a frontend engineer, I want to call `useAuraEmit()` to get an event emission function, so that I can send typed interaction events to the AURA server from any component without managing SDK references directly.

#### Acceptance Criteria

1. THE `React_Package` SHALL export a `useAuraEmit(): (event: AuraEvent) => Promise<void>` hook that returns a function for emitting events through the underlying `AuraClient`.
2. WHEN the returned emit function is called with a valid `AuraEvent`, THE `React_Package` SHALL delegate to `auraClient.emit(event)` and return the resulting `Promise<void>`.
3. WHEN the returned emit function is called and the SDK is in `"degraded"` or `"idle"` status, THE `React_Package` SHALL still delegate to `auraClient.emit(event)`; the SDK will enqueue the event per `@aura/sdk` Requirement 3 behavior, and the returned promise SHALL resolve without throwing.
4. WHEN the returned emit function is called with an `event` that fails `AuraEventSchema` validation, THE `React_Package` SHALL propagate the `AuraValidationError` rejection from the SDK to the caller; it SHALL NOT swallow the rejection.
5. THE emit function returned by `useAuraEmit()` SHALL be a `Stable_Reference`: the same function identity SHALL be returned across re-renders of the same component instance unless `AuraProvider` remounts (stable emit reference invariant).
6. WHEN `useAuraEmit()` is called outside of an `AuraProvider` tree, THE hook SHALL return a no-op function that resolves immediately with `undefined`; it SHALL NOT throw.
7. THE `useAuraEmit()` hook itself SHALL NOT throw during the render phase under any condition.

---

### Requirement 5: `usePrescription` — Per-Surface Prescription Access

**User Story:** As a frontend engineer, I want to call `usePrescription(surfaceId)` in a host component to receive the current prescription for a named surface, so that I can apply, ignore, or fall back on the prescription without polling or managing subscriptions manually.

#### Acceptance Criteria

1. THE `React_Package` SHALL export a `usePrescription(surfaceId: string): UIPrescription | undefined` hook that returns the current non-expired and context-current prescription for the given `surfaceId`, or `undefined` if no prescription exists or the SDK is unavailable.
2. WHEN `usePrescription(surfaceId)` is called and no prescription for `surfaceId` exists in the `PrescriptionStore`, THE hook SHALL return `undefined`.
3. WHEN `usePrescription(surfaceId)` is called and a prescription for `surfaceId` exists but its `constraints.expiresAt` is in the past or its `contextLock` is stale according to the SDK, THE hook SHALL return `undefined` (expired or stale prescription is treated as absent).
4. WHEN the SDK delivers a new prescription for `surfaceId` to the `PrescriptionStore`, THE `React_Package` SHALL schedule a re-render of all components consuming `usePrescription(surfaceId)` via React's normal state update and batching mechanism; the re-render timing SHALL follow React's standard batching behavior and SHALL NOT bypass it.
5. WHEN `feedback(feedbackEvent)` is called with `feedbackEvent.action` equal to `"reject"` or `"undo"` and the SDK removes the prescription for `surfaceId` from the `PrescriptionStore`, THE `React_Package` SHALL schedule a re-render so that `usePrescription(surfaceId)` returns `undefined`; the hook MAY also return `undefined` in other situations such as initial SDK load or SDK error transitions.
6. WHEN a component consuming `usePrescription(surfaceId)` unmounts, THE `React_Package` SHALL call the unsubscribe function returned by `auraClient.subscribe(surfaceId, listener)` to release the subscription from the SDK.
7. WHEN `usePrescription(surfaceId)` is called outside of an `AuraProvider` tree, THE hook SHALL return `undefined` rather than throwing.
8. WHEN the SDK is in `"degraded"` status, THE `usePrescription(surfaceId)` hook SHALL return `undefined` for all `surfaceId` values.
9. THE `usePrescription(surfaceId)` hook SHALL NOT throw during the render phase under any condition, including when `surfaceId` is an empty string or the SDK has not yet initialized.
10. FOR ALL distinct `surfaceId` values `s1` and `s2` consumed by independent hook instances, a prescription delivered for `s1` SHALL NOT cause a re-render of any component consuming `usePrescription(s2)` (surface isolation invariant).
11. FOR ALL `surfaceId` values `s`, WHEN a sequence of `n` prescriptions is delivered to surface `s`, the value returned by `usePrescription(s)` after each delivery SHALL equal the most recently delivered non-expired and context-current prescription (latest-wins property).
12. THE `React_Package` SHALL NOT re-admit or render a prescription that `@aura/sdk` rejected for stale context; stale-context behavior is delegated to the SDK and surfaced to React only as absence of a prescription.

---

### Requirement 6: `useAuraFeedback` — Feedback Submission Hook

**User Story:** As a frontend engineer, I want to call `useAuraFeedback()` to get a feedback submission function, so that I can record user accept, dismiss, override, undo, and reject signals from any component without managing SDK references directly.

#### Acceptance Criteria

1. THE `React_Package` SHALL export a `useAuraFeedback(): (feedbackEvent: FeedbackEvent) => Promise<void>` hook that returns a function for submitting feedback through the underlying `AuraClient`.
2. WHEN the returned feedback function is called with a valid `FeedbackEvent`, THE `React_Package` SHALL delegate to `auraClient.feedback(feedbackEvent)` and return the resulting `Promise<void>`.
3. WHEN the returned feedback function is called with a `feedbackEvent` that fails `FeedbackEventSchema` validation, THE `React_Package` SHALL propagate the `AuraValidationError` rejection from the SDK to the caller; it SHALL NOT swallow the rejection.
4. WHEN the returned feedback function is called and the SDK is in `"degraded"` or `"idle"` status, THE `React_Package` SHALL still delegate to `auraClient.feedback(feedbackEvent)`; the SDK will resolve without throwing per `@aura/sdk` Requirement 6 behavior.
5. THE feedback function returned by `useAuraFeedback()` SHALL be a `Stable_Reference`: the same function identity SHALL be returned across re-renders of the same component instance unless `AuraProvider` remounts (stable feedback reference invariant).
6. WHEN `useAuraFeedback()` is called outside of an `AuraProvider` tree, THE hook SHALL return a no-op function that resolves immediately with `undefined`; it SHALL NOT throw.
7. THE `useAuraFeedback()` hook itself SHALL NOT throw during the render phase under any condition.
8. FOR ALL valid `FeedbackEvent` values `f` submitted through the hook's returned function, the `FeedbackEvent` forwarded to `auraClient.feedback` SHALL be structurally equal to `f` (feedback forwarding invariant).

---

### Requirement 7: Render Safety Guarantees

**User Story:** As a frontend engineer, I want the guarantee that no `@aura/react` hook or provider will ever throw a synchronous exception during React rendering, so that AURA behavior is purely progressive enhancement and cannot cause application-level React error boundaries to trigger.

#### Acceptance Criteria

1. THE `React_Package` SHALL ensure that `AuraProvider`, `useAura`, `useAuraEmit`, `usePrescription`, and `useAuraFeedback` never throw synchronous exceptions during the React render phase, regardless of SDK status, network condition, prop values, or prescription content.
2. WHEN the SDK transitions to `"degraded"` status for any reason, THE `React_Package` SHALL continue to render `AuraProvider` children, return sensible defaults from all hooks (`"degraded"` status, `undefined` prescription, no-op functions), and NOT trigger any React error boundary.
3. WHEN the `AuraClient` emits an `AuraClientError`, THE `React_Package` SHALL store it in `AuraContext` and expose it through `useAura().error` WITHOUT re-throwing the error in a render phase or an effect that would propagate to a React error boundary.
4. WHEN `usePrescription(surfaceId)` is called with an empty string `surfaceId`, THE hook SHALL return `undefined` without throwing.
5. WHEN `usePrescription(surfaceId)` is called with a `surfaceId` that is not declared in the host's `CapabilityManifest`, THE hook SHALL return `undefined` without throwing.
6. WHEN `AuraProvider` is nested within another `AuraProvider` (double-nesting), THE inner `AuraProvider` SHALL create and manage its own independent `AuraClient` instance without interfering with the outer provider; both providers SHALL render without throwing.
7. FOR ALL combinations of SDK status values (`"idle"`, `"active"`, `"degraded"`) and hook call orderings, THE `React_Package` SHALL produce defined, non-throwing return values from all exported hooks (total render safety property).

---

### Requirement 8: Prescription Delivery and Default Rendering

**User Story:** As a frontend engineer, I want host components to receive prescriptions when available and seamlessly fall back to their own default rendering when no prescription exists or the SDK is unavailable, so that AURA is always progressive enhancement.

#### Acceptance Criteria

1. WHEN `usePrescription(surfaceId)` returns `undefined`, THE host component MAY render its own default UI; THE `React_Package` SHALL NOT impose any rendering or fallback behavior on the host component when no prescription is present (default rendering is the host component's option, not a requirement).
2. WHEN `usePrescription(surfaceId)` returns a `UIPrescription`, THE host component SHALL either apply it or explicitly ignore it; THE `React_Package` SHALL NOT enforce which choice the host makes, but the host component SHALL reach a definitive rendering decision (apply or ignore) rather than remaining in an undecided intermediate state across renders.
3. WHEN a host component chooses to ignore a prescription (does not apply it and does not call feedback), THE `React_Package` SHALL NOT remove the prescription from the `PrescriptionStore`, escalate an error, or change SDK status as a result of the host's inaction.
4. WHEN a host component calls the `useAuraFeedback` function with `action: "reject"` for a prescription, THE `React_Package` SHALL delegate to the SDK, which will remove the prescription from the `PrescriptionStore` and notify the `usePrescription` hook to re-render with `undefined`.
5. WHEN `AuraProvider` children are rendered and the SDK is in `"idle"` status (before `init()` resolves), ALL `usePrescription` hooks SHALL return `undefined` and ALL host components SHALL render their default UI without blocking.
6. WHEN the SDK enters `"degraded"` status after having previously delivered prescriptions, THE `React_Package` SHALL clear all prescription subscriptions and cause all `usePrescription` hooks to return `undefined`, allowing host components to revert to default rendering.
7. THE `React_Package` SHALL NOT render any default fallback UI, loading spinner, or overlay on behalf of host components; all fallback rendering decisions SHALL remain with the host component.
8. WHEN a surface declares `layoutStability` in the host `CapabilityManifest`, THE `React_Package` SHALL NOT impose skeletons, reserved space, or fallback UI; host components remain responsible for interpreting those manifest constraints while `@aura/react` only delivers current prescriptions.

---

### Requirement 9: Hook Isolation and Subscription Management

**User Story:** As a frontend engineer building a component tree with multiple adaptive surfaces, I want each `usePrescription` hook instance to be independently subscribed and isolated, so that prescription updates for one surface do not cause unnecessary re-renders of components on other surfaces.

#### Acceptance Criteria

1. WHEN multiple components each call `usePrescription` with different `surfaceId` values, THE `React_Package` SHALL create an independent SDK subscription per hook instance so that each subscription tracks only its declared surface.
2. WHEN a prescription arrives for `surfaceId` `s1`, THE `React_Package` SHALL only re-render components that have an active `usePrescription(s1)` call; components with `usePrescription(s2)` where `s2 !== s1` SHALL NOT be re-rendered (surface isolation invariant).
3. WHEN a component that called `usePrescription(surfaceId)` unmounts, THE `React_Package` SHALL call the SDK unsubscribe function for that specific subscription within the same React effect cleanup pass; other subscriptions for the same `surfaceId` from other mounted components SHALL remain active.
4. WHEN `usePrescription(surfaceId)` is called multiple times in the same component, THE `React_Package` SHALL register only one SDK subscription per component instance per `surfaceId`.
5. WHEN `AuraProvider` unmounts, THE `React_Package` SHALL cancel all active `usePrescription` subscriptions before calling `disconnect()` so that no subscription callback fires after the provider is gone.
6. WHEN `surfaceId` passed to `usePrescription` changes between renders of the same component, THE `React_Package` SHALL unsubscribe from the previous `surfaceId` and subscribe to the new `surfaceId` within the same React effect update cycle; the previous subscription SHALL NOT remain active after the effect cleanup runs.

---

### Requirement 10: Context Propagation and Dependency Injection

**User Story:** As a frontend engineer, I want `AuraProvider` to propagate the `AuraClient` instance and SDK state through React context, so that all hooks can access a consistent shared client without prop-drilling.

#### Acceptance Criteria

1. THE `React_Package` SHALL use a React context (`AuraContext`) to propagate the `AuraClient` instance, current `SdkStatus`, and most recent `AuraClientError | null` to all descendant components.
2. THE `React_Package` SHALL NOT expose the raw `AuraClient` instance through any public hook; hooks SHALL only expose the operations and data values defined in their contracts (`useAura`, `useAuraEmit`, `usePrescription`, `useAuraFeedback`).
3. WHEN the `SdkStatus` in `AuraContext` changes, THE `React_Package` SHALL trigger a re-render of all components consuming `useAura()`; components consuming only `useAuraEmit()` or `useAuraFeedback()` SHALL NOT re-render solely due to status changes (minimal re-render guarantee).
4. WHEN `AuraProvider` is used in a React Strict Mode tree and React invokes the provider's effect setup and cleanup twice, THE `React_Package` SHALL correctly initialize a single active `AuraClient` instance; IF React's cleanup timing does not guarantee the first instance is disconnected before the second setup runs, multiple instances MAY temporarily coexist, but only one SHALL be active and connected at any given time after the double-invocation completes.
5. THE `React_Package` SHALL NOT rely on React legacy context (`React.createContext` with `contextType`) or any deprecated React API; it SHALL use the `useContext` hook and `React.createContext` API.

---

### Requirement 11: Package Boundary and Dependency Constraints

**User Story:** As an architect maintaining the AURA monorepo, I want `@aura/react` to depend only on `@aura/sdk`, `@aura/protocol`, and React, so that the package boundary stays clean and future framework adapters can follow the same pattern.

#### Acceptance Criteria

1. THE `React_Package` SHALL list `react` and `@aura/sdk` as peer dependencies; `@aura/protocol` SHALL be listed as a peer dependency or direct dependency, and SHALL NOT be bundled into `@aura/react`; it SHALL NOT bundle React or `@aura/sdk`.
2. THE `React_Package` SHALL NOT import from `@aura/server`, `@aura/rules`, or `@aura/devtools`; a static import graph analysis SHALL find no imports of those packages within `@aura/react` source files.
3. THE `React_Package` SHALL NOT import Node.js built-in modules (`fs`, `path`, `http`, `net`, etc.) so that it is bundleable for browser environments without Node.js polyfills.
4. THE `React_Package` SHALL export all public APIs (`AuraProvider`, `useAura`, `useAuraEmit`, `usePrescription`, `useAuraFeedback`) from a single package entry point without requiring consumers to import from sub-paths.
5. THE `React_Package` SHALL re-export the `AuraClientError`, `AuraValidationError`, and `SdkStatus` types from `@aura/sdk` so that consumers of `@aura/react` do not need a direct dependency on `@aura/sdk` for type-only imports.

---

### Requirement 12: Correctness Properties for Property-Based Testing

**User Story:** As a developer writing property-based tests for `@aura/react`, I want well-defined invariants and round-trip properties for the hooks and provider, so that tests can verify correctness across a wide range of inputs without exhaustive case enumeration.

#### Acceptance Criteria

1. FOR ALL valid `AuraClientConfig` values `c` supplied as `AuraProvider` props, the config object received by `createAuraClient` inside the provider SHALL be structurally equal to `c` — no field may be added, removed, or mutated during forwarding (config round-trip property).
2. FOR ALL valid `AuraEvent` values `e` emitted via the `useAuraEmit` hook function, the `AuraEvent` received by `auraClient.emit` SHALL be structurally equal to `e` (emit forwarding property).
3. FOR ALL valid `FeedbackEvent` values `f` submitted via the `useAuraFeedback` hook function, the `FeedbackEvent` received by `auraClient.feedback` SHALL be structurally equal to `f` (feedback forwarding property).
4. FOR ALL `surfaceId` values `s`, WHEN prescriptions `p1`, `p2`, ..., `pn` are delivered sequentially to surface `s`, the value returned by `usePrescription(s)` after delivery `pk` SHALL equal `pk` if `pk` is not expired and not context-stale, or `undefined` if `pk` is expired or stale (latest-wins, expiry, and context-lock correctness property).
5. FOR ALL pairs of distinct `surfaceId` values `s1` and `s2`, a prescription delivery to surface `s1` SHALL NOT change the value returned by `usePrescription(s2)` (surface isolation metamorphic property).
6. FOR ALL SDK status values `status` in `{ "idle", "active", "degraded" }`, calling `useAura()`, `useAuraEmit()`, `usePrescription(s)`, and `useAuraFeedback()` while the SDK is in `status` SHALL return defined, non-throwing values for all exported hooks (total render safety property).
7. FOR ALL re-render triggers that do not change the `AuraProvider` instance (state updates in sibling components, parent re-renders unrelated to AURA), the function reference returned by `useAuraEmit()` SHALL be the same JavaScript object identity as on the previous render (emit stability property).
8. FOR ALL re-render triggers that do not change the `AuraProvider` instance, the function reference returned by `useAuraFeedback()` SHALL be the same JavaScript object identity as on the previous render (feedback stability property).
9. FOR ALL sequences of `n` prescriptions `p1`, ..., `pn` delivered to a `surfaceId` followed by a `FeedbackEvent` with `action: "reject"`, `usePrescription(surfaceId)` SHALL return `undefined` after the reject is processed, regardless of the prescription sequence (reject clears prescription invariant).
10. WHEN `AuraProvider` mounts, initializes the SDK to `"active"`, delivers `k` prescriptions across `k` surfaces, and then unmounts, the count of active SDK subscriptions registered by `@aura/react` SHALL return to zero (no subscription leak after unmount property).

