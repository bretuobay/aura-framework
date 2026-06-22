/**
 * Zod schemas for the @aura/rules Rule DSL.
 *
 * Validates Rule, Condition, Action, and RuleMetadata objects at load time,
 * catching authoring errors before the evaluator runs.
 */

import { z } from "zod";
import {
  RiskClassSchema,
  AdaptationTypeSchema,
  LatencyClassSchema,
  DataClassSchema,
} from "@aura/protocol";

// ─── Condition ────────────────────────────────────────────────────────────────

const ConditionOperatorSchema = z.enum([
  "eq",
  "neq",
  "in",
  "notIn",
  "gt",
  "gte",
  "lt",
  "lte",
  "exists",
  "matches",
]);

/**
 * Validates a Condition object.
 *
 * `value` is optional only when `operator` is `'exists'`.
 * For all other operators, `value` is required.
 */
export const ConditionSchema = z
  .object({
    path: z.string().min(1),
    operator: ConditionOperatorSchema,
    value: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.operator !== "exists" && data.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"value" is required when operator is "${data.operator}"`,
        path: ["value"],
      });
    }
  });

export type ConditionInput = z.input<typeof ConditionSchema>;
export type Condition = z.output<typeof ConditionSchema>;

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Validates an Action object declaring an adaptation to include in a UIPrescription.
 */
export const ActionSchema = z.object({
  adaptationType: AdaptationTypeSchema,
  surfaceId: z.string().min(1),
  slotId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type ActionInput = z.input<typeof ActionSchema>;
export type Action = z.output<typeof ActionSchema>;

// ─── DecisionSource ───────────────────────────────────────────────────────────

const DecisionSourceSchema = z.enum(["rules", "recommender", "slm", "llm"]);

// ─── RuleMetadata ─────────────────────────────────────────────────────────────

/**
 * Validates optional rule metadata for explanation and audit.
 *
 * `justification` is required when `decisionSource` is `'llm'`.
 * `decisionSource` defaults to `'rules'` when absent.
 */
export const RuleMetadataSchema = z
  .object({
    explanationSummary: z.string().optional(),
    explanationFactors: z.array(z.string()).optional(),
    userVisible: z.boolean().optional(),
    decisionSource: DecisionSourceSchema.default("rules"),
    latencyClass: LatencyClassSchema.optional(),
    justification: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decisionSource === "llm" && (!data.justification || data.justification.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"justification" is required when decisionSource is "llm"`,
        path: ["justification"],
      });
    }
  });

export type RuleMetadataInput = z.input<typeof RuleMetadataSchema>;
export type RuleMetadata = z.output<typeof RuleMetadataSchema>;

// ─── Rule ─────────────────────────────────────────────────────────────────────

/**
 * Validates a complete Rule object — the atomic unit of adaptation logic.
 */
export const RuleSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().nonneg(),
  riskClass: RiskClassSchema,
  conditions: z.array(ConditionSchema).nonempty(),
  actions: z.array(ActionSchema).nonempty(),
  requiredConsent: z.array(DataClassSchema).optional(),
  metadata: RuleMetadataSchema.optional(),
});

export type RuleInput = z.input<typeof RuleSchema>;
export type Rule = z.output<typeof RuleSchema>;

// ─── Re-exports for convenience ──────────────────────────────────────────────

export { ConditionOperatorSchema, DecisionSourceSchema };
