# AURA v0: A TypeScript Implementation of Governed Adaptive UI Middleware

## Abstract

This paper reports the implementation of AURA v0 — a TypeScript realisation of the governed adaptive UI middleware architecture described in the AURA Reference Architecture (Paper 2). The implementation comprises six packages under the `@aura/*` namespace: a shared protocol library, a framework-neutral browser SDK, a React integration layer, a Hono-based server, a deterministic rules engine, and a developer inspection panel. Together they deliver the core adaptive loop: a host application declares adaptable surfaces via a capability manifest, emits consented interaction events, and receives bounded UI prescriptions over a Server-Sent Events stream. All adaptation is prescription-based — the host retains full rendering authority. The implementation validates the key architectural decisions from Paper 2: the capability manifest as the primary governance boundary, consent enforcement at the protocol layer, and a rules-first pipeline that proves the adaptive loop without requiring large language model dependencies. This paper documents the package architecture, the AUIP v0 protocol in practice, the rules engine design, integration experience, and a concrete ecommerce demonstration. It reports which Paper 2 decisions were validated without modification, which required refinement in implementation, and identifies seven core framework gaps that constitute the v1 agenda. The gaps are referenced against the ecommerce domain analysis in Paper 4.

## Keywords

Adaptive UI middleware; TypeScript; AUIP protocol; capability manifest; rules engine; governed adaptation; Server-Sent Events; React integration; developer tooling.

## 1. Introduction

Paper 2 of the AURA research programme specified a reference architecture for governed adaptive UI middleware: a system that observes consented user events, reasons over candidate adaptations, validates those candidates against a host-declared capability manifest, and delivers bounded prescriptions without ever owning rendering. The architecture was deliberately specified at the interface level — it described what AURA should do without committing to implementation language, transport protocol, or inference strategy.

This paper reports the TypeScript realisation of that specification as AURA v0. The scope was intentionally constrained: v0 targets React as the only UI framework adapter, Hono/Node as the only server runtime, and a deterministic rules engine as the only inference strategy. There is no dependency on large language models, production-grade recommendation infrastructure, persistent storage beyond in-memory, or cross-session continuity. These constraints reflect the purpose of v0: to validate the core architectural decisions — the capability manifest, the AUIP protocol, consent-scoped data classes, and the prescription-not-replacement principle — through working software before extending to the full pipeline described in Paper 2.

v0 is implemented in TypeScript 5.8 with strict mode enabled throughout. TypeScript strict mode is a deliberate architectural choice: the capability manifest, UI prescriptions, and AUIP message envelopes are declared as typed schemas (using Zod 3.23) from which TypeScript types are inferred. This means the schemas are the single source of truth — types are not written separately, and the same schemas that validate incoming HTTP request bodies also define the TypeScript types used throughout the codebase.

This paper is organised as follows. Section 2 documents the six-package architecture. Section 3 reports the AUIP protocol in practice. Section 4 describes the rules engine. Section 5 documents integration experience. Section 6 describes the ecommerce demonstration. Section 7 assesses what v0 validates about the Paper 2 architecture. Section 8 defines the v1 agenda as seven core framework gaps. Section 9 concludes.

### Research Programme Context

This paper is the third in the AURA research programme:

1. Literature review of adaptive user interfaces in the large language model era.
2. AURA reference architecture for governed adaptive UI middleware.
3. **This paper** — TypeScript implementation and architecture validation.
4. Ecommerce domain application: AI-advisory platforms and AURA's extension model.

Papers 3 and 4 were developed in parallel. Paper 4's domain analysis identified seven core framework gaps; those gaps informed the v1 agenda in Section 8.

## 2. Package Architecture

AURA v0 is structured as a pnpm workspaces monorepo managed by Turborepo. Six packages ship under the `@aura/*` namespace:

