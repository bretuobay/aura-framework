import fc from "fast-check";
import type {
  CapabilityManifest,
  ManifestSurface,
  ManifestComponent,
  ConsentProfile,
  ContextModel,
  RiskClass,
  DataClass,
  NetworkQuality,
  LayoutStability,
  LayoutStrategy,
} from "@aura/protocol";
import type { AuraClientConfig } from "@aura/sdk";

// =============================================================================
// Enum Arbitraries
// =============================================================================

const allRiskClasses: RiskClass[] = ["low", "medium", "high", "critical"];
export const arbRiskClass: fc.Arbitrary<RiskClass> = fc.constantFrom(...allRiskClasses);

const allDataClasses: DataClass[] = [
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
];
export const arbDataClass: fc.Arbitrary<DataClass> = fc.constantFrom(...allDataClasses);

const allNetworkQualities: NetworkQuality[] = ["offline", "slow", "moderate", "fast"];
export const arbNetworkQuality: fc.Arbitrary<NetworkQuality> = fc.constantFrom(
  ...allNetworkQualities,
);

const allLayoutStrategies: LayoutStrategy[] = ["none", "reserve-space", "skeleton", "host-default"];
export const arbLayoutStrategy: fc.Arbitrary<LayoutStrategy> = fc.constantFrom(
  ...allLayoutStrategies,
);

// =============================================================================
// Endpoint Arbitrary
// =============================================================================

export const arbEndpoint: fc.Arbitrary<string> = fc.constantFrom(
  "https://aura.example.com",
  "https://api.test.io/aura",
  "http://localhost:3000",
  "https://aura.staging.internal/v1",
  "http://localhost:8080/aura",
);

// =============================================================================
// ConsentProfile Arbitrary
// =============================================================================

export const arbConsentProfile: fc.Arbitrary<ConsentProfile> = fc
  .subarray(allDataClasses, { minLength: 0 })
  .chain((keys) =>
    fc.tuple(...keys.map(() => fc.boolean())).map((values) => {
      const profile: ConsentProfile = {};
      keys.forEach((key, i) => {
        profile[key] = values[i];
      });
      return profile;
    }),
  );

// =============================================================================
// ContextModel Arbitrary
// =============================================================================

const arbViewport: fc.Arbitrary<{ width: number; height: number }> = fc.record({
  width: fc.integer({ min: 1, max: 32767 }),
  height: fc.integer({ min: 1, max: 32767 }),
});

export const arbContextModel: fc.Arbitrary<ContextModel> = fc.record(
  {
    device: fc.string({ minLength: 1, maxLength: 30 }),
    locale: fc.stringMatching(/^[a-z]{2}(-[A-Z]{2})?$/, { size: "xsmall" }),
    viewport: arbViewport,
    networkQuality: arbNetworkQuality,
    sequenceId: fc.nat({ max: 10000 }),
    taskState: fc.constant(undefined),
    domain: fc.constant(undefined),
  },
  { requiredKeys: ["device", "locale"] },
);

// =============================================================================
// CapabilityManifest Arbitrary
// =============================================================================

const arbManifestComponent: fc.Arbitrary<ManifestComponent> = fc.record(
  {
    componentId: fc.string({ minLength: 1, maxLength: 30 }),
    variants: fc
      .array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 4 })
      .map((arr) => arr as [string, ...string[]]),
    adaptableProps: fc.constant(undefined),
    riskClass: arbRiskClass,
    constraints: fc.record(
      {
        requiresConsent: fc.array(arbDataClass, { minLength: 0, maxLength: 3 }),
        reversible: fc.boolean(),
      },
      { requiredKeys: [] },
    ),
  },
  { requiredKeys: ["componentId", "variants", "riskClass"] },
);

const arbLayoutStability: fc.Arbitrary<LayoutStability> = arbLayoutStrategy.chain((strategy) => {
  if (strategy === "reserve-space" || strategy === "skeleton") {
    return fc.integer({ min: 0, max: 5000 }).map((ms) => ({
      strategy,
      maxDecisionWaitMs: ms,
    }));
  }
  return fc.record(
    { strategy: fc.constant(strategy), maxDecisionWaitMs: fc.nat({ max: 5000 }) },
    { requiredKeys: ["strategy"] },
  );
});

const arbManifestSurface: fc.Arbitrary<ManifestSurface> = fc.record(
  {
    surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
    components: fc.array(arbManifestComponent, { minLength: 0, maxLength: 3 }),
    layoutStability: arbLayoutStability,
    consentRequirements: fc.array(arbDataClass, { minLength: 0, maxLength: 4 }),
  },
  { requiredKeys: ["surfaceId", "components"] },
);

export const arbCapabilityManifest: fc.Arbitrary<CapabilityManifest> = fc.record(
  {
    version: fc.string({ minLength: 1, maxLength: 10 }),
    surfaces: fc.array(arbManifestSurface, { minLength: 0, maxLength: 3 }),
  },
  { requiredKeys: ["surfaces"] },
);

// =============================================================================
// AuraClientConfig Arbitrary (final composite)
// =============================================================================

export const arbAuraClientConfig: fc.Arbitrary<AuraClientConfig> = fc.record({
  endpoint: arbEndpoint,
  manifest: arbCapabilityManifest,
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  consentProfile: arbConsentProfile,
  context: arbContextModel,
});
