/**
 * Risk-Class Enforcement for the @aura/rules pipeline.
 *
 * Adjusts `CandidatePrescription.mode` based on risk-class policy:
 * - Low: pass through unchanged
 * - Medium: downgrade `autoApply` → `recommend` unless manifest declares `allowAutoApply: true`
 * - High: force `askUser`
 * - Critical: force `observeOnly`
 *
 * Returns new array of copies — input candidates are never mutated.
 *
 * Requirements validated: 7.1, 7.2, 7.3, 7.4
 */

import type {
  CandidatePrescription,
  CapabilityManifest,
} from "../schema/types.js";

// ─── Manifest Lookup ──────────────────────────────────────────────────────────

/**
 * Checks whether any component under the candidate's surface declares
 * `allowAutoApply: true`. The field is treated as an extension property
 * on the ManifestComponent (not part of the core schema).
 */
function surfaceAllowsAutoApply(
  surfaceId: string,
  manifest: CapabilityManifest
): boolean {
  const surface = manifest.surfaces.find((s) => s.surfaceId === surfaceId);
  if (!surface) {
    return false;
  }

  return surface.components.some(
    (component) => (component as Record<string, unknown>).allowAutoApply === true
  );
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Enforces risk-class policy on an array of candidate prescriptions.
 *
 * Does not mutate input candidates — returns a new array of shallow copies
 * with the `mode` field adjusted per risk-class rules.
 */
export function enforceRiskClass(
  candidates: CandidatePrescription[],
  manifest: CapabilityManifest
): CandidatePrescription[] {
  return candidates.map((candidate) => {
    switch (candidate.riskClass) {
      case "low":
        // Low risk: allow autoApply and recommend unchanged
        return { ...candidate };

      case "medium":
        // Medium risk: downgrade autoApply → recommend unless manifest allows
        if (
          candidate.mode === "autoApply" &&
          !surfaceAllowsAutoApply(candidate.surfaceId, manifest)
        ) {
          return { ...candidate, mode: "recommend" as const };
        }
        return { ...candidate };

      case "high":
        // High risk: force askUser
        return { ...candidate, mode: "askUser" as const };

      case "critical":
        // Critical risk: force observeOnly
        return { ...candidate, mode: "observeOnly" as const };

      default:
        // Unknown risk class — pass through unchanged (defensive)
        return { ...candidate };
    }
  });
}
