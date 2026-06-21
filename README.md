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
│   ├── aura-paper/   # Reference architecture + TypeScript PRD
│   ├── HealthCare/
│   ├── Education/
│   └── Ecommerce/
├── .kiro/specs/      # Per-package requirements, design, and task specs
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Status

Early MVP — all 6 packages scaffolded with specifications; implementation underway.

The v0 target delivers: fully typed AUIP protocol, Hono reference server, React integration, deterministic rules engine, basic devtools, and an e-commerce search demo.

## Research Foundation

`product-docs/` contains 37+ academic papers across e-commerce, education, and healthcare domains that informed the architecture. Key synthesis documents:

- `product-docs/aura-paper/AURA-Reference-Architecture-Paper.md` — full reference architecture
- `product-docs/aura-paper/03-aura-typescript-implementation-prd.md` — v0 product requirements
