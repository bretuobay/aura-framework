# AURA TypeScript Framework Product Requirements Document

## 1. Overview

AURA is a TypeScript framework for adding governed adaptive user interface behavior to existing web and mobile applications. It implements the architecture described in `aura-paper/02-aura-reference-architecture.md` and the broader source draft `aura-paper/AURA-Reference-Architecture-Paper.md`.

This document is a product requirements document (PRD), not Paper 3 of the research program. The future implementation/prototype paper will use this PRD, the implemented framework, developer documentation, prototype details, and evaluation evidence as source material.

AURA v0 must prove the core adaptive loop:

1. A host application declares adaptable UI capabilities.
2. The host emits consented interaction and context events.
3. AURA updates session/user/context state.
4. Deterministic rules produce candidate adaptations.
5. AURA validates candidates against the manifest, consent, and risk policy.
6. AURA emits bounded UI prescriptions over AUIP.
7. The host application renders adaptations through local component mappings.
8. The user can accept, dismiss, undo, or reject adaptations.
9. Feedback is recorded for observability and future adaptation.

AURA v0 is rules-first, TypeScript-first, React-first, and protocol-first. It must not depend on LLMs, SLMs, autonomous UI generation, or production-grade recommendation infrastructure.

## 2. Product Goals

### 2.1 Goals

- Provide a working TypeScript framework for governed adaptive UI middleware.
- Make AURA installable and understandable for product engineers.
- Preserve the host application as the renderer and final state authority.
- Provide a stable AUIP v0 contract for sessions, events, context, prescriptions, feedback, consent, profile access, and explanations.
- Support a first low-risk adaptive surface using React and a Hono/Node reference server.
- Include enough devtools visibility that developers can inspect why prescriptions were emitted.
- Establish package boundaries that can support later Vue, Angular, Svelte, Solid, React Native, and Flutter adapters.

### 2.2 Non-Goals

- Autonomous UI generation or direct DOM/model-driven rendering.
- Healthcare, finance, education assessment, or regulated high-risk workflow support in v0.
- Production authentication, multi-tenant authorization, billing, or hosted SaaS operations.
- Redis, PostgreSQL, durable queues, or production persistence as required v0 dependencies.
- Real LLM/SLM provider integration as required v0 behavior.
- Full recommender infrastructure.
- WebSocket transport or mobile offline queues in v0.
- Multiple framework adapters in v0 beyond React.
- A polished standalone design tool or full visual studio experience.

## 3. Target Users

### 3.1 Primary Users

- Frontend engineers who want to add bounded adaptive behavior to an existing React product.
- Product engineers evaluating adaptive UI middleware for e-commerce, search, dashboards, or learning-resource surfaces.
- Researchers preparing implementation evidence for the AURA prototype paper.

### 3.2 Secondary Users

- Backend engineers integrating AUIP route handlers and profile/rule storage.
- Designers and UX researchers reviewing adaptive behavior through devtools.
- Future adapter authors for Vue, Angular, Svelte, Solid, React Native, and Flutter.

## 4. Product Scope

### 4.1 v0 Package Scope

AURA v0 must ship the following packages under the `@aura/*` namespace.

| Package | Purpose | v0 status |
|---|---|---|
| `@aura/protocol` | AUIP schemas, shared types, validation contracts, generated client/server types | Required |
| `@aura/sdk` | Transport, session lifecycle, event tracking, prescriptions, consent, profile, explanations, feedback | Required |
| `@aura/react` | React adapter wrapping the SDK with provider and hooks | Required |
| `@aura/server` | Hono/Node middleware helpers and reference AUIP route handlers | Required |
| `@aura/rules` | Deterministic policy/rules DSL, evaluator, fixtures, and test runner | Required |
| `@aura/devtools` | Minimal prescription inspector, event log, consent view, and profile simulator | Required |

### 4.2 Roadmap Package Scope

The PRD must reserve package boundaries for future adapters and integrations, but these are not v0 implementation requirements.

| Package | Purpose | Planned stage |
|---|---|---|
| `@aura/vue` | Vue composition API bindings | Post-v0 |
| `@aura/angular` | Angular module, services, and directives | Post-v0 |
| `@aura/svelte` | Svelte store bindings | Post-v0 |
| `@aura/solid` | Solid signal bindings | Post-v0 |
| `@aura/react-native` | React Native adapter with mobile lifecycle support | Post-v0 |
| `@aura/flutter-bridge` | Flutter bridge package | Post-v0 |
| Model provider packages | Optional SLM/LLM integrations | Post-v0 |

