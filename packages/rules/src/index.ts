/**
 * @aura/rules — Public API barrel export.
 *
 * Exports the rule schema, evaluator pipeline, fixture runner, loader,
 * pipeline stage functions, and all relevant types.
 */

// ─── Rule Schema ──────────────────────────────────────────────────────────────

export {
  ConditionSchema,
  ActionSchema,
  RuleMetadataSchema,
  RuleSchema,
  ConditionOperatorSchema,
  DecisionSourceSchema,
} from "./schema/rule.schema.js";

export type {
  Condition,
  ConditionInput,
  Action,
  ActionInput,
  RuleMetadata,
  RuleMetadataInput,
  Rule,
  RuleInput,
} from "./schema/rule.schema.js";

// ─── Fixture Schema ───────────────────────────────────────────────────────────

export { FixtureSchema, PrescriptionMatcherSchema } from "./schema/fixture.schema.js";

export type { Fixture, PrescriptionMatcher } from "./schema/fixture.schema.js";

// ─── Rule Loader ──────────────────────────────────────────────────────────────

export { loadRules, RuleLoadError } from "./loader/load-rules.js";
export type { RuleValidationFailure } from "./loader/load-rules.js";

// ─── Evaluator Pipeline ───────────────────────────────────────────────────────

export { RulesPipeline } from "./evaluator/pipeline.js";
export type { RulesPipelineOptions } from "./evaluator/pipeline.js";
export { DefaultClockProvider } from "./evaluator/clock.js";

// ─── Pipeline Stage Functions (advanced usage) ────────────────────────────────

export { evaluateConditions } from "./evaluator/condition.js";
export { buildCandidatePrescription } from "./evaluator/construct.js";
export { filterByConsent } from "./evaluator/consent-gate.js";
export { filterByManifest } from "./evaluator/manifest-check.js";
export { enforceRiskClass } from "./evaluator/risk-enforcer.js";
export { validatePrescriptions } from "./evaluator/protocol-validate.js";
export { sortByPriority } from "./evaluator/priority-sort.js";

// ─── Fixture Runner ───────────────────────────────────────────────────────────

export { FixtureRunner } from "./fixture/runner.js";
export type { FixtureRunResult } from "./fixture/runner.js";
export { runFixtures } from "./fixture/run-fixtures.js";
export type { RunFixturesOptions, FixtureSummary } from "./fixture/run-fixtures.js";
export { matchPrescriptions } from "./fixture/matcher.js";
export type { MatchResult } from "./fixture/matcher.js";
export { generateDiff } from "./fixture/diff.js";

// ─── Rules-Specific Types ─────────────────────────────────────────────────────

export type {
  RuleSet,
  RuleSource,
  ClockProvider,
  RulesLogger,
  LogEntry,
  RulesPipelineInput,
  FeedbackContext,
  CandidatePrescription,
  RuleId,
  ConditionPath,
  ConditionOperator,
  DecisionSource,
} from "./schema/types.js";

// ─── Re-exports from @aura/protocol (convenience) ────────────────────────────

export type {
  UIPrescription,
  RiskClass,
  PrescriptionMode,
  LatencyClass,
  AdaptationType,
  DataClass,
} from "@aura/protocol";
