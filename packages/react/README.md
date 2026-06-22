# @aura/react

React adapter for the AURA framework. Provides a context provider and hooks that expose `@aura/sdk` capabilities to React component trees — without taking over rendering.

## Overview

`@aura/react` bridges the imperative `AuraClient` API with React's declarative model. It offers:

- **`AuraProvider`** — manages the SDK lifecycle (init/disconnect) aligned with React's mount/unmount.
- **`useAura()`** — read current SDK status and errors.
- **`useAuraEmit()`** — get a stable emit function for sending events.
- **`usePrescription(surfaceId)`** — subscribe to per-surface prescription updates.
- **`useAuraFeedback()`** — get a stable function for submitting feedback.

All hooks are render-safe (never throw), return stable references, and degrade gracefully when used outside a provider tree.

## Installation

```bash
pnpm add @aura/react
```

Peer dependencies:
```json
{
  "react": "^18.0.0 || ^19.0.0",
  "@aura/sdk": "^0.1.0",
  "@aura/protocol": "^0.1.0"
}
```

## Quick Start

```tsx
import { AuraProvider, useAura, usePrescription, useAuraEmit, useAuraFeedback } from '@aura/react';

function App() {
  return (
    <AuraProvider
      endpoint="https://aura.example.com"
      manifest={myManifest}
      userId="user-123"
      consentProfile={{ behavior: true, personalization: true }}
      context={{ device: 'desktop', locale: 'en-US' }}
    >
      <SearchResults />
    </AuraProvider>
  );
}

function SearchResults() {
  const { status, error } = useAura();
  const prescription = usePrescription('search-results');
  const emit = useAuraEmit();
  const feedback = useAuraFeedback();

  // Emit an event on interaction
  const handleClick = (itemId: string) => {
    emit({
      type: 'interaction.clicked',
      surfaceId: 'search-results',
      timestamp: new Date().toISOString(),
      payload: { itemId },
    });
  };

  // Apply prescription or render defaults
  if (prescription) {
    // Apply the adaptation — or ignore it entirely (host's choice)
    return <AdaptedResults prescription={prescription} onFeedback={feedback} />;
  }

  return <DefaultResults onClick={handleClick} />;
}
```

## API Reference

### `<AuraProvider>`

```typescript
interface AuraProviderProps {
  endpoint: string;
  manifest: CapabilityManifest;
  userId: string;
  consentProfile: ConsentProfile;
  context: ContextModel;
  children?: React.ReactNode;
}
```

Wraps your app (or a subtree) to initialize the AURA SDK. Children render immediately — never blocked by initialization.

### `useAura()`

```typescript
function useAura(): { status: SdkStatus; error: AuraClientError | null }
```

Returns the current SDK lifecycle status (`"idle"`, `"active"`, or `"degraded"`) and the most recent error. Outside a provider, returns `{ status: "degraded", error: null }`.

### `useAuraEmit()`

```typescript
function useAuraEmit(): (event: AuraEvent) => Promise<void>
```

Returns a **stable function reference** for emitting events. The function identity doesn't change across re-renders, making it safe to pass as a prop or dep.

### `usePrescription(surfaceId)`

```typescript
function usePrescription(surfaceId: string): UIPrescription | undefined
```

Subscribes to the prescription for a specific UI surface. Returns `undefined` when no prescription exists, the SDK is degraded, or the prescription is expired/stale. Each hook instance manages an independent subscription — prescriptions for surface A never cause re-renders on surface B.

### `useAuraFeedback()`

```typescript
function useAuraFeedback(): (feedbackEvent: FeedbackEvent) => Promise<void>
```

Returns a **stable function reference** for submitting feedback (accept, reject, dismiss, override, undo).

## Design Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Render safety** | No hook or provider ever throws during the React render phase |
| **Stable references** | `useAuraEmit` and `useAuraFeedback` return the same function identity across re-renders |
| **Surface isolation** | Prescription updates for one surface never re-render components subscribed to other surfaces |
| **Progressive enhancement** | Hooks return safe defaults when outside a provider or when SDK is degraded |
| **Lifecycle alignment** | SDK init/disconnect are tied to provider mount/unmount, including Strict Mode |
| **No subscription leaks** | All subscriptions are cleaned up on unmount |

## Re-exported Types

For convenience, `@aura/react` re-exports common types so consumers don't need direct dependencies on `@aura/sdk` or `@aura/protocol`:

```typescript
// From @aura/sdk
export type { AuraClientError, AuraValidationError };

// From @aura/protocol
export type { AuraEvent, UIPrescription, FeedbackEvent, CapabilityManifest, ConsentProfile, ContextModel };

// Local
export type { SdkStatus, AuraProviderProps };
```

## Testing

The package includes both property-based tests (fast-check) verifying 10 universal correctness properties, and unit tests covering lifecycle edge cases.

```bash
pnpm test        # Run all tests
pnpm build       # Build with tsup (CJS + ESM + .d.ts)
pnpm typecheck   # TypeScript strict mode check
```

## Architecture

```
@aura/protocol  →  @aura/sdk  →  @aura/react  →  Host Application
```

`@aura/react` sits directly above `@aura/sdk`. It imports types from `@aura/protocol` for API signatures but delegates all networking, validation, and prescription management to the SDK.