```
@aura/protocol  ─── zero runtime dependencies; shared types and Zod schemas
      ↑
@aura/sdk  ───────── browser SDK; depends on protocol only
      ↑
@aura/react  ─────── React hooks and provider; depends on sdk + protocol

@aura/rules  ─────── rules engine; depends on protocol only
      ↑
@aura/server  ────── Hono middleware; depends on protocol + rules

@aura/devtools  ──── inspector panel; depends on protocol only
```

The dependency direction is strict and intentional. `@aura/protocol` is the shared vocabulary — it has no runtime dependencies beyond Zod and can be imported by browser code, server code, and devtools without pulling in framework or server dependencies. `@aura/devtools` depends only on `@aura/protocol`, not on `@aura/server`, which preserves the inspection layer's independence: a future Vue or Svelte devtools integration would not require the server package.

The roadmap packages — `@aura/vue`, `@aura/angular`, `@aura/svelte`, `@aura/solid`, `@aura/react-native`, `@aura/flutter-bridge`, and model provider packages — are not implemented in v0. Their package slots are reserved in the documented roadmap and the dependency structure is designed to admit them: any UI framework adapter depends on `@aura/sdk` and `@aura/protocol`; model provider packages would sit between `@aura/rules` and `@aura/server`, implementing the `IRulesPipeline` interface.

### 2.1 Build Targets

Browser packages (`@aura/sdk`, `@aura/react`, `@aura/devtools`) are bundled with Vite targeting ES2022 with dual ESM/CJS output. Server and utility packages (`@aura/protocol`, `@aura/server`, `@aura/rules`) are built with tsup with dual output. All packages export TypeScript declaration files. The protocol package is the only package that produces a CJS bundle required by server-side consumers.

## 3. AUIP Protocol in Practice

AUIP v0 defines nine HTTP endpoints on the server. The implementation validates that these endpoints are sufficient for the core adaptive loop and identifies two places where the Paper 2 specification required refinement.

### 3.1 The Nine Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/aura/session` | `POST` | Start session; register manifest, consent profile, and initial context |
| `/aura/events` | `POST` | Submit batched interaction, behavioural, and domain events |
| `/aura/context` | `POST` | Push updated device, environment, or application context |
| `/aura/prescriptions/stream` | `GET` | Subscribe to validated prescriptions via SSE |
| `/aura/feedback` | `POST` | Send `accept`, `dismiss`, `override`, `undo`, or `reject` feedback |
| `/aura/explain/:id` | `GET` | Fetch explanation record for a prescription |
| `/aura/consent` | `POST` | Update consent classes (collection, inference, retention, model use) |
| `/aura/profile` | `GET` | Fetch user-visible profile attribute summary |
| `/aura/profile/correction` | `POST` | Correct or remove an inferred profile attribute |

All nine endpoints are implemented in `@aura/server` via Hono 4.4 route handlers, each validated with the corresponding Zod schema from `@aura/protocol`. The server also exposes a tenth endpoint (`GET /aura/devtools/state`) when `registerDevtoolsRoute()` is mounted; this is a development-only inspection endpoint not part of the AUIP v0 specification.

### 3.2 Schema as the Source of Truth

The implementation validates the Paper 2 approach to schema design: Zod schemas defined in `@aura/protocol` serve as the single source of truth for both runtime validation and TypeScript type definitions. The type for any AUIP message is inferred with `z.infer<typeof Schema>` — there is no parallel hand-written type that could drift from the schema:

```typescript
// @aura/protocol — schema is the only definition; type is derived
export const UIPrescriptionSchema = z.object({
  id: NonEmptyString,
  surfaceId: NonEmptyString,
  mode: PrescriptionModeSchema,
  latencyClass: LatencyClassSchema,
  contextLock: ContextLockSchema,
  adaptations: z.array(AdaptationSchema).nonempty(),
  constraints: z.object({ expiresAt: ISOTimestamp }),
  manifestVersion: NonEmptyString,
  audit: z.object({
    dataClassesUsed: z.array(DataClassSchema).optional(),
    policyVersion: NonEmptyString.optional(),
    decisionSource: NonEmptyString.optional(),
  }),
  explanation: z.object({
    confidence: Confidence,
    summary: z.string().optional(),
  }).optional(),
});

export type UIPrescription = z.infer<typeof UIPrescriptionSchema>;
```

