import { z } from "zod";

import { NonEmptyString, ISOTimestamp, ContextSequenceId } from "./common.js";
import { FeedbackActionSchema } from "./enums.js";

/**
 * Schema for FeedbackEvent — a signal from the host application recording
 * how a user or the host responded to a UIPrescription.
 *
 * Validation rules:
 * - `prescriptionId`: non-empty string
 * - `action`: enum-constrained to accept, dismiss, override, undo, reject, error
 * - `timestamp`: valid ISO 8601 timestamp
 * - `reason`: optional, but must be non-empty string when present
 * - `contextSequenceId`: optional non-negative integer (relevant for stale-context reason)
 */
export const FeedbackEventSchema = z.object({
  prescriptionId: NonEmptyString,
  action: FeedbackActionSchema,
  timestamp: ISOTimestamp,
  reason: z.string().min(1).optional(),
  contextSequenceId: ContextSequenceId.optional(),
});

export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>;
