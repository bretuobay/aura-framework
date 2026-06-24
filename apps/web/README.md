# AURA E-Commerce Demo

Next.js demo app for the AURA adaptive interface middleware.

## Run

```bash
pnpm install
pnpm --filter @aura/web dev
```

The dev server starts with `next dev`; if port `3000` is occupied, Next will choose the next available port.

## Validate

```bash
pnpm --filter @aura/web typecheck
pnpm --filter @aura/web test
pnpm --filter @aura/web build
```

Property tests under `__tests__/properties` are intentionally excluded from the demo validation path. The active suite covers the implemented units and UI components.

## Environment Flags

All flags can be set with `NEXT_PUBLIC_` prefixes for browser availability:

- `NEXT_PUBLIC_USE_REAL_LLM=false`
- `NEXT_PUBLIC_USE_REAL_SLM=false`
- `NEXT_PUBLIC_SIMULATE_ADAPTATIONS=false`
- `NEXT_PUBLIC_SHOW_DEVTOOLS=false`
- `NEXT_PUBLIC_ENABLE_EXPLANATIONS=true`
- `NEXT_PUBLIC_ENABLE_CONSENT=true`

## Demo Flow

The home page assembles product search, filters, product grid variants, demo controls, consent controls, explanations, and devtools. Scenario buttons apply predefined prescriptions locally so the demo works without external AI services.
