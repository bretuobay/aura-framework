import { z } from "zod";
import { NonEmptyString, Confidence } from "./common.js";

/**
 * Schema for ExplanationRecord — audience-specific rationale attached to a
 * UIPrescription, including user-visible summary, contributing factors,
 * and a confidence score.
 *
 * Validation rules:
 * - `id`: non-empty string
 * - `summary`: non-empty string
 * - `userVisible`: boolean
 * - `factors`: array of strings (empty array is valid)
 * - `confidence`: value in [0, 1]
 */
export const ExplanationRecordSchema = z.object({
  id: NonEmptyString,
  summary: NonEmptyString,
  userVisible: z.boolean(),
  factors: z.array(z.string()),
  confidence: Confidence,
});

export type ExplanationRecord = z.infer<typeof ExplanationRecordSchema>;
