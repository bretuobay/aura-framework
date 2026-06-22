import { z } from "zod";
import { NonEmptyString, ISOTimestamp, Confidence } from "./common.js";
import { ProfileProvenanceSchema, DataClassSchema } from "./enums.js";

// === ProfileAttribute ===

/**
 * A single adaptive attribute stored in the AURA user model.
 * Contains provenance tracking, confidence scoring, data classification,
 * and optional expiry for time-bounded attributes.
 */
export const ProfileAttributeSchema = z.object({
  id: NonEmptyString,
  key: NonEmptyString,
  value: z.unknown(),
  provenance: ProfileProvenanceSchema,
  confidence: Confidence,
  dataClass: DataClassSchema,
  expiresAt: ISOTimestamp.optional(),
});

export type ProfileAttribute = z.infer<typeof ProfileAttributeSchema>;

// === ProfileCorrection ===

/**
 * A user-initiated correction to a profile attribute.
 * Discriminated union on `action`:
 * - `remove`: deletes the attribute (ignores `newValue` if present)
 * - `correct`: updates the attribute with a new non-empty value
 */
const ProfileCorrectionRemoveSchema = z
  .object({
    action: z.literal("remove"),
    attributeId: NonEmptyString,
  })
  .passthrough();

const ProfileCorrectionCorrectSchema = z.object({
  action: z.literal("correct"),
  attributeId: NonEmptyString,
  newValue: NonEmptyString,
});

export const ProfileCorrectionSchema = z.discriminatedUnion("action", [
  ProfileCorrectionRemoveSchema,
  ProfileCorrectionCorrectSchema,
]);

export type ProfileCorrection = z.infer<typeof ProfileCorrectionSchema>;
