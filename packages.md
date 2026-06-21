All six specs are in place. Here's a summary of what was created:

Six package-sliced requirements specs, one per @aura/* package:

aura-protocol — 17 requirements covering all AUIP v0 type exports, schema naming conventions, per-type validation (manifest, event, context, prescription, adaptation, feedback, consent, profile), cross-environment compatibility (CJS + ESM), error quality, round-trip serialization, and the isPrescriptionExpired monotone expiry invariant. Fully detailed with precise EARS-pattern criteria.

aura-server — 18 requirements covering Hono route registration, all nine AUIP endpoints, six typed storage interfaces (with in-memory defaults), SSE stream management, consent enforcement at every data boundary, capability registry/manifest checking, rules pipeline integration with timeout, prescription expiry enforcement, graceful degradation, and 12 named PBT correctness properties.

aura-rules — 18 requirements covering the rule DSL schema (RuleSchema, ConditionSchema, ActionSchema), rule set loading, all 10 condition operators, candidate prescription construction, consent gating, manifest checking, risk-class enforcement, priority ordering, protocol validation of output, error isolation, determinism with injectable clock, fixture test runner with diff output, CLI (aura-rules test), the four v0 demo rules (filter highlighting, product-card variant, passive explanation, undo/reject), and 10 PBT properties.

aura-sdk — 18 requirements covering the createAuraClient API, session lifecycle, SSE stream management with reconnection/backoff, event emission with in-memory queue, context updates, consent mirroring, profile access/correction, graceful degradation (no-op when unavailable), non-blocking rendering guarantees, structured error types, and PBT properties for queue and prescription store correctness.

aura-react — 12 requirements covering AuraProvider mounting/teardown, all five hooks (useAura, useAuraEmit, usePrescription, useAuraFeedback), render safety guarantees (nothing ever throws in the render phase), prescription delivery with host sovereignty, per-surface subscription isolation, React Strict Mode safety, package boundary constraints, and 10 PBT properties.

aura-devtools — 17 requirements covering all eight views, four simulation tools (Consent Editor, Profile Simulator, Fixture Replayer, Prescription Inspector — all using real AUIP requests through the full pipeline), a typed DevtoolsClient, a registerDevtoolsRoute opt-in server endpoint, UI container options, strict one-way dependency constraint, and 10 correctness properties including referential integrity, simulation fidelity, and connection leak prevention.