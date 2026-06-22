/**
 * Protocol Validation for the @aura/rules pipeline.
 *
 * Maps CandidatePrescription objects to the UIPrescription shape defined
 * in @aura/protocol, validates each through UIPrescriptionSchema.safeParse(),
 * discards invalid candidates with logged errors, and returns only valid
 * prescriptions. This function never throws.
 *
 * Requirements validated:
 * - 9.1: Validate each candidate through UIPrescriptionSchema
 * - 9.2: Discard failed candidates, log errors, continue without throwing
 * - 9.3: Every returned element passes UIPrescriptionSchema.safeParse()
 * - 9.5: Return empty array when all candidates fail validation
 */

import { UIPrescriptionSchema } from "@aura/protocol";
import type { UIPrescription } from "@aura/protocol";
import type { CandidatePrescription } from "../schema/types.js";

/**
 * Maps a CandidatePrescription to the UIPrescription shape expected by
 * UIPrescriptionSchema. Fields like ruleId, riskClass, and priority are
 * excluded as they are not part of the protocol schema.
 */
function mapToProtocolShape(candidate: CandidatePrescription): unknown {
  const mapped: Record<string, unknown> = {
    id: candidate.prescriptionId,
    surfaceId: candidate.surfaceId,
    mode: candidate.mode,
    latencyClass: candidate.latencyClass,
    contextLock: candidate.contextLock,
    adaptations: candidate.adaptations,
    constraints: candidate.constraints,
    manifestVersion: candidate.manifestVersion,
    audit: {
      dataClassesUsed: candidate.audit.dataClassesUsed,
      decisionSource: candidate.audit.decisionSource,
    },
  };

  if (candidate.explanation) {
    mapped.explanation = {
      confidence: candidate.explanation.confidence,
      summary: candidate.explanation.summary,
    };
  }

  return mapped;
}

/**
 * Validates an array of CandidatePrescription objects against UIPrescriptionSchema.
 *
 * Each candidate is mapped to the UIPrescription shape and validated via
 * safeParse(). Candidates that fail validation are discarded with an error
 * log identifying the ruleId and validation issues. Only valid prescriptions
 * are returned.
 *
 * This function never throws — if all candidates fail, an empty array is returned.
 */
export function validatePrescriptions(candidates: CandidatePrescription[]): UIPrescription[] {
  const valid: UIPrescription[] = [];

  for (const candidate of candidates) {
    try {
      const mapped = mapToProtocolShape(candidate);
      const result = UIPrescriptionSchema.safeParse(mapped);

      if (result.success) {
        valid.push(result.data);
      } else {
        console.error(
          `[protocol-validate] Candidate from rule "${candidate.ruleId}" failed validation:`,
          result.error.issues,
        );
      }
    } catch (error) {
      console.error(
        `[protocol-validate] Unexpected error validating candidate from rule "${candidate.ruleId}":`,
        error,
      );
    }
  }

  return valid;
}
