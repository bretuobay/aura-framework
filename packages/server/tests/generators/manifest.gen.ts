import fc from "fast-check";
import type { CapabilityManifest } from "@aura/protocol";

const riskClasses = ["low", "medium", "high", "critical"] as const;
const layoutStrategies = ["none", "reserve-space", "skeleton", "host-default"] as const;
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

/**
 * Arbitrary for a valid LayoutStability object.
 * Respects the superRefine rule: maxDecisionWaitMs required for "reserve-space" and "skeleton".
 */
const arbLayoutStability = fc.oneof(
  // Strategies that don't require maxDecisionWaitMs
  fc.record({
    strategy: fc.constantFrom("none" as const, "host-default" as const),
    maxDecisionWaitMs: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
  }),
  // Strategies that require maxDecisionWaitMs
  fc.record({
    strategy: fc.constantFrom("reserve-space" as const, "skeleton" as const),
    maxDecisionWaitMs: fc.integer({ min: 0, max: 5000 }),
  })
);

/**
 * Arbitrary for a valid ManifestComponent.
 */
const arbManifestComponent = fc.record({
  componentId: fc.string({ minLength: 1, maxLength: 30 }),
  variants: fc
    .array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
    .filter((arr) => arr.length >= 1) as fc.Arbitrary<[string, ...string[]]>,
  adaptableProps: fc.option(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ maxLength: 20 })),
    { nil: undefined }
  ),
  riskClass: fc.constantFrom(...riskClasses),
  constraints: fc.option(
    fc.record({
      requiresConsent: fc.option(
        fc.array(fc.constantFrom(...dataClasses), { minLength: 0, maxLength: 3 }),
        { nil: undefined }
      ),
      reversible: fc.option(fc.boolean(), { nil: undefined }),
    }),
    { nil: undefined }
  ),
});

/**
 * Arbitrary for a valid ManifestSurface.
 */
const arbManifestSurface = fc.record({
  surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
  components: fc.array(arbManifestComponent, { minLength: 1, maxLength: 3 }),
  layoutStability: fc.option(arbLayoutStability, { nil: undefined }),
  consentRequirements: fc.option(
    fc.array(fc.constantFrom(...dataClasses), { minLength: 0, maxLength: 3 }),
    { nil: undefined }
  ),
});

/**
 * Arbitrary for a valid CapabilityManifest matching CapabilityManifestSchema.
 */
export const arbCapabilityManifest: fc.Arbitrary<CapabilityManifest> = fc.record({
  version: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  surfaces: fc.array(arbManifestSurface, { minLength: 1, maxLength: 3 }),
});

/**
 * Arbitrary for an invalid CapabilityManifest violating schema constraints.
 */
export const arbInvalidManifest = fc.oneof(
  // Empty surfaces array (not technically invalid per schema, but let's test empty surfaceId)
  fc.record({
    version: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    surfaces: fc.constant([
      {
        surfaceId: "",
        components: [
          {
            componentId: "c1",
            variants: ["v1"] as [string, ...string[]],
            riskClass: "low" as const,
          },
        ],
      },
    ]),
  }),
  // Component with empty variants array
  fc.record({
    version: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    surfaces: fc.constant([
      {
        surfaceId: "surface-1",
        components: [
          {
            componentId: "c1",
            variants: [] as unknown as [string, ...string[]],
            riskClass: "low" as const,
          },
        ],
      },
    ]),
  }),
  // Empty componentId
  fc.record({
    version: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    surfaces: fc.constant([
      {
        surfaceId: "surface-1",
        components: [
          {
            componentId: "",
            variants: ["v1"] as [string, ...string[]],
            riskClass: "low" as const,
          },
        ],
      },
    ]),
  }),
  // LayoutStability with reserve-space but missing maxDecisionWaitMs
  fc.record({
    version: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    surfaces: fc.constant([
      {
        surfaceId: "surface-1",
        components: [
          {
            componentId: "c1",
            variants: ["v1"] as [string, ...string[]],
            riskClass: "low" as const,
          },
        ],
        layoutStability: {
          strategy: "reserve-space" as const,
        },
      },
    ]),
  }),
  // maxDecisionWaitMs exceeding 5000
  fc.record({
    version: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    surfaces: fc.constant([
      {
        surfaceId: "surface-1",
        components: [
          {
            componentId: "c1",
            variants: ["v1"] as [string, ...string[]],
            riskClass: "low" as const,
          },
        ],
        layoutStability: {
          strategy: "skeleton" as const,
          maxDecisionWaitMs: 6000,
        },
      },
    ]),
  })
);