## 5. Core Concepts

### 5.1 Host Application Boundary

AURA must never own rendering. The host application owns:

- component rendering;
- routing;
- authorization;
- business rules;
- accessibility implementation;
- final application state;
- whether a valid prescription can be applied at a given moment.

AURA owns:

- consented event and context ingestion;
- session/user/context state;
- rules evaluation;
- candidate prescription generation;
- validation against manifest, consent, and policy;
- prescription delivery;
- feedback capture;
- explanation and devtools records.

### 5.2 Capability Manifest

The capability manifest declares the bounded UI action space available to AURA. It must support:

- surfaces;
- slots;
- components;
- variants;
- adaptable props;
- risk classes;
- consent requirements;
- reversibility requirements;
- optional manifest version.

AURA must reject prescriptions that reference undeclared surfaces, slots, components, variants, or prop patches.

### 5.3 UI Prescription

A UI prescription is a typed recommendation to adapt the host UI. AURA v0 must support these adaptation types:

- `rank`;
- `componentVariant`;
- `layout`;
- `content`;
- `accessibility`;
- `filter`.

Each prescription must include:

- stable prescription ID;
- surface ID;
- manifest version or session manifest identifier;
- latency class;
- mode;
- adaptation list;
- expiry;
- reversibility flag;
- user-confirmation requirement;
- explanation metadata;
- audit metadata.

### 5.4 Risk Classes

AURA v0 must implement the following risk classes:

| Risk class | v0 behavior |
|---|---|
| `low` | May auto-apply if manifest and consent allow; passive explanation and undo required |
| `medium` | Must expose visible explanation and easy undo; auto-apply only when manifest explicitly permits |
| `high` | Must use `askUser` or `observeOnly`; no autonomous application in v0 |
| `critical` | Must be blocked in v0 except as `observeOnly` diagnostics |

### 5.5 Consent

Consent must be scoped by data class. v0 must support at least:

- `behavior`;
- `personalization`;
- `accessibility`;
- `location`;
- `sensitiveInference`;
- `cloudModelUse`;
- `aggregation`;
- `retention`.

If consent is missing or revoked, AURA must stop collecting or using the affected data class and must not emit dependent prescriptions.

## 6. Package Requirements

### 6.1 `@aura/protocol`

`@aura/protocol` is the source of truth for AUIP v0 types and schemas. It must be usable by browser SDKs, React bindings, server route handlers, tests, and devtools.

Required exports:

- `CapabilityManifest`;
- `ManifestSurface`;
- `ManifestComponent`;
- `AuraEvent`;
- `ContextModel`;
- `ConsentProfile`;
- `UIPrescription`;
- `Adaptation`;
- `ExplanationRecord`;
- `ProfileAttribute`;
- `FeedbackEvent`;
- `RiskClass`;
- `PrescriptionMode`;
- AUIP request and response schemas.

Validation requirements:

- validate manifest shape;
- validate event payload envelope;
- validate context envelope;
- validate prescription shape;
- validate feedback envelope;
- validate consent updates;
- validate profile correction payloads.

The package may use Zod or another TypeScript-friendly schema library, but schemas must support type inference and runtime validation.

### 6.2 `@aura/sdk`

`@aura/sdk` is the framework-neutral client SDK for browser environments.

Required API:

```typescript
const aura = createAuraClient({
  endpoint,
  manifest,
  userId,
  consentProfile,
  context
});
```

Required methods:

- `init()`;
- `emit(event)`;
- `updateContext(contextPatch)`;
- `feedback(feedbackEvent)`;
- `explain(prescriptionId)`;
- `updateConsent(consentPatch)`;
- `getProfile()`;
- `correctProfile(correction)`;
- `disconnect()`.

Required behavior:

- POST session initialization to `/aura/session`.
- POST events to `/aura/events`.
- POST context updates to `/aura/context`.
- Subscribe to `/aura/prescriptions/stream` using SSE.
- POST feedback to `/aura/feedback`.
- Fetch explanations, profile summaries, and profile corrections.
- Queue events only in memory during short network interruptions.
- Drop expired prescriptions.
- No-op gracefully when AURA is unavailable.
- Never block host rendering.

### 6.3 `@aura/react`

`@aura/react` wraps `@aura/sdk` for React applications without taking over rendering.

Required exports:

