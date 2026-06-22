/**
 * Manifest Check for the @aura/rules pipeline.
 *
 * Filters out CandidatePrescriptions that reference surfaces, components,
 * or variants not declared in the session CapabilityManifest.
 *
 * Requirements validated:
 * - 6.1: Discard candidates whose surfaceId is not declared in manifest.surfaces
 * - 6.2: Discard candidates with componentVariant adaptation whose componentId
 *         is not under the referenced surface
 * - 6.3: Discard candidates with componentVariant adaptation whose variant is
 *         not declared for that component
 * - 6.4: Discard candidates with filter adaptation whose target is not declared
 *         in the manifest
 * - 6.5: Keep candidates where all references are valid in the manifest
 */

import type {
  CandidatePrescription,
  CapabilityManifest,
} from "../schema/types.js";

/**
 * Filters candidate prescriptions against the capability manifest.
 *
 * A candidate is discarded if:
 * 1. Its surfaceId is not found in manifest.surfaces
 * 2. Any componentVariant adaptation references a componentId not listed
 *    under the matched surface's components
 * 3. Any componentVariant adaptation references a variant not declared
 *    for the matched component
 * 4. Any filter adaptation references a target not declared in the manifest
 *    (as a surfaceId or componentId)
 *
 * Candidates passing all checks are retained.
 */
export function filterByManifest(
  candidates: CandidatePrescription[],
  manifest: CapabilityManifest
): CandidatePrescription[] {
  // Build lookup structures for efficient manifest querying
  const surfaceMap = new Map(
    manifest.surfaces.map((s) => [s.surfaceId, s])
  );

  // Build a set of all declared identifiers (surfaceIds + componentIds)
  // for filter target validation
  const allDeclaredIds = new Set<string>();
  for (const surface of manifest.surfaces) {
    allDeclaredIds.add(surface.surfaceId);
    for (const component of surface.components) {
      allDeclaredIds.add(component.componentId);
    }
  }

  return candidates.filter((candidate) => {
    // Requirement 6.1: Check surfaceId exists in manifest
    const surface = surfaceMap.get(candidate.surfaceId);
    if (!surface) {
      return false;
    }

    // Build component lookup for this surface
    const componentMap = new Map(
      surface.components.map((c) => [c.componentId, c])
    );

    // Check each adaptation
    for (const adaptation of candidate.adaptations) {
      if (adaptation.type === "componentVariant") {
        // Requirement 6.2: Check componentId exists under the referenced surface
        const component = componentMap.get(adaptation.componentId);
        if (!component) {
          return false;
        }

        // Requirement 6.3: Check variant is declared for that component
        if (!component.variants.includes(adaptation.variant)) {
          return false;
        }
      } else if (adaptation.type === "filter") {
        // Requirement 6.4: Check filter target is declared in the manifest
        if (!allDeclaredIds.has(adaptation.target)) {
          return false;
        }
      }
    }

    // Requirement 6.5: All references valid — keep this candidate
    return true;
  });
}
