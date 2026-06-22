# @aura/server

Server-side implementation of the AURA Adaptive UI Protocol (AUIP v0). Provides Hono middleware and route handlers for session management, event ingestion, context updates, prescription delivery via SSE, feedback collection, and consent enforcement.

## Overview

`@aura/server` is a reference implementation of the AURA server that:

- **Manages sessions** — creates and tracks user sessions with manifest pinning
- **Ingests events** — validates and stores interaction/behavioral events from the SDK
- **Evaluates rules** — integrates with `@aura/rules` to evaluate policies and produce prescriptions
- **Delivers prescriptions** — streams validated prescriptions to clients via Server-Sent Events (SSE)
- **Enforces consent** — gates data collection and inference by the user's consent profile
- **Validates manifests** — ensures prescriptions target declared surfaces and components
- **Audits security** — risk-class enforcement and security scanning on prescriptions

## Installation

```bash
pnpm add @aura/server
```

Peer dependencies:
```json
{
  "@aura/rules": "workspace:*"
}
```

## Quick Start

```typescript
import { Hono } from 'hono';
import { registerAuipRoutes } from '@aura/server';
import { RulesPipeline } from '@aura/rules';

const app = new Hono();
const pipeline = new RulesPipeline({ rules: myRules });

registerAuipRoutes(app, {
  rulesPipeline: pipeline,
  // Optional: provide custom storage implementations
  // sessionStore, contextStore, feedbackStore, etc.
});

export default app;
```

## AUIP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/aura/session` | Initialize a session (returns session ID, opens SSE) |
| POST | `/aura/events` | Submit interaction events (batch) |
| POST | `/aura/context` | Push incremental context updates |
| POST | `/aura/feedback` | Submit prescription feedback |
| PATCH | `/aura/consent` | Update consent profile |
| GET | `/aura/stream` | SSE stream for prescription delivery |
| GET | `/aura/explain/:id` | Get explanation for a prescription |
| GET | `/aura/profile` | Get adaptive profile summary |
| POST | `/aura/profile/correct` | Submit profile corrections |

## Storage Interfaces

The server uses pluggable storage backends. In-memory implementations are included for development:

```typescript
import {
  createInMemorySessionStore,
  createInMemoryContextStore,
  createInMemoryFeedbackStore,
  createInMemoryPrescriptionStore,
  createInMemoryUserModelStore,
  createInMemoryExplanationStore,
} from '@aura/server';
```

For production, implement the `ISessionStore`, `IContextStore`, etc. interfaces with your preferred database.

## Architecture

```typescript
// Key service interfaces
interface ICapabilityRegistry { /* manifest validation */ }
interface IConsentEnforcer { /* consent gating */ }
interface IStreamRegistry { /* SSE connection management */ }
interface IPrescriptionEmitter { /* validated prescription delivery */ }
interface ISecurityAuditor { /* risk-class enforcement */ }
```

The server pipeline:
1. **Session init** → validates manifest, creates session record
2. **Event ingestion** → validates events, stores, triggers rule evaluation
3. **Rule evaluation** → `@aura/rules` pipeline produces candidate prescriptions
4. **Consent gating** → filters prescriptions by user consent
5. **Manifest validation** → ensures prescriptions target declared surfaces
6. **Security audit** → risk-class checks
7. **SSE delivery** → streams validated prescriptions to the connected client

## Configuration

```typescript
interface AuraServerConfig {
  rulesPipeline: IRulesPipeline;
  sessionStore?: ISessionStore;
  contextStore?: IContextStore;
  feedbackStore?: IFeedbackStore;
  prescriptionStore?: IPrescriptionStore;
  userModelStore?: IUserModelStore;
  explanationStore?: IExplanationStore;
  latencyBudget?: LatencyBudgetConfig;
  securityPolicy?: SecurityPolicyConfig;
}
```

## Dependencies

- `@aura/protocol` — shared types and validation schemas
- `hono` — lightweight web framework (works on Node, Bun, Deno, Cloudflare Workers)
- `@aura/rules` (peer) — rule evaluation pipeline

## Development

```bash
pnpm build       # Build with tsup (CJS + ESM + .d.ts)
pnpm test        # Run Vitest test suite
pnpm typecheck   # TypeScript strict mode check
```
