/**
 * Consent Gate for the @aura/rules pipeline.
 *
 * Filters out CandidatePrescriptions whose required DataClasses are not
 * consented to in the current ConsentProfile.
 *
 * Requirements validated:
 * - 5.1: Remove candidates requiring unconsented DataClasses (false or absent)
 * - 5.2: Pass through candidates with no requiredConsent (empty dataClassesUsed)
 * - 5.3: Empty ConsentProfile treats all DataClasses as unconsented
 */

import type { CandidatePrescription, ConsentProfile, DataClass } from "../schema/types.js";

/**
 * Determines whether a candidate prescription has consent for all its
 * required DataClasses.
 *
 * A candidate passes if:
 * - It has no required data classes (audit.dataClassesUsed is empty), OR
 * - Every DataClass in audit.dataClassesUsed is explicitly `true` in the consent profile
 *
 * A candidate is blocked if:
 * - Any DataClass in audit.dataClassesUsed is `false` or absent in the consent profile
 */
function hasConsent(candidate: CandidatePrescription, consent: ConsentProfile): boolean {
  const requiredClasses = candidate.audit.dataClassesUsed;

  // No required consent — always passes (Req 5.2)
  if (requiredClasses.length === 0) {
    return true;
  }

  // Check each required DataClass is explicitly true in the consent profile
  // If absent or false, consent is not granted (Req 5.1, 5.3)
  return requiredClasses.every((dataClass: DataClass) => consent[dataClass] === true);
}

/**
 * Filters candidate prescriptions based on the user's consent profile.
 *
 * Removes candidates whose required DataClasses (stored in audit.dataClassesUsed)
 * include any DataClass that is `false` or absent in the consent profile.
 * Candidates with no required DataClasses pass through unconditionally.
 * An empty ConsentProfile ({}) treats all DataClasses as unconsented.
 *
 * @param candidates - Array of candidate prescriptions to filter
 * @param consent - The user's current consent profile
 * @returns Filtered array containing only consented candidates
 */
export function filterByConsent(
  candidates: CandidatePrescription[],
  consent: ConsentProfile,
): CandidatePrescription[] {
  return candidates.filter((candidate) => hasConsent(candidate, consent));
}
