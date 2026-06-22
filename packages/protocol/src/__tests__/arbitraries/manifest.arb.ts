import * as fc from "fast-check";
import type {
  CapabilityManifest,
  ManifestSurface,
  ManifestComponent,
  LayoutStability,
} from "../../manifest.js";
import { arbNonEmptyString } from "./primitives.arb.js";

const RiskClasses = ["low", "medium", "high", "critical"] as const;
const LayoutStrategies = ["none", "reserve-space", "skeleton", "host-default"] as const;

const DataClassValues = [
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
 * Generates a valid LayoutStability respecting the conditional requirement:
 * - strategy "reserve-space" or "skeleton" must have maxDecisionWaitMs
 * - strategy "none" or "host-default" may optionally have maxDecisionWaitMs
 */
export function arbLayoutStability(): fc.Arbitrary<LayoutStability> {
  return fc.constantFrom(...LayoutStrategies).chain((strategy) => {
    if (strategy === "reserve-space" || strategy === "skeleton") {
      // maxDecisionWaitMs is required for these strategies
      return fc.integer({ min: 0, max: 5000 }).map((ms) => ({ strategy, maxDecisionWaitMs: ms }));
    }
    // maxDecisionWaitMs is optional for "none" and "host-default"
    return fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }).map((ms) => {
      const result: LayoutStability = { strategy };
      if (ms !== undefined) result.maxDecisionWaitMs = ms;
      return result;
    });
  });
}

/**
 * Generates a valid ManifestComponent with required non-empty variants array,
 * valid riskClass, and optional constraints.
 */
export function arbManifestComponent(): fc.Arbitrary<ManifestComponent> {
  return fc
    .record({
      componentId: arbNonEmptyString(),
      variants: fc
        .array(arbNonEmptyString(), { minLength: 1, maxLength: 4 })
        .map((arr) => arr as [string, ...string[]]),
      adaptableProps: fc.option(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.jsonValue()),
        { nil: undefined },
      ),
      riskClass: fc.constantFrom(...RiskClasses),
      constraints: fc.option(
        fc.record({
          requiresConsent: fc.option(fc.subarray([...DataClassValues], { minLength: 1 }), {
            nil: undefined,
          }),
          reversible: fc.option(fc.boolean(), { nil: undefined }),
        }),
        { nil: undefined },
      ),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        componentId: obj.componentId,
        variants: obj.variants,
        riskClass: obj.riskClass,
      };
      if (obj.adaptableProps !== undefined) result.adaptableProps = obj.adaptableProps;
      if (obj.constraints !== undefined) {
        const constraints: Record<string, unknown> = {};
        if (obj.constraints.requiresConsent !== undefined)
          constraints.requiresConsent = obj.constraints.requiresConsent;
        if (obj.constraints.reversible !== undefined)
          constraints.reversible = obj.constraints.reversible;
        if (Object.keys(constraints).length > 0) result.constraints = constraints;
      }
      return result as ManifestComponent;
    });
}

/**
 * Generates a valid ManifestSurface with components, optional layoutStability,
 * and optional consentRequirements.
 */
export function arbManifestSurface(): fc.Arbitrary<ManifestSurface> {
  return fc
    .record({
      surfaceId: arbNonEmptyString(),
      components: fc.array(arbManifestComponent(), {
        minLength: 0,
        maxLength: 3,
      }),
      layoutStability: fc.option(arbLayoutStability(), { nil: undefined }),
      consentRequirements: fc.option(fc.subarray([...DataClassValues], { minLength: 1 }), {
        nil: undefined,
      }),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        surfaceId: obj.surfaceId,
        components: obj.components,
      };
      if (obj.layoutStability !== undefined) result.layoutStability = obj.layoutStability;
      if (obj.consentRequirements !== undefined)
        result.consentRequirements = obj.consentRequirements;
      return result as ManifestSurface;
    });
}

/**
 * Generates a valid CapabilityManifest with optional version and surfaces array.
 */
export function arbCapabilityManifest(): fc.Arbitrary<CapabilityManifest> {
  return fc
    .record({
      version: fc.option(arbNonEmptyString(), { nil: undefined }),
      surfaces: fc.array(arbManifestSurface(), {
        minLength: 0,
        maxLength: 3,
      }),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        surfaces: obj.surfaces,
      };
      if (obj.version !== undefined) result.version = obj.version;
      return result as CapabilityManifest;
    });
}
