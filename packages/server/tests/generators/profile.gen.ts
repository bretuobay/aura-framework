import fc from "fast-check";
import type { ProfileAttribute, ProfileCorrection } from "@aura/protocol";

const provenances = ["explicit", "inferred", "imported"] as const;
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
 * Arbitrary for a valid ISO 8601 timestamp.
 */
const arbISOTimestamp = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-12-31T23:59:59Z"),
  })
  .map((d) => d.toISOString());

/**
 * Arbitrary for a valid ProfileAttribute matching ProfileAttributeSchema.
 */
export const arbProfileAttribute: fc.Arbitrary<ProfileAttribute> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }),
  key: fc.string({ minLength: 1, maxLength: 30 }),
  value: fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  provenance: fc.constantFrom(...provenances),
  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  dataClass: fc.constantFrom(...dataClasses),
  expiresAt: fc.option(arbISOTimestamp, { nil: undefined }),
});

/**
 * Arbitrary for an invalid ProfileAttribute that violates schema constraints.
 */
export const arbInvalidProfileAttribute = fc.oneof(
  // Empty id
  fc.record({
    id: fc.constant(""),
    key: fc.string({ minLength: 1, maxLength: 30 }),
    value: fc.string(),
    provenance: fc.constantFrom(...provenances),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    dataClass: fc.constantFrom(...dataClasses),
    expiresAt: fc.constant(undefined),
  }),
  // Empty key
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    key: fc.constant(""),
    value: fc.string(),
    provenance: fc.constantFrom(...provenances),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    dataClass: fc.constantFrom(...dataClasses),
    expiresAt: fc.constant(undefined),
  }),
  // Confidence out of range (>1)
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    key: fc.string({ minLength: 1, maxLength: 30 }),
    value: fc.string(),
    provenance: fc.constantFrom(...provenances),
    confidence: fc.double({ min: 1.01, max: 10, noNaN: true }),
    dataClass: fc.constantFrom(...dataClasses),
    expiresAt: fc.constant(undefined),
  }),
  // Confidence out of range (<0)
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    key: fc.string({ minLength: 1, maxLength: 30 }),
    value: fc.string(),
    provenance: fc.constantFrom(...provenances),
    confidence: fc.double({ min: -10, max: -0.01, noNaN: true }),
    dataClass: fc.constantFrom(...dataClasses),
    expiresAt: fc.constant(undefined),
  }),
  // Invalid provenance
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    key: fc.string({ minLength: 1, maxLength: 30 }),
    value: fc.string(),
    provenance: fc.constant("unknown" as (typeof provenances)[number]),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    dataClass: fc.constantFrom(...dataClasses),
    expiresAt: fc.constant(undefined),
  })
);

/**
 * Arbitrary for a valid ProfileCorrection (remove action).
 */
const arbProfileCorrectionRemove = fc.record({
  action: fc.constant("remove" as const),
  attributeId: fc.string({ minLength: 1, maxLength: 36 }),
});

/**
 * Arbitrary for a valid ProfileCorrection (correct action).
 */
const arbProfileCorrectionCorrect = fc.record({
  action: fc.constant("correct" as const),
  attributeId: fc.string({ minLength: 1, maxLength: 36 }),
  newValue: fc.string({ minLength: 1, maxLength: 100 }),
});

/**
 * Arbitrary for a valid ProfileCorrection matching ProfileCorrectionSchema.
 */
export const arbProfileCorrection: fc.Arbitrary<ProfileCorrection> = fc.oneof(
  arbProfileCorrectionRemove,
  arbProfileCorrectionCorrect
);

/**
 * Arbitrary for an invalid ProfileCorrection.
 */
export const arbInvalidProfileCorrection = fc.oneof(
  // Empty attributeId on remove
  fc.record({
    action: fc.constant("remove" as const),
    attributeId: fc.constant(""),
  }),
  // Empty attributeId on correct
  fc.record({
    action: fc.constant("correct" as const),
    attributeId: fc.constant(""),
    newValue: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  // Empty newValue on correct
  fc.record({
    action: fc.constant("correct" as const),
    attributeId: fc.string({ minLength: 1, maxLength: 36 }),
    newValue: fc.constant(""),
  }),
  // Invalid action
  fc.record({
    action: fc.constant("update" as unknown as "remove"),
    attributeId: fc.string({ minLength: 1, maxLength: 36 }),
  })
);
