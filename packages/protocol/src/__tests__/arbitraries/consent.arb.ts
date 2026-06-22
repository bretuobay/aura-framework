import * as fc from "fast-check";
import type { ConsentProfile } from "../../consent.js";

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
 * Generates a valid ConsentProfile — a partial record of DataClass keys mapped to booleans.
 * Uses fc.subarray() to pick a random subset of DataClass values, then maps each to a boolean.
 */
export function arbConsentProfile(): fc.Arbitrary<ConsentProfile> {
  return fc
    .tuple(
      fc.subarray([...DataClassValues], { minLength: 0 }),
      fc.array(fc.boolean(), {
        minLength: DataClassValues.length,
        maxLength: DataClassValues.length,
      }),
    )
    .map(([keys, booleans]) => {
      const profile: Record<string, boolean> = {};
      for (let i = 0; i < keys.length; i++) {
        profile[keys[i]] = booleans[i];
      }
      return profile as ConsentProfile;
    });
}