- `AuraProvider`;
- `useAura`;
- `useAuraEmit`;
- `usePrescription`;
- `useAuraFeedback`.

Required behavior:

- initialize the SDK when `AuraProvider` mounts;
- expose SDK status and errors without throwing render-blocking exceptions;
- provide prescriptions by `surfaceId`;
- expose emit and feedback helpers;
- allow host components to ignore or reject prescriptions;
- support default rendering when no prescription exists.

### 6.4 `@aura/server`

`@aura/server` provides Hono/Node helpers for implementing AUIP v0.

Required capabilities:

- register AUIP routes;
- validate incoming request bodies with `@aura/protocol`;
- store session manifests in memory;
- store session/user/context state in memory;
- expose SSE prescription streams;
- receive events and pass them to the rules pipeline;
- emit validated prescriptions;
- record feedback;
- expose explanation, consent, profile, and correction endpoints.

The package must expose storage interfaces so in-memory state can later be replaced by Redis, PostgreSQL, durable objects, or another persistence layer.

### 6.5 `@aura/rules`

`@aura/rules` provides deterministic adaptation logic for v0.

Required capabilities:

- define rules in JSON or TypeScript;
- match rules against event, context, profile, manifest, and consent inputs;
- produce candidate prescriptions;
- validate candidate prescriptions through `@aura/protocol`;
- support rule priority;
- support risk-class checks;
- support fixture-based rule tests;
- provide a CLI or programmatic test runner.

v0 rules must be sufficient for the demo surface, including:

- filter highlighting after search intent;
- product-card variant change for comparison intent;
- passive explanation generation from structured rule metadata;
- undo/reject feedback recording.

### 6.6 `@aura/devtools`

`@aura/devtools` provides minimal inspectability for adaptive behavior.

Required v0 views:

- session summary;
- manifest summary;
- event log;
- prescription log;
- consent state;
- profile attributes;
- rule matches;
- feedback history.

Required simulation tools:

- edit consent state locally;
- simulate a profile attribute;
- replay a fixture event;
- inspect why a prescription was accepted, rejected, or dropped.

The devtools may be a local web route, embeddable panel, or lightweight React component. It does not need to be a polished standalone product in v0.

## 7. AUIP v0 Requirements