This pattern means that when a route handler receives a request body, it calls `Schema.safeParse(body)` and works with the inferred type in the success branch. No casting. No manual field access. The same schema validates the rules engine's output before prescription emission.

### 3.3 Refinements from Paper 2

Implementation surfaced two places where the Paper 2 specification required refinement:

**Explanation metadata structure.** Paper 2 described explanation records at the conceptual level. In implementation, explanation metadata must be attached to rules at authoring time — each rule declares a `summary` template and a `confidence` value. When the prescription is emitted, the server constructs a structured `ExplanationRecord` (stored in `@aura/server`'s explanation store) that separates the user-visible summary from the developer-visible audit fields. This is richer than Paper 2's specification implied; audience-specific explanation formatting requires structured fields on the rule itself, not just on the prescription.

**SSE prescription expiry — client-side enforcement is required.** Paper 2 specified that prescriptions carry an `expiresAt` field and that the server must not re-deliver expired prescriptions on SSE reconnection. In implementation, the server enforces this at emission time (Gate 5 in the prescription emitter). However, the SSE stream is a persistent connection — a prescription delivered before expiry may still be held in the client's subscription state after it expires. The SDK's `PrescriptionStore` must therefore enforce expiry on the client side as well, dropping prescriptions whose `expiresAt` has passed before they are consumed by a React hook. This client-side enforcement was not specified in Paper 2; it is a required addition for correct behaviour.

**Profile correction suppression timing.** Paper 2 stated that when a user corrects an inferred attribute, the system should stop using that attribute. In implementation, the correction must take effect before the next pipeline evaluation cycle — the corrected value cannot be used by rules running in the same request that processed the correction. The server's correction handler updates the user model store synchronously before returning a response, ensuring the next `/aura/events` call uses the corrected state.

## 4. Rules Engine Design

`@aura/rules` implements a deterministic policy evaluation engine. It is the only inference strategy in v0. The pipeline is structured as nine sequential stages, each implemented as a pure function:

```
1.  Condition evaluation    — per-rule, per-rule-isolated; evaluates path expressions 
                              against event, context, profile, and consent inputs
2.  Candidate construction  — assembles a typed CandidatePrescription from rule metadata 
                              and pipeline clock
3.  Feedback suppression    — filters candidates whose ruleId appears in recent rejections
4.  Consent gating          — removes candidates that reference data classes not in the 
                              session's consent profile
5.  Manifest checking       — removes candidates that reference surfaces, slots, 
                              components, or variants not declared in the host manifest
6.  Risk-class enforcement  — applies mode restrictions per risk class 
                              (high → askUser or observeOnly; critical → observeOnly only)
7.  Priority sorting        — sorts survivors by declared rule priority before validation
8.  Protocol validation     — validates each candidate against UIPrescriptionSchema; 
                              drops any that fail
9.  Return UIPrescription[] — caller receives only fully-validated prescriptions
```

### 4.1 Never Throws

The `evaluate()` method on the `RulesPipeline` class is guaranteed never to throw. A top-level `try/catch` returns an empty array on fatal errors. Within the per-rule evaluation loop, individual rules are isolated: a condition that throws does not prevent other rules from being evaluated. This design means that rule authoring errors produce empty prescription sets and logged warnings, not server crashes. The guarantee is:

> If the rules pipeline is invoked, the server always returns a valid HTTP response. Pipeline errors are AURA's internal concern; they are not surfaced as 5xx responses to the host application.

### 4.2 Rule Authoring and the Fixture Runner

Rules are authored as typed TypeScript objects (or loaded from JSON by the `loadRules` utility). A rule declares its conditions, its prescription template, and its priority:

```typescript
import { createRule, createPipeline } from "@aura/rules";

const filterHighlightRule = createRule({
  id: "highlight-filters-on-travel-laptop-search",
  priority: 10,
  conditions: [
    { path: "events[0].type", operator: "equals", expected: "search.submitted" },
    { path: "events[0].payload.query", operator: "contains", expected: "laptop" },
  ],
  prescription: {
    surfaceId: "product-search",
    mode: "autonomous",
    latencyClass: "fast",
    adaptations: [
      { type: "filter", target: "FilterPanel", visibleFilters: ["weight", "battery", "display-size"], reasonCode: "travel-laptop-filters" },
    ],
    audit: { decisionSource: "rules-v0", policyVersion: "1.0" },
  },
});

const pipeline = createPipeline({ rules: [filterHighlightRule] });
```

The fixture runner enables deterministic testing of rules without running a server. A fixture defines an input (events, context, consent profile, manifest, profile attributes) and asserts expected prescriptions:

```typescript
// fixture.json (simplified)
{
  "input": {
    "events": [{ "type": "search.submitted", "payload": { "query": "travel laptop" }, ... }],
    "context": { "page": "search", "locale": "en-US" },
    "consent": { "behavior": true, "personalization": true }
  },
  "expected": [
    { "surfaceId": "product-search", "mode": "autonomous",
      "adaptations": [{ "type": "filter", "target": "FilterPanel" }] }
  ]
}
```

The fixture runner compares actual prescriptions against expected using structural matching: fields declared in `expected` must be present and match; undeclared fields are ignored. This allows fixtures to assert on the parts that matter to the rule author without brittle full-object comparisons.

### 4.3 The CLI

`@aura/rules` ships a CLI (`aura-rules`) that validates rule sets and runs fixtures without a running server:

```bash
# Validate rule set structure
aura-rules validate --rules ./rules/search.rules.ts

# Run fixtures
aura-rules test --rules ./rules/search.rules.ts --fixtures ./fixtures/
```

This enables rule authoring and testing in a development context entirely decoupled from the HTTP server, the React application, or any running infrastructure.

## 5. Developer Integration Experience

The integration sequence for a host application follows four steps:

### Step 1: Server Setup

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import {
  registerAuipRoutes,
  registerDevtoolsRoute,
  createInMemorySessionStore,
  createInMemoryUserModelStore,
  createInMemoryFeedbackStore,
  createInMemoryDevtoolsAccumulator,
} from "@aura/server";

const app = new Hono();
const devtools = createInMemoryDevtoolsAccumulator();

const sessionStore = createInMemorySessionStore();
const userModelStore = createInMemoryUserModelStore();
const feedbackStore = createInMemoryFeedbackStore();

registerAuipRoutes(app, { pipeline, sessionStore, userModelStore, feedbackStore, devtools });

// Development only:
registerDevtoolsRoute({ app, sessionStore, userModelStore, feedbackStore, accumulator: devtools });

serve({ fetch: app.fetch, port: 3000 });
```

All stores default to in-memory implementations when omitted; the integration example above is explicit for clarity.

### Step 2: Manifest Definition

```typescript
import type { CapabilityManifest } from "@aura/protocol";

const manifest: CapabilityManifest = {
  version: "1.0.0",
  surfaces: [
    {
      surfaceId: "product-search",
      components: [
        {
          componentId: "SearchResults",
          variants: ["grid", "list", "compact"],
          riskClass: "low",
          constraints: { requiresConsent: ["personalization"] },
        },
        {
          componentId: "FilterPanel",
          variants: ["expanded", "collapsed"],
          riskClass: "low",
        },
      ],
      layoutStability: { strategy: "reserved-space", maxDecisionWaitMs: 200 },
    },
  ],
};
```

### Step 3: React Integration

```tsx
import { AuraProvider, useAuraEmit, usePrescription, useAuraFeedback } from "@aura/react";

function App() {
  return (
    <AuraProvider
      endpoint="http://localhost:3000"
      manifest={manifest}
      userId="user-123"
      consentProfile={{ behavior: true, personalization: true }}
      context={{ page: "search", locale: "en-US" }}
    >
      <SearchPage />
    </AuraProvider>
  );
}

function SearchPage() {
  const emit = useAuraEmit();
  const prescription = usePrescription("product-search");
  const feedback = useAuraFeedback();

  const variant =
    prescription?.adaptations.find(
      (a) => a.type === "componentVariant" && a.componentId === "SearchResults"
    )?.variant ?? "grid";

  return (
    <SearchResults
      variant={variant}
      onUndo={() => prescription && feedback.undo(prescription.id)}
    />
  );
}
```

### 5.1 Friction Points Discovered

Three friction points emerged during integration that were not obvious from the Paper 2 specification:

**Manifest synchronous dependency.** The `AuraProvider` sends the manifest to the server as part of session initialisation. This means the manifest must be available synchronously at provider mount time — a lazy-loaded or remotely-fetched manifest requires the application to wait before mounting the provider. The current implementation does not support manifest streaming or deferred declaration. Applications that load manifests from a remote configuration service need a manifest-loading gate before rendering `AuraProvider`.

**SSE reconnection and prescription state.** The SDK implements exponential backoff reconnection on SSE stream interruption. However, on reconnection, the server does not replay all prescriptions emitted since the session started — only active (non-expired) prescriptions could be replayed, and the current implementation does not implement replay. Applications that depend on SSE-delivered prescriptions must handle the gap window between disconnection and reconnection, either by maintaining their last-known prescription state or by requesting a state refresh via `/aura/prescriptions/stream` with a `since` parameter (not currently implemented).

**Profile correction and re-evaluation.** Correcting a profile attribute via `POST /aura/profile/correction` removes the attribute from the user model store immediately. However, the correction does not automatically trigger a re-evaluation of rules that may have produced prescriptions based on the corrected attribute. The currently-active prescription (already delivered over SSE) remains valid until it expires or is explicitly dismissed. The host application must handle the case where a correction should immediately invalidate an active prescription — currently by calling `feedback.undo()` on the active prescription after submitting the correction.

### 5.2 What Worked Without Friction

The `usePrescription(surfaceId)` hook pattern proved clean in practice. Host components subscribe to adaptations for their specific surface, and components that do not call `usePrescription` are entirely unaffected by AURA — the pattern genuinely delivers opt-in adaptation without requiring global application changes. A host application can integrate a single adaptive surface without touching any other component.

## 6. eCommerce Demo (AURA Commerce)

The v0 reference demonstration is AURA Commerce — a Next.js 14 ecommerce application for electronics products. It demonstrates the full adaptive loop across a realistic product search and browse interface. The application includes a permanently-visible developer panel ("Console") that renders the `@aura/devtools` inspection views alongside the live storefront, embodying AURA's "Store + Console" concept.

### 6.1 The Adaptive Loop in the Demo

The demo exercises the following scenario:

1. User loads the search page. `AuraProvider` mounts; session initialises with the manifest and a default consent profile.
2. User types "travel laptop" in the search bar. The host emits `search.submitted` with the query string.
3. The server's events handler receives the event, assembles the `RulesPipelineInput`, and invokes the `RulesPipeline`.
4. The `filterHighlightRule` matches on `events[0].payload.query` containing "laptop". The pipeline constructs a candidate prescription, passes it through consent and manifest gates, and returns a validated `UIPrescription`.
5. The prescription emitter validates and stores the prescription, then broadcasts it over SSE.
6. The SDK's SSE manager receives the prescription and notifies the `PrescriptionStore`.
7. The `usePrescription("product-search")` hook re-renders with the new prescription. The `FilterPanel` updates to highlight "weight," "battery," and "display-size" filters.
8. The user can click "Undo" — the host calls `feedback.undo(prescription.id)`, which posts to `/aura/feedback`. The filter panel reverts to its default state.

Simultaneously, the devtools Console panel shows:
- **Event log**: the `search.submitted` event with its full payload
- **Rule matches**: the `filterHighlightRule` matched on this event
- **Prescription log**: the prescription emitted with `disposition: "accepted"`
- **Consent viewer**: the current data-class consent profile
- **Profile simulator**: a tool to simulate profile attributes and observe prescription changes

### 6.2 What the Demo Does Not Prove

The demo exercises one surface, one rule, and one adaptation type. It does not demonstrate: multi-surface federation (multiple surfaces adapting simultaneously from a shared user model), SLM or LLM-based inference tiers, cross-session learning (the user model resets on server restart), or the `high` and `critical` risk classes (all demo rules are `low` risk). These are v0 non-goals, not design limitations.

## 7. What v0 Proves

v0 validates four core architectural decisions from Paper 2 through working software:

### 7.1 The Capability Manifest as the Primary Governance Boundary

The manifest-check stage in the `RulesPipeline` enforces that prescriptions reference only declared surfaces, components, and variants. The prescription emitter's capability registry validates prescriptions again before emission. A rule that references an undeclared surface produces no output — it is filtered before the prescription reaches the network. This double enforcement (at the rules engine and at the emitter) means a rule author cannot accidentally adapt surfaces outside the declared action space, regardless of how the rule is written.

### 7.2 Prescription-Not-Replacement Is Implementable

The `@aura/react` provider never owns a DOM node, never calls `render()`, and never manages component lifecycle. `usePrescription(surfaceId)` returns a prescription object that host components choose to consume or ignore. The demo's `SearchPage` extracts the `variant` field from the prescription and passes it as a prop — if no prescription exists, the component renders its default. AURA is not present in the component's JSX; it is present in the data flow.

The pattern is verified: a component that does not call `usePrescription` cannot be adapted, even if a rule emits a prescription for its surface. The host application's decision to subscribe is the permission gate for adaptation.

### 7.3 Consent Enforcement Is Protocol-Level

The consent gate runs as Step 4 of the rules pipeline and as Gate 3 of the prescription emitter — before any prescription can reach the SSE stream. The consent profile is part of the `RulesPipelineInput`; a rule that references a `personalization`-class data attribute will be filtered at the consent gate if `personalization` is revoked, without any changes to the rule itself.

The implementation proves that an application can guarantee no personalisation-dependent adaptation occurs after consent revocation by updating the session's consent profile via `POST /aura/consent`. The server updates the in-memory consent state; the next event batch will produce only prescriptions permitted by the updated profile.

### 7.4 The Six-Package Boundary Creates Clean Substitution Seams

The in-memory stores in `@aura/server` implement typed interfaces (`ISessionStore`, `IUserModelStore`, `IFeedbackStore`, `IExplanationStore`, `IPrescriptionStore`). Any of these can be swapped for a persistent implementation — Redis, PostgreSQL, Cloudflare Durable Objects, Turso — without touching the rules engine, the SDK, the React adapter, or the devtools panel. The `IRulesPipeline` interface is similarly substitutable: the `RulesPipeline` class can be replaced by a thin wrapper around an SLM or LLM inference provider, or a composite that routes requests through the rules engine first and falls back to an LLM.

### 7.5 What v0 Does Not Prove

**SLM and LLM tier integration.** Paper 2 describes a tiered pipeline (Rules → Recommender → SLM → LLM). v0 implements only the Rules tier. The pipeline stages are positioned structurally to admit SLM/LLM tiers via the `IRulesPipeline` substitution seam, but this has not been tested with actual model providers.

**Rules engine scalability.** No benchmarks exist for rule set sizes beyond the small sets in the demo and fixtures. The per-rule isolation guarantees that one failing rule does not affect others, but the time complexity of evaluating large rule sets has not been characterised.

**Non-React adapter ergonomics.** The `@aura/sdk` is framework-neutral and its interface is designed to admit Vue, Svelte, Solid, and React Native adapters. Whether those adapters would have the same integration ergonomics as `@aura/react` has not been tested.

## 8. v1 Agenda: Core Framework Gaps

The ecommerce domain analysis (Paper 4) identified twelve gaps between AURA's current specification and the requirements of production deployment. Seven of these are domain-agnostic — they would appear in any production AURA deployment, whether in ecommerce, education, or health IT. These seven constitute the v1 implementation agenda and are documented here as actionable targets.

### 8.1 Cross-Session UserModel Persistence

v0 stores all session, context, user model, and feedback data in memory. Process restarts clear all state. Production deployments require persistent storage across sessions, and user model attributes must carry expiry values calibrated to realistic decision cycle lengths (days to weeks for high-consideration purchases; weeks to months for educational course completion; months for chronic health management). The substitutable store interfaces (`ISessionStore`, `IUserModelStore`, etc.) are already designed to admit persistent implementations. v1 should ship at least one reference implementation — a PostgreSQL adapter via Neon, a Durable Objects adapter for Cloudflare deployment, or a Turso adapter — alongside a `POST /aura/session/merge` endpoint for linking anonymous sessions to authenticated identities.

### 8.2 Primary Domain Outcome as Feedback Signal

AUIP v0's feedback model covers UI-level interactions: `accept`, `dismiss`, `override`, `undo`, `reject`. In any consequential domain, the most important feedback signal is a transactional outcome from an external system, delivered with significant delay after the adaptations that influenced it. In ecommerce: a completed purchase from the order management system. In education: a passed assessment from an LMS. In health: care-plan adherence from an EHR. A `transactional.completed` event type should be added to the AUIP event vocabulary, with an attribution model that identifies which active prescriptions may have influenced the outcome.

### 8.3 External Profile Bootstrap

Any application that uses an onboarding flow — a guided selling advisor, a learning-needs assessment, a patient intake form — produces a structured user profile before the main application renders. AUIP v0 has no mechanism to import this profile in bulk. A `POST /aura/profile/bootstrap` endpoint should be added, accepting multiple attributes with explicit provenance, confidence, and expiry metadata, alongside a `bootstrapSources` enumeration in the capability manifest.

### 8.4 Anti-Manipulation Governance Policy

AURA's risk class framework (`low`/`medium`/`high`/`critical`) addresses adaptation quality and safety. It does not address adaptation intent. An adaptation can be `low` risk by the risk class definition and still be manipulative in intent — artificial urgency signals, false social proof, manufactured scarcity. v1 should add an `intentClass` field to adaptation policy declarations:

```typescript
type IntentClass = "assistive" | "informative" | "persuasive" | "manipulative";
```

The `manipulative` class should be blocked by the prescription emitter unless an explicit policy override is declared with audit trail requirements. This extends the governance framework beyond quality assurance to ethical constraint enforcement.

### 8.5 Experimentation Coordination

Any production team running A/B experiments faces a coordination problem: AURA's adaptation pipeline and the experimentation platform both want to control the same surfaces. If a user is assigned to a "price-sorted listing" experiment, AURA independently sorting the listing corrupts the treatment assignment. v1 should add a manifest-level `experimentGating` constraint:

```typescript
// In the capability manifest
"product.listing": {
  constraints: {
    experimentGating: {
      checkEndpoint: "/experiments/check-assignment",
      blockedWhenAssigned: ["plp-sort-experiment"],
    },
  },
}
```

When a gated surface is covered by an active experiment assignment, AURA operates in observe-only mode for that surface.

### 8.6 Multi-Channel Surface Federation

v0 operates on a single host application with a single manifest. Production systems deploy across web, mobile app, in-store digital surfaces, and progressive web apps that share a common user model. A Miele customer who completes an advisor session on the desktop website should receive consistent adaptation when they open the mobile app. Paper 2 identifies federated manifests as future work; v1 should specify the federation mechanism: a shared persistent UserModel store, cross-channel consent management (consent on web does not automatically extend to in-store), and a federated manifest reconciliation protocol.

### 8.7 User Preference Data Portability

AURA's `UserModel` accumulates structured attributes with provenance and consent metadata. GDPR Article 20 and CCPA require that users can export this data in a portable, machine-readable format. AUIP v0 exposes `GET /aura/profile` (user-visible summary) and `POST /aura/profile/correction` (correct or remove). v1 should add `GET /aura/profile/export` (full structured export in a portable format) and an anonymised analytics aggregation endpoint that allows deployers to understand aggregate preference distributions without accessing individual-level data.

## 9. Conclusion

AURA v0 delivers a working TypeScript realisation of the governed adaptive UI middleware architecture. The six-package implementation — protocol, SDK, React adapter, server, rules engine, and devtools — proves the core adaptive loop across an ecommerce demonstration: a host application declares adaptable surfaces, emits consented events, receives bounded prescriptions, and retains full rendering authority throughout.

Four Paper 2 architectural decisions are validated through working software: the capability manifest as the primary governance boundary, prescription-not-replacement as an implementable pattern, consent enforcement at the protocol layer, and clean substitution seams between packages. Implementation also surfaced three refinements not fully specified in Paper 2: structured explanation metadata on rules, client-side prescription expiry enforcement in the SSE subscription, and synchronous profile correction before re-evaluation.

The deterministic rules engine proves sufficient for the v0 adaptive loop without any model dependency. The pipeline's nine-stage structure, the evaluator's `never throws` guarantee, and the fixture-based test runner make the rules engine a viable foundation for production use in low-risk adaptive surfaces. The SLM and LLM tiers described in Paper 2 remain as v1 targets, admitted via the `IRulesPipeline` substitution interface.

The v1 agenda is seven domain-agnostic core framework additions: cross-session persistence, primary domain outcome feedback, external profile bootstrap, anti-manipulation governance, experimentation coordination, multi-channel federation, and data portability. None requires breaking changes to v0 consumers. Each is a targeted extension of an existing interface, store, or protocol endpoint. The ecommerce domain analysis in Paper 4 provides the first concrete instantiation of this agenda, alongside a domain extension contract (`AuraDomainDataSource`, `AuraDomainEventVocabulary`, `AuraDomainSurfacePreset`) that would enable domain-specific packages to integrate with AURA core without modifying it.

## References

[AURA Paper 1] *Adaptive User Interfaces in the LLM Era: State of the Art, Limitations, and Research Opportunities*. Adaptive Interfaces Use Cases research programme, Paper 1.

[AURA Paper 2] *AURA: A Reference Architecture for Governed Adaptive User Interface Middleware*. Adaptive Interfaces Use Cases research programme, Paper 2.

[AURA Paper 4] *AURA in AI-Advisory Ecommerce: Architecture, Mapping, and Gaps*. Adaptive Interfaces Use Cases research programme, Paper 4.

Yeboah, F. (2026). Adaptive UI Middleware Architecture. AURA Framework. https://github.com/bretuobay/aura-framework

Hono (2024). Hono v4.4 — Ultrafast web framework for the Edges. https://hono.dev

Asteasain, C., et al. (2024). Zod v3.23 — TypeScript-first schema validation. https://zod.dev

Hedger, J. (2024). fast-check v3/4 — Property based testing for JavaScript/TypeScript. https://fast-check.io

Turborepo (2024). Turborepo v2.5 — High-performance build system for JavaScript and TypeScript monorepos. https://turbo.build

Vitest (2024). Vitest v2/3 — Blazing fast unit test framework powered by Vite. https://vitest.dev
