import { z } from "zod";
import { LayoutStrategySchema, RiskClassSchema, DataClassSchema } from "./enums.js";
import { NonEmptyString } from "./common.js";

// === LayoutStability ===

export const LayoutStabilitySchema = z
  .object({
    strategy: LayoutStrategySchema,
    maxDecisionWaitMs: z.number().int().nonnegative().max(5000).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      (val.strategy === "reserve-space" || val.strategy === "skeleton") &&
      val.maxDecisionWaitMs === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required when strategy is 'reserve-space' or 'skeleton'",
        path: ["maxDecisionWaitMs"],
      });
    }
  });

export type LayoutStability = z.infer<typeof LayoutStabilitySchema>;

// === ManifestComponent ===

export const ManifestComponentSchema = z.object({
  componentId: NonEmptyString,
  variants: z.array(z.string().min(1)).nonempty(),
  adaptableProps: z.record(z.string(), z.unknown()).optional(),
  riskClass: RiskClassSchema,
  constraints: z
    .object({
      requiresConsent: z.array(DataClassSchema).optional(),
      reversible: z.boolean().optional(),
    })
    .optional(),
});

export type ManifestComponent = z.infer<typeof ManifestComponentSchema>;

// === ManifestSurface ===

export const ManifestSurfaceSchema = z.object({
  surfaceId: NonEmptyString,
  components: z.array(ManifestComponentSchema),
  layoutStability: LayoutStabilitySchema.optional(),
  consentRequirements: z.array(DataClassSchema).optional(),
});

export type ManifestSurface = z.infer<typeof ManifestSurfaceSchema>;

// === CapabilityManifest ===

export const CapabilityManifestSchema = z.object({
  version: NonEmptyString.optional(),
  surfaces: z.array(ManifestSurfaceSchema),
});

export type CapabilityManifest = z.infer<typeof CapabilityManifestSchema>;
