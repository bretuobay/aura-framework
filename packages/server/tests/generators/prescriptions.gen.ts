import fc from "fast-check";
import type { UIPrescription } from "@aura/protocol";

const prescriptionModes = ["recommend", "autoApply", "askUser", "observeOnly"] as const;
const latencyClasses = ["immediate", "fast", "deliberate"] as const;
const adaptationTypes = [
  "rank",
  "componentVariant",
  "layout",
  "content",
  "accessibility",
  "filter",
] as const;
const dataClasses = [
  "behavior",
  "personalization",
  "accessibility",
  "approximateLocation",
  "health",
  "education",
  "demographics",
  "emotion",
  "sensitiveInference",
  "cloudModelUse",
  "aggregation",
  "retention",
] as const;
const layoutTypes = ["compact", "expanded", "step-by-step", "accessible"] as const;
const accessibilitySettings = ["fontScale", "contrast", "motion", "inputMode"] as const;

/**
 * Arbitrary for a valid ISO 8601 timestamp.
 */
const arbISOTimestamp = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-12-31T23:59:59Z"),
  })
  .map((d) => d.toISOString());

/**
 * Arbitrary for a valid ContextLock.
 */
const arbContextLock = fc.record({
  sequenceId: fc.nat(),
  capturedAt: arbISOTimestamp,
});

/**
 * Arbitrary for a valid Rank adaptation.
 */
const arbRankAdaptation = fc.record({
  type: fc.constant("rank" as const),
  orderedIds: fc
    .array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
    .filter((arr) => arr.length >= 1) as fc.Arbitrary<[string, ...string[]]>,
  reasonCode: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Arbitrary for a valid ComponentVariant adaptation.
 */
const arbComponentVariantAdaptation = fc.record({
  type: fc.constant("componentVariant" as const),
  slotId: fc.string({ minLength: 1, maxLength: 20 }),
  componentId: fc.string({ minLength: 1, maxLength: 20 }),
  variant: fc.string({ minLength: 1, maxLength: 20 }),
  reasonCode: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Arbitrary for a valid Layout adaptation.
 */
const arbLayoutAdaptation = fc.record({
  type: fc.constant("layout" as const),
  layout: fc.constantFrom(...layoutTypes),
  reasonCode: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Arbitrary for a valid Content adaptation.
 */
const arbContentAdaptation = fc.record({
  type: fc.constant("content" as const),
  target: fc.string({ minLength: 1, maxLength: 20 }),
  contentKey: fc.string({ minLength: 1, maxLength: 20 }),
  content: fc.string({ minLength: 1, maxLength: 50 }),
  reasonCode: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Arbitrary for a valid Accessibility adaptation.
 */
const arbAccessibilityAdaptation = fc.record({
  type: fc.constant("accessibility" as const),
  setting: fc.constantFrom(...accessibilitySettings),
  value: fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.integer(), fc.boolean()),
  reasonCode: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Arbitrary for a valid Filter adaptation.
 */
const arbFilterAdaptation = fc.record({
  type: fc.constant("filter" as const),
  target: fc.string({ minLength: 1, maxLength: 20 }),
  visibleFilters: fc
    .array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
    .filter((arr) => arr.length >= 1) as fc.Arbitrary<[string, ...string[]]>,
  reasonCode: fc.string({ minLength: 1, maxLength: 30 }),
});

/**
 * Arbitrary for any valid Adaptation (discriminated union).
 */
const arbAdaptation = fc.oneof(
  arbRankAdaptation,
  arbComponentVariantAdaptation,
  arbLayoutAdaptation,
  arbContentAdaptation,
  arbAccessibilityAdaptation,
  arbFilterAdaptation,
);

/**
 * Arbitrary for a valid UIPrescription matching UIPrescriptionSchema.
 */
export const arbUIPrescription: fc.Arbitrary<UIPrescription> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }),
  surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
  mode: fc.constantFrom(...prescriptionModes),
  latencyClass: fc.constantFrom(...latencyClasses),
  contextLock: arbContextLock,
  adaptations: fc
    .array(arbAdaptation, { minLength: 1, maxLength: 3 })
    .filter((arr) => arr.length >= 1) as fc.Arbitrary<
    [UIPrescription["adaptations"][number], ...UIPrescription["adaptations"][number][]]
  >,
  constraints: fc.record({
    expiresAt: arbISOTimestamp,
  }),
  manifestVersion: fc.string({ minLength: 1, maxLength: 20 }),
  audit: fc.record({
    dataClassesUsed: fc.option(
      fc.array(fc.constantFrom(...dataClasses), { minLength: 0, maxLength: 4 }),
      { nil: undefined },
    ),
    policyVersion: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    decisionSource: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  }),
  explanation: fc.option(
    fc.record({
      confidence: fc.double({ min: 0, max: 1, noNaN: true }),
      summary: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    }),
    { nil: undefined },
  ),
  adaptationGroups: fc.option(
    fc.array(
      fc.record({
        groupId: fc.string({ minLength: 1, maxLength: 20 }),
        adaptationIds: fc
          .array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 })
          .filter((arr) => arr.length >= 1) as fc.Arbitrary<[string, ...string[]]>,
        atomic: fc.boolean(),
      }),
      { minLength: 0, maxLength: 2 },
    ),
    { nil: undefined },
  ),
});

/**
 * Arbitrary for an invalid UIPrescription violating schema constraints.
 */
export const arbInvalidUIPrescription = fc.oneof(
  // Empty id
  fc.record({
    id: fc.constant(""),
    surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
    mode: fc.constantFrom(...prescriptionModes),
    latencyClass: fc.constantFrom(...latencyClasses),
    contextLock: arbContextLock,
    adaptations: fc.constant([arbRankAdaptation]),
    constraints: fc.record({ expiresAt: arbISOTimestamp }),
    manifestVersion: fc.string({ minLength: 1, maxLength: 20 }),
    audit: fc.constant({}),
  }),
  // Empty surfaceId
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    surfaceId: fc.constant(""),
    mode: fc.constantFrom(...prescriptionModes),
    latencyClass: fc.constantFrom(...latencyClasses),
    contextLock: arbContextLock,
    adaptations: fc.constant([arbRankAdaptation]),
    constraints: fc.record({ expiresAt: arbISOTimestamp }),
    manifestVersion: fc.string({ minLength: 1, maxLength: 20 }),
    audit: fc.constant({}),
  }),
  // Empty adaptations array
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
    mode: fc.constantFrom(...prescriptionModes),
    latencyClass: fc.constantFrom(...latencyClasses),
    contextLock: arbContextLock,
    adaptations: fc.constant([]),
    constraints: fc.record({ expiresAt: arbISOTimestamp }),
    manifestVersion: fc.string({ minLength: 1, maxLength: 20 }),
    audit: fc.constant({}),
  }),
  // Invalid mode
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
    mode: fc.constant("invalidMode"),
    latencyClass: fc.constantFrom(...latencyClasses),
    contextLock: arbContextLock,
    adaptations: fc.constant([arbRankAdaptation]),
    constraints: fc.record({ expiresAt: arbISOTimestamp }),
    manifestVersion: fc.string({ minLength: 1, maxLength: 20 }),
    audit: fc.constant({}),
  }),
);
