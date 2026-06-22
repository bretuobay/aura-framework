import { z } from "zod";
import { NonEmptyString, ISOTimestamp, ContextSequenceId, Confidence } from "./common.js";
import { PrescriptionModeSchema, LatencyClassSchema, DataClassSchema } from "./enums.js";
import { AdaptationSchema } from "./adaptation.js";

// === ContextLock ===

export const ContextLockSchema = z.object({
  sequenceId: ContextSequenceId,
  capturedAt: ISOTimestamp,
});

export type ContextLock = z.infer<typeof ContextLockSchema>;

// === AdaptationGroup ===

export const AdaptationGroupSchema = z.object({
  groupId: NonEmptyString,
  adaptationIds: z.array(z.string().min(1)).nonempty(),
  atomic: z.boolean(),
});

export type AdaptationGroup = z.infer<typeof AdaptationGroupSchema>;

// === UIPrescription ===

export const UIPrescriptionSchema = z.object({
  id: NonEmptyString,
  surfaceId: NonEmptyString,
  mode: PrescriptionModeSchema,
  latencyClass: LatencyClassSchema,
  contextLock: ContextLockSchema,
  adaptations: z.array(AdaptationSchema).nonempty(),
  constraints: z.object({
    expiresAt: ISOTimestamp,
  }),
  manifestVersion: NonEmptyString,
  audit: z.object({
    dataClassesUsed: z.array(DataClassSchema).optional(),
    policyVersion: NonEmptyString.optional(),
    decisionSource: NonEmptyString.optional(),
  }),
  explanation: z
    .object({
      confidence: Confidence,
      summary: z.string().optional(),
    })
    .optional(),
  adaptationGroups: z.array(AdaptationGroupSchema).optional(),
});

export type UIPrescription = z.infer<typeof UIPrescriptionSchema>;
