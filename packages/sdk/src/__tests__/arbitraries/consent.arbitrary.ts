/**
 * Custom fast-check generators for valid ConsentProfile and consent patches.
 * Produces values conforming to @aura/protocol ConsentProfileSchema.
 */
import fc from "fast-check";
import type { ConsentProfile, DataClass } from "@aura/protocol";
import { DATA_CLASSES } from "./manifest.arbitrary.js";

// =============================================================================
// Valid ConsentProfile
// =============================================================================

/**
 * Generates a valid ConsentProfile — a partial record of DataClass → boolean.
 * The schema allows an empty object {}, a full profile, or any subset.
 */
export const arbConsentProfile: fc.Arbitrary<ConsentProfile> = fc
  .subarray([...DATA_CLASSES], { minLength: 0 })
  .chain((selectedKeys) =>
    fc
      .array(fc.boolean(), {
        minLength: selectedKeys.length,
        maxLength: selectedKeys.length,
      })
      .map((values) => {
        const profile: ConsentProfile = {};
        selectedKeys.forEach((key, i) => {
          profile[key] = values[i];
        });
        return profile;
      })
  );

/**
 * Generates a non-empty ConsentProfile (at least one DataClass key).
 */
export const arbNonEmptyConsentProfile: fc.Arbitrary<ConsentProfile> = fc
  .subarray([...DATA_CLASSES], { minLength: 1 })
  .chain((selectedKeys) =>
    fc
      .array(fc.boolean(), {
        minLength: selectedKeys.length,
        maxLength: selectedKeys.length,
      })
      .map((values) => {
        const profile: ConsentProfile = {};
        selectedKeys.forEach((key, i) => {
          profile[key] = values[i];
        });
        return profile;
      })
  );

/**
 * Generates a ConsentProfile where all included keys are set to true (full consent).
 */
export const arbFullConsentProfile: fc.Arbitrary<ConsentProfile> = fc
  .subarray([...DATA_CLASSES], { minLength: 1 })
  .map((selectedKeys) => {
    const profile: ConsentProfile = {};
    selectedKeys.forEach((key) => {
      profile[key] = true;
    });
    return profile;
  });

/**
 * Generates a consent patch that revokes at least one DataClass (sets to false).
 * Useful for testing consent revocation and prescription removal.
 */
export const arbConsentRevocationPatch: fc.Arbitrary<ConsentProfile> = fc
  .subarray([...DATA_CLASSES], { minLength: 1, maxLength: 4 })
  .map((selectedKeys) => {
    const patch: ConsentProfile = {};
    selectedKeys.forEach((key) => {
      patch[key] = false;
    });
    return patch;
  });

/**
 * Generates a consent patch that grants at least one DataClass (sets to true).
 */
export const arbConsentGrantPatch: fc.Arbitrary<ConsentProfile> = fc
  .subarray([...DATA_CLASSES], { minLength: 1, maxLength: 4 })
  .map((selectedKeys) => {
    const patch: ConsentProfile = {};
    selectedKeys.forEach((key) => {
      patch[key] = true;
    });
    return patch;
  });

/**
 * Generates a consent patch with a mix of grants and revocations.
 */
export const arbMixedConsentPatch: fc.Arbitrary<ConsentProfile> = fc
  .subarray([...DATA_CLASSES], { minLength: 2, maxLength: 6 })
  .chain((selectedKeys) =>
    fc
      .array(fc.boolean(), {
        minLength: selectedKeys.length,
        maxLength: selectedKeys.length,
      })
      .map((values) => {
        const patch: ConsentProfile = {};
        selectedKeys.forEach((key, i) => {
          patch[key] = values[i];
        });
        return patch;
      })
  );

/**
 * Generates a specific DataClass that is being revoked,
 * paired with the full patch. Useful for testing which prescriptions
 * should be removed on revocation.
 */
export const arbRevokedDataClassWithPatch: fc.Arbitrary<{
  revokedClass: DataClass;
  patch: ConsentProfile;
}> = fc
  .constantFrom(...DATA_CLASSES)
  .map((revokedClass) => ({
    revokedClass,
    patch: { [revokedClass]: false } as ConsentProfile,
  }));
