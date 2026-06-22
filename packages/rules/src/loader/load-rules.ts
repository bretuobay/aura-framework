/**
 * Rule set loading from JSON or TypeScript module sources.
 *
 * Validates rules at load time and builds an indexed RuleSet for
 * fast lookup during evaluation.
 */

import { RuleSchema } from "../schema/rule.schema.js";
import type { Rule, RuleId, RuleSet, RuleSource } from "../schema/types.js";

// ─── RuleLoadError ────────────────────────────────────────────────────────────

/** Describes a single validation failure for a rule entry. */
export interface RuleValidationFailure {
  index: number;
  issues: Array<{ path: (string | number)[]; message: string }>;
}

/**
 * Error thrown when rule loading fails due to validation errors or
 * duplicate IDs.
 */
export class RuleLoadError extends Error {
  readonly failures: RuleValidationFailure[];
  readonly duplicateId?: string;

  constructor(
    message: string,
    options: { failures?: RuleValidationFailure[]; duplicateId?: string } = {}
  ) {
    super(message);
    this.name = "RuleLoadError";
    this.failures = options.failures ?? [];
    this.duplicateId = options.duplicateId;
  }
}

// ─── RuleSet Builder ──────────────────────────────────────────────────────────

function buildRuleSet(rules: Rule[]): RuleSet {
  const ruleMap = new Map<RuleId, Rule>();
  for (const rule of rules) {
    ruleMap.set(rule.id, rule);
  }

  return {
    rules: Object.freeze([...rules]),
    size: rules.length,
    getRule(id: RuleId): Rule | undefined {
      return ruleMap.get(id);
    },
    getRuleIds(): ReadonlyArray<RuleId> {
      return [...ruleMap.keys()];
    },
  };
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

function findDuplicateId(rules: Rule[]): string | undefined {
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.id)) {
      return rule.id;
    }
    seen.add(rule.id);
  }
  return undefined;
}

// ─── loadRules ────────────────────────────────────────────────────────────────

/**
 * Loads and validates a set of rules from a JSON or TypeScript module source.
 *
 * - For `json` sources: validates each entry through `RuleSchema` and rejects
 *   with a `RuleLoadError` if any entries are invalid.
 * - For `module` sources: accepts the typed `Rule[]` directly without
 *   re-serialization.
 * - Detects duplicate rule IDs and rejects with a `RuleLoadError`.
 * - Returns a `RuleSet` with indexed lookup methods.
 */
export async function loadRules(source: RuleSource): Promise<RuleSet> {
  let rules: Rule[];

  if (source.type === "json") {
    const failures: RuleValidationFailure[] = [];
    const validated: Rule[] = [];

    for (let i = 0; i < source.data.length; i++) {
      const result = RuleSchema.safeParse(source.data[i]);
      if (result.success) {
        validated.push(result.data as unknown as Rule);
      } else {
        failures.push({
          index: i,
          issues: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        });
      }
    }

    if (failures.length > 0) {
      const indices = failures.map((f) => f.index).join(", ");
      throw new RuleLoadError(
        `Rule validation failed for entries at index: ${indices}`,
        { failures }
      );
    }

    rules = validated;
  } else {
    // module source — already typed Rule[], accept directly
    rules = source.rules;
  }

  // Detect duplicate IDs
  const duplicateId = findDuplicateId(rules);
  if (duplicateId) {
    throw new RuleLoadError(
      `Duplicate rule id detected: "${duplicateId}"`,
      { duplicateId }
    );
  }

  return buildRuleSet(rules);
}
