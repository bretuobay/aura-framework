import * as fc from "fast-check";
import type { ExplanationRecord } from "../../explanation.js";
import { arbNonEmptyString, arbConfidence } from "./primitives.arb.js";

/**
 * Generates a valid ExplanationRecord with all required fields.
 */
export function arbExplanationRecord(): fc.Arbitrary<ExplanationRecord> {
  return fc.record({
    id: arbNonEmptyString(),
    summary: arbNonEmptyString(),
    userVisible: fc.boolean(),
    factors: fc.array(fc.string({ minLength: 0, maxLength: 50 }), {
      minLength: 0,
      maxLength: 5,
    }),
    confidence: arbConfidence(),
  });
}
