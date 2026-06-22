# @aura/devtools

Developer tools for inspecting, debugging, and simulating AURA adaptive UI behavior. Provides React components for visualizing prescriptions, events, consent state, and the adaptive profile.

## Overview

`@aura/devtools` is a companion package for AURA application developers. It provides:

- **Prescription inspector** — view active prescriptions per surface, their adaptations, confidence scores, and expiry
- **Event log** — real-time feed of emitted events with payload inspection
- **Consent viewer** — visualize current consent profile and simulate consent changes
- **Profile simulator** — inspect and modify the adaptive profile to test different adaptation scenarios
- **Rule debugger** — trace which rules matched and why for a given prescription

## Installation

```bash
pnpm add @aura/devtools
```

Peer dependencies:
```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0"
}
```

## Status

> **Early development** — package scaffolded with type definitions. UI components are in progress.

## Planned API

```tsx
import { AuraDevPanel } from '@aura/devtools';

function App() {
  return (
    <>
      <MyApp />
      {process.env.NODE_ENV === 'development' && <AuraDevPanel />}
    </>
  );
}
```

### Planned Components

| Component | Description |
|-----------|-------------|
| `AuraDevPanel` | Collapsible overlay panel with all devtools tabs |
| `PrescriptionInspector` | View active/expired prescriptions with adaptation details |
| `EventTimeline` | Chronological event feed with filtering |
| `ConsentPanel` | Toggle consent classes and see real-time effects |
| `ProfileViewer` | View inferred profile attributes and their provenance |
| `RuleTrace` | See which rules fired for each prescription |

## Architecture

`@aura/devtools` reads from the same `@aura/protocol` types as other packages. It connects to the SDK's observability APIs (`getLogs()`, `onError()`, subscription listeners) to provide real-time debugging views.

```
@aura/protocol  →  @aura/devtools (reads types)
@aura/sdk       →  @aura/devtools (observability hooks)
```

## Dependencies

- `@aura/protocol` — shared type definitions

## Development

```bash
pnpm build       # Build with Vite + tsc declarations
pnpm test        # Run tests
pnpm typecheck   # TypeScript check
```
