import * as fc from "fast-check";
import type { ProfileAttribute } from "../../profile.js";
import { arbNonEmptyString, arbConfidence, arbISOTimestamp } from "./primitives.arb.js";

const ProfileProvenances = ["explicit", "inferred", "imported"] as const;

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
 * Generates a valid ProfileAttribute with all required fields and optional expiresAt.
 */
export function arbProfileAttribute(): fc.Arbitrary<ProfileAttribute> {
  return fc
    .record({
      id: arbNonEmptyString(),
      key: arbNonEmptyString(),
      value: fc.jsonValue(),
      provenance: fc.constantFrom(...ProfileProvenances),
      confidence: arbConfidence(),
      dataClass: fc.constantFrom(...DataClassValues),
      expiresAt: fc.option(arbISOTimestamp(), { nil: undefined }),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        id: obj.id,
        key: obj.key,
        value: obj.value,
        provenance: obj.provenance,
        confidence: obj.confidence,
        dataClass: obj.dataClass,
      };
      if (obj.expiresAt !== undefined) result.expiresAt = obj.expiresAt;
      return result as ProfileAttribute;
    });
}
