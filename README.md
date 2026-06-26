# AURA — Adaptive UI Runtime Architecture

A governed adaptive UI middleware for TypeScript web applications. AURA sits between host applications and adaptation intelligence, observing interaction signals, evaluating policies, and emitting bounded UI prescriptions — without ever owning rendering.

## Core Principles

- **Prescription, not replacement** — the host application retains full rendering authority; AURA only suggests bounded changes
- **Manifest-driven** — surfaces, components, variants, and acceptable props are declared upfront by the host
- **Consent-gated** — all data collection and inference is scoped to explicit, per-class user consent
- **Explainable** — every prescription carries audience-specific explanations (user, developer, auditor)

## Packages

| Package | Role |
|---|---|
| `@aura/protocol` | AUIP v0 types, Zod schemas, and validation contracts |
| `@aura/sdk` | Framework-neutral browser SDK — session lifecycle, event batching, prescription subscription |
| `@aura/react` | React provider and hooks (`useAura`, `useAdaptation`) for host app integration |
| `@aura/server` | Hono middleware implementing AUIP route handlers with in-memory state |
| `@aura/rules` | Deterministic policy DSL, rule evaluator, and test runner |
| `@aura/devtools` | Prescription inspector, event log, consent viewer, and profile simulator |

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Language**: TypeScript 5.8 (strict)
- **Bundlers**: Vite (browser packages), tsup (Node packages)
- **Testing**: Vitest + fast-check (property-based)
- **Validation**: Zod
- **Server**: Hono

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

Run all packages in dev mode:

```bash
pnpm dev
```

## Integration Guide

### 1. Set Up the Server

Create a Hono server that mounts the AUIP endpoints and (optionally) the devtools route:

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { registerAuipRoutes, createInMemorySessionStore, createInMemoryContextStore, createInMemoryUserModelStore, createInMemoryFeedbackStore, createInMemoryExplanationStore, createInMemoryPrescriptionStore } from "@aura/server";
import { registerDevtoolsRoute } from "@aura/devtools";

const app = new Hono();

// Create storage (swap for persistent implementations in production)
const sessionStore = createInMemorySessionStore();
const contextStore = createInMemoryContextStore();
const userModelStore = createInMemoryUserModelStore();
const feedbackStore = createInMemoryFeedbackStore();
const explanationStore = createInMemoryExplanationStore();
const prescriptionStore = createInMemoryPrescriptionStore();

// Register AUIP v0 endpoints (9 routes)
registerAuipRoutes(app, {
  pipeline: myRulesPipeline, // your @aura/rules pipeline instance
  sessionStore,
  contextStore,
  userModelStore,
  feedbackStore,
  explanationStore,
  prescriptionStore,
});

// Optional: register devtools endpoint (dev/staging only)
registerDevtoolsRoute({
  app,
  storage: {
    sessions: sessionStore,
    events: eventStore,
    prescriptions: prescriptionStore,
    consent: consentStore,
    profile: userModelStore,
    feedback: feedbackStore,
    ruleMatches: ruleMatchStore,
    audit: auditStore,
    security: securityStore,
  },
});

serve({ fetch: app.fetch, port: 3000 });
```

### 2. Define a Capability Manifest

The manifest declares which surfaces, components, variants, and data classes your app supports:

```typescript
import type { CapabilityManifest } from "@aura/protocol";

const manifest: CapabilityManifest = {
  surfaces: [
    {
      surfaceId: "product-search",
      components: [
        {
          componentId: "SearchResults",
          variants: ["grid", "list", "compact"],
          riskClass: "low",
          constraints: {
            requiresConsent: ["personalization"],
          },
        },
        {
          componentId: "FilterPanel",
          variants: ["expanded", "collapsed"],
          riskClass: "low",
        },
      ],
      layoutStability: {
        strategy: "reserved-space",
        maxDecisionWaitMs: 200,
      },
    },
  ],
};
```

### 3. Integrate with React

Wrap your app in `AuraProvider` and use hooks to consume adaptations:

```tsx
import { AuraProvider, useAura, usePrescription, useAuraEmit, useAuraFeedback } from "@aura/react";

function App() {
  return (
    <AuraProvider
      endpoint="http://localhost:3000"
      manifest={manifest}
      userId="user-123"
      consentProfile={{ personalization: true, behavior: true }}
      context={{ page: "search", locale: "en-US" }}
    >
      <SearchPage />
    </AuraProvider>
  );
}

function SearchPage() {
  const { status } = useAura();
  const emit = useAuraEmit();
  const prescription = usePrescription("product-search");
  const feedback = useAuraFeedback();

  // Emit an event when the user interacts
  const handleSearch = (query: string) => {
    emit({ type: "search.executed", surfaceId: "product-search", payload: { query } });
  };

  // Apply the prescription's recommended variant
  const variant = prescription?.adaptations.find(
    a => a.type === "componentVariant" && a.componentId === "SearchResults"
  )?.variant ?? "grid";

  // Send feedback when the user accepts or dismisses
  const handleAccept = () => {
    if (prescription) feedback.accept(prescription.id);
  };

  return (
    <div>
      <p>SDK status: {status}</p>
      <SearchResults variant={variant} onAccept={handleAccept} />
    </div>
  );
}
```

### 4. Add Devtools (Development Only)

Mount the devtools panel in your app for inspection and simulation:

```tsx
import { DevtoolsPanel } from "@aura/devtools";

