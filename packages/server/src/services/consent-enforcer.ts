/**
 * ConsentEnforcer service for @aura/server.
 *
 * Centralized consent checking applied at every data boundary:
 * event ingestion, pipeline input, prescription emission, and profile access.
 */

import type {
  AuraEvent,
  ConsentProfile,
  UIPrescription,
  ProfileAttribute,
} from "@aura/protocol";
import type { DataClass } from "@aura/protocol";

/**
 * Interface for the consent enforcement service.
 * Applied at four boundaries: event ingestion, pipeline input,
 * prescription emission, and profile access.
 */
export interface IConsentEnforcer {
  /** Filter event payloads, stripping fields whose dataClass is revoked */
  filterEvents(events: AuraEvent[], consentProfile: ConsentProfile): AuraEvent[];

  /** Check if a prescription's dataClassesUsed are all permitted */
  isPrescriptionPermitted(
    prescription: UIPrescription,
    consentProfile: ConsentProfile
  ): boolean;

  /** Filter profile attributes to only consent-permitted, non-expired ones */
  filterProfileAttributes(
    attributes: ProfileAttribute[],
    consentProfile: ConsentProfile,
    asOf: string
  ): ProfileAttribute[];

  /** Build pipeline input filtering: remove revoked-class attributes */
  filterPipelineAttributes(
    attributes: ProfileAttribute[],
    consentProfile: ConsentProfile
  ): ProfileAttribute[];
}

/**
 * Determines if a DataClass is revoked in the consent profile.
 * A class is revoked only if explicitly set to `false`.
 * Absent keys are treated as permitted (default allow).
 */
function isRevoked(dataClass: DataClass, consentProfile: ConsentProfile): boolean {
  return consentProfile[dataClass] === false;
}

/**
 * Factory function to create a ConsentEnforcer instance.
 */
export function createConsentEnforcer(): IConsentEnforcer {
  return {
    filterEvents(
      events: AuraEvent[],
      consentProfile: ConsentProfile
    ): AuraEvent[] {
      return events.map((event) => {
        // Events without dataClasses pass through unchanged
        if (!event.dataClasses || event.dataClasses.length === 0) {
          return event;
        }

        // Check if ANY dataClass on the event is revoked
        const hasRevokedClass = event.dataClasses.some((dc) =>
          isRevoked(dc, consentProfile)
        );

        if (!hasRevokedClass) {
          // All data classes are permitted — event passes through unchanged
          return event;
        }

        // Check if ALL data classes are revoked — exclude entire event
        const allRevoked = event.dataClasses.every((dc) =>
          isRevoked(dc, consentProfile)
        );

        if (allRevoked) {
          // All data classes revoked — exclude entire event by stripping payload
          // We still include the event but with empty payload to maintain event count semantics
          // Actually per design: "If ALL data classes on the event are revoked, exclude the entire event"
          // This means we filter it out completely
          return null as unknown as AuraEvent;
        }

        // SOME are revoked — strip the entire payload (replace with empty object)
        // since we can't determine which payload fields map to which classes
        return {
          ...event,
          payload: {},
        };
      }).filter((event): event is AuraEvent => event !== null);
    },

    isPrescriptionPermitted(
      prescription: UIPrescription,
      consentProfile: ConsentProfile
    ): boolean {
      const dataClassesUsed = prescription.audit?.dataClassesUsed;

      // If dataClassesUsed is undefined or empty, the prescription is permitted
      if (!dataClassesUsed || dataClassesUsed.length === 0) {
        return true;
      }

      // If any DataClass in dataClassesUsed is revoked, prescription is not permitted
      return !dataClassesUsed.some((dc) => isRevoked(dc, consentProfile));
    },

    filterProfileAttributes(
      attributes: ProfileAttribute[],
      consentProfile: ConsentProfile,
      asOf: string
    ): ProfileAttribute[] {
      return attributes.filter((attr) => {
        // Exclude if the attribute's dataClass is revoked
        if (isRevoked(attr.dataClass, consentProfile)) {
          return false;
        }

        // Exclude if the attribute has expired (expiresAt <= asOf)
        if (attr.expiresAt && attr.expiresAt <= asOf) {
          return false;
        }

        return true;
      });
    },

    filterPipelineAttributes(
      attributes: ProfileAttribute[],
      consentProfile: ConsentProfile
    ): ProfileAttribute[] {
      // Same as filterProfileAttributes but without expiry check
      return attributes.filter((attr) => {
        return !isRevoked(attr.dataClass, consentProfile);
      });
    },
  };
}
