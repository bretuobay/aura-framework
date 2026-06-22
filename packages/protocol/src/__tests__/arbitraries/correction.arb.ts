import * as fc from "fast-check";
import type { ProfileCorrection } from "../../profile.js";
import { arbNonEmptyString } from "./primitives.arb.js";

function arbRemoveCorrection(): fc.Arbitrary<ProfileCorrection> {
  return fc
    .record({
      action: fc.constant("remove" as const),
      attributeId: arbNonEmptyString(),
    })
    .map((v) => v as ProfileCorrection);
}

function arbCorrectCorrection(): fc.Arbitrary<ProfileCorrection> {
  return fc
    .record({
      action: fc.constant("correct" as const),
      attributeId: arbNonEmptyString(),
      newValue: arbNonEmptyString(),
    })
    .map((v) => v as ProfileCorrection);
}

/**
 * Generates a valid ProfileCorrection — either `remove` or `correct` variant.
 */
export function arbProfileCorrection(): fc.Arbitrary<ProfileCorrection> {
  return fc.oneof(arbRemoveCorrection(), arbCorrectCorrection());
}