function DevtoolsRoute() {
  return (
    <DevtoolsPanel
      endpoint="http://localhost:3000"
      sessionId="current-session-id"
      fixtureEvents={[
        { name: "Search executed", event: { type: "search.executed", surfaceId: "product-search", timestamp: new Date().toISOString(), payload: { query: "laptop" } } },
      ]}
    />
  );
}
```

The devtools panel provides:
- **Session inspector** — view session metadata, manifest, and context state
- **Event log** — see all events received by the server in real time
- **Prescription log** — trace accepted, rejected, and dropped prescriptions
- **Rule matches** — debug which rules fired and why conditions passed/failed
- **Consent viewer + editor** — inspect and toggle data-class consent to test gating
- **Profile simulator** — test attribute scenarios without corrupting real profiles
- **Event replayer** — replay fixture events to observe the full pipeline end-to-end

### 5. Define Rules

Use `@aura/rules` to define deterministic policies:

```typescript
import { createRule, createPipeline } from "@aura/rules";

const darkModeRule = createRule({
  id: "prefer-dark-mode",
  conditions: [
    { path: "profile.preferredTheme", operator: "equals", expected: "dark" },
  ],
  prescription: {
    surfaceId: "product-search",
    mode: "autonomous",
    adaptations: [
      { type: "componentVariant", componentId: "SearchResults", variant: "grid" },
    ],
  },
});

const pipeline = createPipeline({ rules: [darkModeRule] });
```

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                Host Application                  │
│  ┌───────────────────────────────────────────┐  │
│  │   AuraProvider (React context)            │  │
│  │     ↕ useAura / usePrescription / emit    │  │
│  └───────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ HTTP + SSE
┌──────────────────────▼──────────────────────────┐
│              @aura/server (Hono)                 │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Sessions │ │ Events   │ │ Prescriptions  │  │
│  │ Context  │ │ Consent  │ │ Stream (SSE)   │  │
│  │ Profile  │ │ Feedback │ │ Explain        │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
│                      ↓                           │
│  ┌─────────────────────────────────────────────┐│
│  │  @aura/rules — Policy Evaluation Pipeline  ││
│  │  Manifest check → Consent gate → Rules     ││
│  │  → Risk enforcement → Prescription emit    ││
│  └─────────────────────────────────────────────┘│
└──────────────────────┬──────────────────────────┘
                       │ (optional, dev only)
┌──────────────────────▼──────────────────────────┐
│         @aura/devtools (React panel)            │
│  Inspector views · Simulation tools · Audit     │
└─────────────────────────────────────────────────┘
```

## Repository Structure

```
.
├── packages/
│   ├── protocol/     # @aura/protocol
│   ├── sdk/          # @aura/sdk
│   ├── react/        # @aura/react
│   ├── server/       # @aura/server
│   ├── rules/        # @aura/rules
│   └── devtools/     # @aura/devtools
├── product-docs/     # Research literature and architecture papers
│   ├── aura-paper/   # Research paper series (Markdown + PDF)
│   ├── HealthCare/
│   ├── Education/
│   └── Ecommerce/
├── scripts/          # Developer utilities (md-to-pdf, etc.)
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Package Dependencies

```
@aura/protocol  ← shared types & schemas (no runtime deps)
    ↑
@aura/sdk  ← browser client (depends on protocol)
    ↑
@aura/react  ← React hooks & provider (depends on sdk + protocol)

@aura/rules  ← policy engine (depends on protocol)
    ↑
@aura/server  ← Hono middleware (depends on protocol + rules)

@aura/devtools  ← inspector panel (depends on protocol only)
```

## Status

Early MVP — all 6 packages scaffolded with specifications; implementation underway.

The v0 target delivers: fully typed AUIP protocol, Hono reference server, React integration, deterministic rules engine, basic devtools, and an e-commerce search demo.

## Research Foundation

`product-docs/` contains academic papers and synthesis documents across e-commerce, education, and healthcare domains that informed the architecture. The research paper series:

- `aura-paper/01-adaptive-ui-literature-review.md` — literature review of adaptive UI in the LLM era
- `aura-paper/02-aura-reference-architecture.md` — AURA reference architecture (also available as [PDF](product-docs/aura-paper/02-aura-reference-architecture.pdf))
- `aura-paper/03-aura-implementation-paper.md` — implementation paper
- `aura-paper/03-aura-typescript-implementation-prd.md` — v0 TypeScript implementation PRD
- [Governing Adaptive Interfaces — slides](product-docs/aura-paper/Governing_Adaptive_Interfaces.pdf)

## License and Attribution

Implementation code, tests, package configuration, and build tooling are licensed under the Apache License, Version 2.0. See `LICENSE`.

Architecture documents, diagrams, whitepapers, reference architecture materials, and research synthesis are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). See `LICENSE-DOCS.md`.

Recommended attribution for architecture materials:

> Festus Yeboah, 2026. Adaptive UI Middleware Architecture.
> https://github.com/bretuobay/aura-framework

Third-party research papers and PDFs included for reference may have their own copyrights and licenses and are not relicensed by this repository.
