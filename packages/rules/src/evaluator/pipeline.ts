/**
 * RulesPipeline — the orchestrating evaluator class for @aura/rules.
 *
 * Implements the full evaluation pipeline:
 *   1. Condition evaluation (per-rule isolation)
 *   2. Candidate construction (per-rule isolation)
 *   3. Feedback suppression (skip recently-rejected rules)
 *   4. Consent gating
 *   5. Manifest checking
 *   6. Risk-class enforcement
 *   7. Priority sorting (before protocol validation)
 *   8. Protocol validation
 *   9. Return UIPrescription[]
 *
 * The evaluate() method NEVER throws — returns empty array on total failure.
 * Input is never mutated.
 *
 * Requirements validated: 3.1, 3.2, 3.10, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1,
 *   9.4, 10.1, 10.2, 10.3, 11.1, 11.2, 11.4, 11a.1, 17.1, 17.2, 17.3
 */

import { evaluateConditions } from "./condition.js";
import { buildCandidatePrescription } from "./construct.js";
import { filterByConsent } from "./consent-gate.js";
import { filterByManifest } from "./manifest-check.js";
import { enforceRiskClass } from "./risk-enforcer.js";
import { validatePrescriptions } from "./protocol-validate.js";
import { sortByPriority } from "./priority-sort.js";
import { DefaultClockProvider } from "./clock.js";
import type {
  RuleSet,
  RulesPipelineInput,
  ClockProvider,
  RulesLogger,
  CandidatePrescription,
  LogEntry,
} from "../schema/types.js";
import type { UIPrescription } from "@aura/protocol";

// ─── Default Logger ───────────────────────────────────────────────────────────

const defaultLogger: RulesLogger = {
  info: () => {},
  warn: (entry: LogEntry) => console.warn("[rules]", entry),
  error: (entry: LogEntry) => console.error("[rules]", entry),
};

// ─── Pipeline Options ─────────────────────────────────────────────────────────

export interface RulesPipelineOptions {
  ruleSet: RuleSet;
  clock?: ClockProvider;
  logger?: RulesLogger;
}

// ─── RulesPipeline Class ──────────────────────────────────────────────────────

/**
 * Orchestrates the full rules evaluation pipeline.
 *
 * Accepts a RuleSet, optional clock provider, and optional logger.
 * The evaluate() method processes input through all pipeline stages
 * and returns validated UIPrescription objects.
 */
export class RulesPipeline {
  private readonly ruleSet: RuleSet;
  private readonly clock: ClockProvider;
  private readonly logger: RulesLogger;

  constructor(options: RulesPipelineOptions) {
    this.ruleSet = options.ruleSet;
    this.clock = options.clock ?? new DefaultClockProvider();
    this.logger = options.logger ?? defaultLogger;
  }

  /**
   * Evaluates all rules against the given input, orchestrating the full pipeline.
   *
   * Never throws — returns an empty array if everything fails.
   * Does not mutate the input object.
   */
  async evaluate(input: RulesPipelineInput): Promise<UIPrescription[]> {
    try {
      // ── Step 1 & 2: Evaluate conditions and construct candidates ──────────
      const candidates: CandidatePrescription[] = [];

      for (const rule of this.ruleSet.rules) {
        try {
          // Step 1: Evaluate conditions (per-rule isolation)
          const matches = evaluateConditions(rule.conditions, input);

          if (!matches) {
            continue;
          }

          // Step 2: Construct candidate prescription (per-rule isolation)
          try {
            const candidate = buildCandidatePrescription(rule, input, this.clock);
            candidates.push(candidate);
          } catch (constructionError) {
            this.logger.warn({
              ruleId: rule.id,
              phase: "construction",
              reason: "Construction threw an exception",
              error: constructionError instanceof Error
                ? constructionError
                : new Error(String(constructionError)),
            });
          }
        } catch (conditionError) {
          this.logger.warn({
            ruleId: rule.id,
            phase: "condition",
            reason: "Condition evaluation threw an exception",
            error: conditionError instanceof Error
              ? conditionError
              : new Error(String(conditionError)),
          });
        }
      }

      // ── Step 3: Feedback suppression ──────────────────────────────────────
      const recentRejections = input.feedback?.recentRejections;
      let afterFeedback: CandidatePrescription[];

      if (recentRejections && recentRejections.length > 0) {
        const rejectedRuleIds = new Set(
          recentRejections.map((r) => r.ruleId)
        );
        afterFeedback = candidates.filter(
          (candidate) => !rejectedRuleIds.has(candidate.ruleId)
        );
      } else {
        afterFeedback = candidates;
      }

      // ── Step 4: Consent gating ────────────────────────────────────────────
      const afterConsent = filterByConsent(afterFeedback, input.consent);

      // ── Step 5: Manifest checking ─────────────────────────────────────────
      const afterManifest = filterByManifest(afterConsent, input.manifest);

      // ── Step 6: Risk-class enforcement ────────────────────────────────────
      const afterRisk = enforceRiskClass(afterManifest, input.manifest);

      // ── Step 7: Priority sorting (before protocol validation) ─────────────
      const sorted = sortByPriority(afterRisk);

      // ── Step 8: Protocol validation ───────────────────────────────────────
      const validated = validatePrescriptions(sorted);

      // ── Step 9: Return validated prescriptions ────────────────────────────
      return validated;
    } catch (fatalError) {
      // Top-level catch: evaluate() NEVER throws
      this.logger.error({
        reason: "Fatal pipeline error — returning empty array",
        error: fatalError instanceof Error
          ? fatalError
          : new Error(String(fatalError)),
      });
      return [];
    }
  }
}
