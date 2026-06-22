/**
 * Prescription matching logic for the fixture-based test runner.
 *
 * Matches output UIPrescriptions against PrescriptionMatcher[] criteria.
 * Each matcher specifies optional fields; only specified fields are checked.
 *
 * Limitation: ruleId matching is not supported because UIPrescription (from
 * @aura/protocol) does not carry a ruleId field — it has a hashed `id` field
 * (prescriptionId). The ruleId is stripped during protocol validation.
 * If a matcher specifies ruleId, it is skipped with a documented note.
 */

import type { UIPrescription } from "@aura/protocol";
import type { PrescriptionMatcher } from "../schema/fixture.schema.js";

export interface MatchResult {
  matched: boolean;
  mismatches: string[];
}

/**
 * Checks whether a single prescription satisfies all specified fields in a matcher.
 * Returns true if every specified field in the matcher matches the prescription.
 */
function prescriptionMatchesMatcher(
  prescription: UIPrescription,
  matcher: PrescriptionMatcher
): boolean {
  if (matcher.surfaceId !== undefined) {
    if (prescription.surfaceId !== matcher.surfaceId) {
      return false;
    }
  }

  // ruleId matching is skipped — UIPrescription does not carry ruleId.
  // The `id` field is a hashed prescriptionId, not the original ruleId.

  if (matcher.mode !== undefined) {
    if (prescription.mode !== matcher.mode) {
      return false;
    }
  }

  if (matcher.adaptationType !== undefined) {
    const hasMatchingAdaptation = prescription.adaptations.some(
      (adaptation) => adaptation.type === matcher.adaptationType
    );
    if (!hasMatchingAdaptation) {
      return false;
    }
  }

  return true;
}

/**
 * Matches output prescriptions against a set of PrescriptionMatchers.
 *
 * For matchers with `count`, verify that exactly `count` prescriptions match
 * the matcher's field criteria.
 * For matchers without `count`, verify at least one prescription matches.
 *
 * A prescription matches a matcher if ALL specified fields in the matcher
 * match the corresponding field in the prescription:
 * - surfaceId: prescription.surfaceId === matcher.surfaceId
 * - ruleId: skipped (UIPrescription doesn't have ruleId — see limitation note above)
 * - mode: prescription.mode === matcher.mode
 * - adaptationType: any adaptation in prescription.adaptations has matching type
 */
export function matchPrescriptions(
  output: UIPrescription[],
  expected: PrescriptionMatcher[]
): MatchResult {
  const mismatches: string[] = [];

  for (const matcher of expected) {
    const matchingPrescriptions = output.filter((p) =>
      prescriptionMatchesMatcher(p, matcher)
    );

    if (matcher.count !== undefined) {
      // Exact count matching
      if (matchingPrescriptions.length !== matcher.count) {
        const matcherDesc = formatMatcher(matcher);
        mismatches.push(
          `Expected exactly ${matcher.count} prescription(s) matching ${matcherDesc}, ` +
            `but found ${matchingPrescriptions.length}`
        );
      }
    } else {
      // At least one match required
      if (matchingPrescriptions.length === 0) {
        const matcherDesc = formatMatcher(matcher);
        mismatches.push(
          `Expected at least one prescription matching ${matcherDesc}, but found none`
        );
      }
    }
  }

  return {
    matched: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Formats a matcher into a human-readable description for diff output.
 */
function formatMatcher(matcher: PrescriptionMatcher): string {
  const parts: string[] = [];

  if (matcher.surfaceId !== undefined) {
    parts.push(`surfaceId="${matcher.surfaceId}"`);
  }
  if (matcher.ruleId !== undefined) {
    parts.push(`ruleId="${matcher.ruleId}" (skipped — not matchable)`);
  }
  if (matcher.mode !== undefined) {
    parts.push(`mode="${matcher.mode}"`);
  }
  if (matcher.adaptationType !== undefined) {
    parts.push(`adaptationType="${matcher.adaptationType}"`);
  }
  if (matcher.count !== undefined) {
    parts.push(`count=${matcher.count}`);
  }

  return `{ ${parts.join(", ")} }`;
}
