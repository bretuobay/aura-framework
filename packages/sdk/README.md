# @aura/sdk

Framework-neutral browser SDK for the AURA Adaptive UI Protocol. Manages the full client lifecycle — session initialization, event emission, prescription subscriptions via SSE, context updates, feedback submission, and graceful degradation.

## Overview

`@aura/sdk` is the bridge between any frontend application and an AURA server. It handles:

- **Session lifecycle** — `init()` establishes a session via HTTP POST, opens an SSE stream for prescriptions, and flushes queued events.
- **Event batching** — events emitted before the session is active are queued (with TTL) and flushed automatically once connected.
- **Prescription subscriptions** — per-surface subscription model with expiry checking and context-lock validation.
- **Graceful degradation** — all methods resolve without throwing when the SDK enters `"degraded"` status. The host app continues working without AURA.
- **Error observability** — structured error types, an `onError` handler, and a circular log buffer for diagnostics.

## Installation

```bash
pnpm add @aura/sdk
```

## Quick Start

```typescript
import { createAuraClient } from '@aura/sdk';
import type { AuraClient, AuraClientConfig } from '@aura/sdk';

const client: AuraClient = createAuraClient({
  endpoint: 'https://aura.example.com',
  manifest: myCapabilityManifest,
  userId: 'user-123',
  consentProfile: { behavior: true, personalization: true },
  context: { device: 'desktop', locale: 'en-US' },
});

// Initialize — establishes session, opens SSE
await client.init();

// Emit events
await client.emit({
  type: 'interaction.clicked',
  surfaceId: 'hero-banner',
  timestamp: new Date().toISOString(),
  payload: { buttonId: 'cta-primary' },
});

// Subscribe to prescriptions
const unsubscribe = client.subscribe('hero-banner', (prescription) => {
  if (prescription) {
    // Apply or ignore the prescription
  }
});

// Submit feedback
await client.feedback({
  prescriptionId: 'rx-abc',
  action: 'accept',
  timestamp: new Date().toISOString(),
});

// Cleanup
client.disconnect();
```

## Public API

### Factory

| Export | Description |
|--------|-------------|
| `createAuraClient(config)` | Creates and returns an `AuraClient` instance. Throws `AuraConfigError` for invalid config. |

### AuraClient Interface

| Method | Description |
|--------|-------------|
| `init()` | Initialize session, open SSE stream, flush queue. Never rejects. |
| `disconnect()` | Close SSE, clear state, transition to degraded. Never throws. |
| `emit(event)` | Send a behavioral event. Queues if not active. Rejects for validation errors. |
| `subscribe(surfaceId, listener)` | Subscribe to prescription changes for a surface. Returns unsubscribe fn. |
| `feedback(feedbackEvent)` | Submit accept/reject/dismiss/override/undo feedback. |
| `updateContext(patch)` | Push incremental context changes to the server. |
| `updateConsent(patch)` | Update local consent profile and notify server. |
| `onError(handler)` | Register error handler. Returns unsubscribe fn. |
| `explain(prescriptionId)` | Retrieve explanation record for a prescription. |
| `getProfile()` | Get the adaptive profile summary. |
| `correctProfile(correction)` | Submit a profile correction. |
| `getLogs()` | Get all entries from the circular log buffer. |

### Status

```typescript
type AuraClientStatus = 'idle' | 'active' | 'degraded';
```

- **idle** — created but not yet initialized
- **active** — session established, SSE connected, ready
- **degraded** — failed to connect or disconnected; all methods resolve as no-ops

### Error Types

| Error | When |
|-------|------|
| `AuraConfigError` | Invalid config passed to `createAuraClient` |
| `AuraValidationError` | Invalid event/feedback passed to `emit()` or `feedback()` |
| `AuraClientError` | Runtime errors (network, SSE disconnect, server errors) |

## Design Principles

- **Never throw in normal operation** — `init()` and `disconnect()` never reject/throw. Runtime errors flow through `onError`.
- **Validation errors are the caller's fault** — `emit()` and `feedback()` reject with `AuraValidationError` for invalid inputs.
- **Framework-agnostic** — no React, Vue, or Angular coupling. Framework adapters (`@aura/react`) wrap this SDK.
- **Progressive enhancement** — if the server is unreachable, the host app works normally with all SDK methods resolving as no-ops.

## Dependencies

- `@aura/protocol` — type definitions and Zod schemas for validation

## Development

```bash
pnpm build       # Build with Vite (ESM) + tsc declarations
pnpm test        # Run Vitest + fast-check property tests
pnpm typecheck   # TypeScript strict mode check
```
