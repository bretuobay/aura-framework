/**
 * Zod schemas for the @aura/rules fixture-based test runner.
 *
 * Defines the Fixture shape (id, description, input, expected) and the
 * PrescriptionMatcher type used for partial matching against output prescriptions.
 */

import { z } from "zod";
import { PrescriptionModeSchema, AdaptationTypeSchema } from "@aura/protocol";

// ─── PrescriptionMatcher ──────────────────────────────────────────────────────

/**
 * Partial matcher for output prescriptions in fixture tests.
 * All fields are optional — only specified fields are matched against output.
 */
export const PrescriptionMatcherSchema = z.object({
  surfaceId: z.string().min(1).optional(),
  ruleId: z.string().min(1).optional(),
  mode: PrescriptionModeSchema.optional(),
  adaptationType: AdaptationTypeSchema.optional(),
  count: z.number().int().min(0).optional(),
});

export type PrescriptionMatcher = z.infer<typeof PrescriptionMatcherSchema>;

// ─── FixtureSchema ────────────────────────────────────────────────────────────

/**
 * Validates a Fixture object used by the FixtureRunner.
 *
 * The `input` field mirrors the RulesPipelineInput shape with enough structure
 * for validation, while allowing passthrough for complex nested types that the
 * pipeline itself validates at runtime.
 */
export const FixtureSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  input: z.object({
    events: z.array(z.record(z.string(), z.unknown())).min(1),
    context: z.record(z.string(), z.unknown()),
    contextSequenceId: z.string().min(1),
    profile: z.record(z.string(), z.unknown()),
    manifest: z.object({
      version: z.string().optional(),
      surfaces: z.array(z.unknown()),
    }),
    consent: z.record(z.string(), z.boolean()),
    sessionId: z.string().min(1),
    eventBatchId: z.string().min(1),
    feedback: z
      .object({
        recentRejections: z.array(z.object({ ruleId: z.string(), timestamp: z.string() })),
        recentUndos: z.array(z.object({ ruleId: z.string(), timestamp: z.string() })),
      })
      .optional(),
  }),
  expected: z.array(PrescriptionMatcherSchema),
});

export type Fixture = z.infer<typeof FixtureSchema>;
