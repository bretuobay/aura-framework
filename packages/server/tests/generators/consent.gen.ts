import fc from "fast-check";
import type { ConsentProfile, ConsentRequest } from "@aura/protocol";

const dataClasses = [
  "behavior",
  "personalization",
  "accessibility",
  "approximateLocation",
  "health",
  "education",
  "demographics",
  "emotion",
  "sensitiveInference",
  "cloudModelUse",
  "aggregation",
  "retention",
] as const;

/**
 * Arbitrary for a valid ConsentProfile matching ConsentProfileSchema.
 * Generates a partial record of DataClass keys → boolean values.
 */
export const arbConsentProfile: fc.Arbitrary<ConsentProfile> = fc
  .subarray([...dataClasses], { minLength: 0 })
  .chain((keys) =>
    fc.tuple(...keys.map(() => fc.boolean())).map((values) => {
      const profile: Record<string, boolean> = {};
      keys.forEach((key, i) => {
        profile[key] = values[i];
      });
      return profile as ConsentProfile;
    }),
  );

/**
 * Arbitrary for an invalid ConsentProfile.
 * Uses non-DataClass keys or non-boolean values.
 */
export const arbInvalidConsentProfile = fc.oneof(
  // Non-boolean value for a valid DataClass key
  fc.constantFrom(...dataClasses).map((key) => ({
    [key]: "yes" as unknown as boolean,
  })),
  // Invalid key (not a DataClass)
  fc.record({
    invalidDataClass: fc.boolean(),
  }),
);

/**
 * Arbitrary for a valid ConsentRequest matching ConsentRequestSchema.
 */
export const arbConsentRequest: fc.Arbitrary<ConsentRequest> = fc.record({
  sessionId: fc.string({ minLength: 1, maxLength: 36 }),
  consentPatch: arbConsentProfile,
});

/**
 * Arbitrary for an invalid ConsentRequest.
 */
export const arbInvalidConsentRequest = fc.oneof(
  // Empty sessionId
  fc.record({
    sessionId: fc.constant(""),
    consentPatch: arbConsentProfile,
  }),
  // Invalid consentPatch with non-boolean value
  fc.record({
    sessionId: fc.string({ minLength: 1, maxLength: 36 }),
    consentPatch: fc.constant({ behavior: "yes" as unknown as boolean }),
  }),
);
