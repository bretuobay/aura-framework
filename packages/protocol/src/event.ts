import { z } from "zod";
import { NonEmptyString, ISOTimestamp } from "./common.js";
import { DataClassSchema } from "./enums.js";

/**
 * The minimum event vocabulary required by AUIP v0.
 * These are the standard event type strings that every AURA implementation must recognize,
 * though the event type field is extensible and accepts any non-empty string.
 */
export const MinimumEventVocabulary = [
  "surface.viewed",
  "interaction.clicked",
  "interaction.dismissed",
  "feedback.submitted",
  "context.changed",
] as const;

/**
 * Schema for AUIP v0 AuraEvent.
 *
 * Validates:
 * - `type`: non-empty string (extensible, not restricted to MinimumEventVocabulary)
 * - `surfaceId`: non-empty string identifying the target surface
 * - `timestamp`: valid ISO 8601 timestamp
 * - `payload`: any JSON-serializable object (open contract for extensibility)
 * - `dataClasses`: optional array of recognized DataClass values for gateway filtering
 */
export const AuraEventSchema = z.object({
  type: NonEmptyString,
  surfaceId: NonEmptyString,
  timestamp: ISOTimestamp,
  payload: z.record(z.string(), z.unknown()),
  dataClasses: z.array(DataClassSchema).optional(),
});

/**
 * TypeScript type inferred from AuraEventSchema.
 */
export type AuraEvent = z.infer<typeof AuraEventSchema>;
