# @aura/protocol

Shared type definitions and Zod validation schemas for the AURA Adaptive UI Protocol (AUIP v0). This package is the single source of truth for all data structures exchanged between AURA packages.

## Overview

`@aura/protocol` defines the wire format and validation rules for every message in the AURA system — events, prescriptions, feedback, context models, capability manifests, consent profiles, and more. All types are derived from Zod schemas, giving you both runtime validation and static TypeScript types from one definition.

## Installation

```bash
pnpm add @aura/protocol
```

## Key Exports

### Schemas & Types

| Module | Exports |
|--------|---------|
| `event.ts` | `AuraEventSchema`, `AuraEvent` — typed interaction/behavioral events |
| `prescription.ts` | `UIPrescriptionSchema`, `UIPrescription`, `ContextLock`, `AdaptationGroup` |
| `feedback.ts` | `FeedbackEventSchema`, `FeedbackEvent` — user accept/reject/dismiss signals |
| `manifest.ts` | `CapabilityManifestSchema`, `ManifestSurface`, `ManifestComponent` |
| `consent.ts` | `ConsentProfileSchema`, `ConsentProfile` — per-data-class consent map |
| `context.ts` | `ContextModelSchema`, `ContextModel` — device, locale, viewport, task state |
| `adaptation.ts` | `AdaptationSchema`, `Adaptation` — discriminated union of 6 adaptation types |
| `explanation.ts` | `ExplanationRecordSchema` — audience-scoped prescription explanations |
| `profile.ts` | `ProfileAttribute`, `ProfileCorrection` — adaptive profile types |
| `enums.ts` | `RiskClass`, `PrescriptionMode`, `LatencyClass`, `DataClass`, `FeedbackAction`, etc. |
| `common.ts` | `NonEmptyString`, `ISOTimestamp`, `Confidence`, `ContextSequenceId` |
| `endpoints.ts` | AUIP endpoint path constants |
| `errors.ts` | Protocol-level error types |

### Adaptation Types (discriminated union)

```typescript
type Adaptation =
  | { type: "rank"; orderedIds: string[]; reasonCode: string }
  | { type: "componentVariant"; slotId: string; componentId: string; variant: string; reasonCode: string }
  | { type: "layout"; layout: LayoutType; reasonCode: string }
  | { type: "content"; target: string; contentKey: string; content: string; reasonCode: string }
  | { type: "accessibility"; setting: AccessibilitySetting; value: string | number | boolean; reasonCode: string }
  | { type: "filter"; target: string; visibleFilters: string[]; reasonCode: string };
```

## Usage

```typescript
import { AuraEventSchema, type AuraEvent } from '@aura/protocol';

// Validate at runtime
const result = AuraEventSchema.safeParse(untrustedInput);
if (result.success) {
  const event: AuraEvent = result.data;
}

// Use types directly
const event: AuraEvent = {
  type: 'interaction.clicked',
  surfaceId: 'search-results',
  timestamp: new Date().toISOString(),
  payload: { itemId: 'product-42' },
};
```

## Design Principles

- **Schema-first**: Every type is derived from a Zod schema — runtime validation and TypeScript types are always in sync.
- **Extensible enums**: Event types, data classes, and adaptation types use string unions with well-known values, allowing forward compatibility.
- **No runtime dependencies** beyond Zod.
- **Framework-agnostic**: Pure data definitions with no platform coupling.

## Development

```bash
pnpm build       # Build with tsup (CJS + ESM + .d.ts)
pnpm test        # Run Vitest test suite
pnpm typecheck   # TypeScript strict mode check
```

## Dependency Graph

```
@aura/protocol  ←  @aura/sdk  ←  @aura/react
                ←  @aura/server
                ←  @aura/rules
                ←  @aura/devtools
```

Every other AURA package depends on `@aura/protocol`. It has no internal AURA dependencies.
