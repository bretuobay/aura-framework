import * as fc from "fast-check";
import type { AuraEvent } from "../../event.js";
import { arbNonEmptyString, arbISOTimestamp } from "./primitives.arb.js";

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
 * Generates a valid AuraEvent with required fields and optional dataClasses.
 */
export function arbAuraEvent(): fc.Arbitrary<AuraEvent> {
  return fc
    .record({
      type: arbNonEmptyString(),
      surfaceId: arbNonEmptyString(),
      timestamp: arbISOTimestamp(),
      payload: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.jsonValue()
      ),
      dataClasses: fc.option(
        fc.subarray([...DataClassValues], { minLength: 0 }),
        { nil: undefined }
      ),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        type: obj.type,
        surfaceId: obj.surfaceId,
        timestamp: obj.timestamp,
        payload: obj.payload,
      };
      if (obj.dataClasses !== undefined) result.dataClasses = obj.dataClasses;
      return result as AuraEvent;
    });
}
