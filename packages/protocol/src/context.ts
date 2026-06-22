import { z } from "zod";
import { NonEmptyString, ContextSequenceId } from "./common.js";
import { NetworkQualitySchema } from "./enums.js";

/**
 * Schema for the viewport dimensions within a ContextModel.
 * Width and height must be positive integers in the range [1, 32767].
 */
const ViewportSchema = z.object({
  width: z.number().int().min(1).max(32767),
  height: z.number().int().min(1).max(32767),
});

/**
 * Schema for the ContextModel — a structured snapshot of the current device,
 * viewport, locale, network, task state, and domain context.
 *
 * Required fields:
 * - device: non-empty string identifying the device
 * - locale: BCP 47 language tag, max 35 characters
 *
 * Optional fields:
 * - viewport: width/height positive integers in [1, 32767]
 * - networkQuality: one of "offline", "slow", "moderate", "fast"
 * - sequenceId: non-negative integer context sequence identifier
 * - taskState: arbitrary key-value context for task state
 * - domain: arbitrary key-value context for domain-specific data
 */
export const ContextModelSchema = z.object({
  device: NonEmptyString,
  locale: z.string().min(1).max(35),
  viewport: ViewportSchema.optional(),
  networkQuality: NetworkQualitySchema.optional(),
  sequenceId: ContextSequenceId.optional(),
  taskState: z.record(z.string(), z.unknown()).optional(),
  domain: z.record(z.string(), z.unknown()).optional(),
});

export type ContextModel = z.infer<typeof ContextModelSchema>;
