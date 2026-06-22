/**
 * Diff output generation for failed fixture tests.
 *
 * Produces a human-readable diff showing expected matchers vs actual prescriptions
 * to help rule authors diagnose fixture failures.
 */

import type { UIPrescription } from "@aura/protocol";
import type { PrescriptionMatcher } from "../schema/fixture.schema.js";

/**
 * Generates a diff string showing expected matchers and actual output prescriptions
 * for a failed fixture test.
 */
export function generateDiff(expected: PrescriptionMatcher[], actual: UIPrescription[]): string {
  const lines: string[] = [];

  lines.push("── Expected ──────────────────────────────────────────");
  if (expected.length === 0) {
    lines.push("  (no matchers specified)");
  } else {
    for (let i = 0; i < expected.length; i++) {
      lines.push(`  [${i}] ${formatExpectedMatcher(expected[i])}`);
    }
  }

  lines.push("");
  lines.push("── Actual ────────────────────────────────────────────");
  if (actual.length === 0) {
    lines.push("  (no prescriptions produced)");
  } else {
    for (let i = 0; i < actual.length; i++) {
      lines.push(`  [${i}] ${formatActualPrescription(actual[i])}`);
    }
  }

  return lines.join("\n");
}

/**
 * Formats a PrescriptionMatcher into a readable summary showing only specified fields.
 */
function formatExpectedMatcher(matcher: PrescriptionMatcher): string {
  const parts: string[] = [];

  if (matcher.surfaceId !== undefined) {
    parts.push(`surfaceId: "${matcher.surfaceId}"`);
  }
  if (matcher.ruleId !== undefined) {
    parts.push(`ruleId: "${matcher.ruleId}"`);
  }
  if (matcher.mode !== undefined) {
    parts.push(`mode: "${matcher.mode}"`);
  }
  if (matcher.adaptationType !== undefined) {
    parts.push(`adaptationType: "${matcher.adaptationType}"`);
  }
  if (matcher.count !== undefined) {
    parts.push(`count: ${matcher.count}`);
  }

  if (parts.length === 0) {
    return "{ } (matches any prescription)";
  }

  return `{ ${parts.join(", ")} }`;
}

/**
 * Formats a UIPrescription into a readable summary for diff output.
 */
function formatActualPrescription(prescription: UIPrescription): string {
  const adaptationTypes = prescription.adaptations.map((a) => a.type).join(", ");

  return (
    `{ id: "${prescription.id}", ` +
    `surfaceId: "${prescription.surfaceId}", ` +
    `mode: "${prescription.mode}", ` +
    `adaptations: [${adaptationTypes}] }`
  );
}