AUIP v0 must expose these endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/aura/session` | `POST` | Start session, send manifest, declare consent, provide initial context |
| `/aura/events` | `POST` | Emit batched interaction, behavioral, task, feedback, and domain events |
| `/aura/context` | `POST` | Push updated device, environment, or domain context |
| `/aura/prescriptions/stream` | `GET` | Subscribe to prescriptions using SSE |
| `/aura/feedback` | `POST` | Send accept, dismiss, override, undo, reject, or error feedback |
| `/aura/explain/:id` | `GET` | Fetch explanation for a prescription |
| `/aura/consent` | `POST` | Update collection, inference, retention, and model-use permissions |
| `/aura/profile` | `GET` | Fetch user-visible adaptive profile summary |
| `/aura/profile/correction` | `POST` | Correct or remove inferred profile attributes |

Transport requirements:

- HTTP + JSON for request/response endpoints.
- SSE for prescription delivery.
- No required WebSocket support in v0.
- No required GraphQL support in v0.
- Prescriptions must include expiry and must not replay after expiry.

## 8. Demo Product Requirements

The v0 reference demo must be an e-commerce search/results surface.

Required demo behavior:

- User submits a search query.
- Host emits `search.submitted`.
- AURA evaluates deterministic rules.
- AURA emits a low-risk prescription.
- React host UI applies the prescription locally.
- User can undo or reject the adaptation.
- Devtools shows the event, rule match, prescription, consent state, and feedback.

Required demo adaptations:

- highlight relevant filters, such as weight or battery for a travel laptop query;
- switch product-card variant between `standard`, `compact`, and `comparison`;
- show passive explanation metadata;
- preserve host default rendering when AURA is unavailable.

## 9. Failure and Degradation Requirements

AURA must be progressive enhancement. Failure must not break the host app.

Required failure behavior:

| Failure mode | v0 behavior |
|---|---|
| AURA unavailable | SDK enters no-op/degraded state; host renders defaults |
| Invalid prescription | Drop prescription, log validation failure, keep current UI |
| Manifest mismatch | Reject prescription and request session refresh |
| Consent revoked | Stop affected collection/use and cancel dependent prescriptions |
| SSE interruption | Reconnect where possible; do not replay expired prescriptions |
| Rule error | Log error, emit no prescription, keep host defaults |
| Conflicting app state | Host rejects prescription and reports feedback |
| Profile correction | Update visible profile state and stop using corrected inferred value |

## 10. Milestones

### Milestone 1: Protocol and Types

- Implement `@aura/protocol`.
- Define AUIP v0 schemas and inferred TypeScript types.
- Add validation tests for manifests, events, prescriptions, feedback, consent, and profile correction.

### Milestone 2: Server and Rules Core

- Implement `@aura/server` with Hono route helpers and in-memory stores.
- Implement `@aura/rules` with deterministic evaluator and fixture test runner.
- Connect event ingestion to rule evaluation and prescription validation.

### Milestone 3: SDK and React Adapter

- Implement `@aura/sdk` client lifecycle, HTTP calls, SSE stream, feedback, consent, profile, and explanation methods.
- Implement `@aura/react` provider and hooks.
- Verify graceful fallback when the server is unavailable.

### Milestone 4: Devtools and Demo

- Implement minimal `@aura/devtools`.
- Build the e-commerce search/results demo.
- Show event-to-prescription-to-feedback flow in devtools.

### Milestone 5: PRD Acceptance Package

- Add README-level developer setup instructions.
- Add fixture examples for manifest, rules, events, and prescriptions.
- Add test coverage for acceptance scenarios.
- Document roadmap packages and non-goals.

## 11. Acceptance Criteria

AURA v0 is acceptable when:

- A developer can install the protocol, SDK, React adapter, server helpers, rules package, and devtools.
- A React app can initialize AURA with a manifest, user ID, consent profile, and context.
- The app can emit a `search.submitted` event.
- The Hono server can receive the event, update in-memory state, evaluate a deterministic rule, validate a prescription, and stream it over SSE.
- The React app can receive the prescription and apply it through local component props.
- The user can undo or reject the prescription.
- Feedback appears in server state and devtools.
- Invalid prescriptions are dropped.
- Revoked consent prevents dependent prescriptions.
- Host defaults render when AURA is offline.

## 12. Test Requirements

### 12.1 Unit Tests

- Protocol schema validation.
- Manifest validation.
- Prescription validation.
- Consent gating.
- Risk-class enforcement.
- Rule matching and prioritization.
- Profile attribute update, expiry, correction, and visibility.

### 12.2 Integration Tests

- `/aura/session` accepts valid manifest/session input.
- `/aura/events` accepts batched events and triggers rule evaluation.
- `/aura/prescriptions/stream` receives validated prescriptions.
- `/aura/feedback` records undo, reject, dismiss, and accept actions.
- `/aura/consent` revokes consent and prevents dependent prescriptions.
- `/aura/profile/correction` updates inferred attributes.

### 12.3 React Tests

- `AuraProvider` initializes SDK state.
- `useAuraEmit` emits events.
- `usePrescription(surfaceId)` receives prescriptions.
- Host components can ignore, undo, or reject prescriptions.
- UI renders defaults when no prescription exists or SDK is degraded.

### 12.4 Demo Acceptance Test

- Submit a search query.
- Receive a valid low-risk prescription.
- Apply filter highlighting or card variant change.
- Undo/reject the adaptation.
- Confirm devtools displays the event, rule match, prescription, and feedback.

## 13. Documentation Requirements

The implementation must include developer documentation for:

- package installation;
- basic React integration;
- manifest definition;
- event emission;
- rule authoring;
- server setup with Hono;
- prescription handling;
- feedback and undo;
- consent updates;
- devtools usage;
- v0 limitations and roadmap.

## 14. Roadmap

### Post-v0

- Vue adapter.
- Svelte adapter.
- React Native adapter.
- WebSocket transport.
- Redis or durable storage adapter.
- Richer devtools replay.
- Optional SLM/LLM provider interface.

### Later

- Angular and Solid adapters.
- Flutter bridge.
- Mobile offline queues.
- Domain policy packs.
- Production audit store.
- Hosted service packaging.
- Conformance test suite for AUIP.

## 15. Assumptions

- Package namespace is `@aura/*`.
- React is the only required v0 framework adapter.
- Devtools are minimal but required in v0.
- v0 is rules-first and model-optional.
- The first demo surface is e-commerce search/results.
- The PRD is an implementation document, not the implementation/prototype paper.
- Existing architecture papers remain unchanged.
