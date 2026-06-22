/**
 * Custom fast-check generators for CapabilityManifest and related types.
 * Produces values conforming to @aura/protocol manifest schemas.
 */
import fc from "fast-check";
import type {
  CapabilityManifest,
  ManifestSurface,
  ManifestComponent,
  LayoutStability,
  RiskClass,
  DataClass,
  LayoutStrategy,
} from "@aura/protocol";

// =============================================================================
// Shared enum value sets (matching @aura/protocol enums)
// =============================================================================

const RISK_CLASSES: RiskClass[] = ["low", "medium", "high", "critical"];
const DATA_CLASSES: DataClass[] = [
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
const LAYOUT_STRATEGIES: LayoutStrategy[] = ["none", "reserve-space", "skeleton", "host-default"];

export { DATA_CLASSES };

// =============================================================================
// NonEmptyString arbitrary
// =============================================================================

export const arbNonEmptyString: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z][a-zA-Z0-9_-]{0,30}$/,
);

// =============================================================================
// LayoutStability
// =============================================================================

export const arbLayoutStability: fc.Arbitrary<LayoutStability> = fc
  .record({
    strategy: fc.constantFrom(...LAYOUT_STRATEGIES),
    maxDecisionWaitMs: fc.integer({ min: 0, max: 5000 }),
  })
  .map((val) => {
    // The schema requires maxDecisionWaitMs when strategy is "reserve-space" or "skeleton"
    if (val.strategy === "none" || val.strategy === "host-default") {
      // Can optionally omit maxDecisionWaitMs for these strategies
      const { maxDecisionWaitMs, ...rest } = val;
      return Math.random() > 0.5 ? val : rest;
    }
    return val;
  }) as fc.Arbitrary<LayoutStability>;

// =============================================================================
// ManifestComponent
// =============================================================================

export const arbManifestComponent: fc.Arbitrary<ManifestComponent> = fc
  .tuple(
    arbNonEmptyString, // componentId
    fc.array(arbNonEmptyString, { minLength: 1, maxLength: 5 }), // variants (nonempty)
    fc.constantFrom(...RISK_CLASSES), // riskClass
    fc.option(
      fc.array(fc.constantFrom(...DATA_CLASSES), {
        minLength: 1,
        maxLength: 3,
      }),
      { nil: undefined },
    ), // requiresConsent
  )
  .map(([componentId, variants, riskClass, requiresConsent]) => {
    const component: ManifestComponent = {
      componentId,
      variants: variants as [string, ...string[]],
      riskClass,
    };
    if (requiresConsent !== undefined) {
      component.constraints = { requiresConsent };
    }
    return component;
  });

// =============================================================================
// ManifestSurface
// =============================================================================

export const arbManifestSurface: fc.Arbitrary<ManifestSurface> = fc
  .tuple(
    arbNonEmptyString, // surfaceId
    fc.array(arbManifestComponent, { minLength: 1, maxLength: 4 }), // components
    fc.option(arbLayoutStability, { nil: undefined }), // layoutStability
    fc.option(
      fc.array(fc.constantFrom(...DATA_CLASSES), {
        minLength: 1,
        maxLength: 3,
      }),
      { nil: undefined },
    ), // consentRequirements
  )
  .map(([surfaceId, components, layoutStability, consentRequirements]) => {
    const surface: ManifestSurface = {
      surfaceId,
      components,
    };
    if (layoutStability !== undefined) {
      surface.layoutStability = layoutStability;
    }
    if (consentRequirements !== undefined) {
      surface.consentRequirements = consentRequirements;
    }
    return surface;
  });

// =============================================================================
// CapabilityManifest
// =============================================================================

export const arbCapabilityManifest: fc.Arbitrary<CapabilityManifest> = fc
  .tuple(
    fc.option(arbNonEmptyString, { nil: undefined }), // version (optional)
    fc.array(arbManifestSurface, { minLength: 1, maxLength: 5 }), // surfaces
  )
  .map(([version, surfaces]) => {
    const manifest: CapabilityManifest = { surfaces };
    if (version !== undefined) {
      manifest.version = version;
    }
    return manifest;
  });

/** Manifest with an explicit version string (useful for manifestVersion pinning tests) */
export const arbCapabilityManifestWithVersion: fc.Arbitrary<CapabilityManifest> = fc
  .tuple(arbNonEmptyString, fc.array(arbManifestSurface, { minLength: 1, maxLength: 5 }))
  .map(([version, surfaces]) => ({
    version,
    surfaces,
  }));

/** Manifest without a version string (for testing "unversioned" fallback) */
export const arbCapabilityManifestWithoutVersion: fc.Arbitrary<CapabilityManifest> = fc
  .array(arbManifestSurface, { minLength: 1, maxLength: 5 })
  .map((surfaces) => ({ surfaces }));
