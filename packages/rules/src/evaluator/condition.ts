/**
 * Condition evaluator for the @aura/rules pipeline.
 *
 * Provides dot-path resolution with existential matching over the events
 * array, and evaluates all 10 condition operators against resolved values.
 */

import type { Condition, ConditionOperator, RulesPipelineInput } from "../schema/types.js";

/**
 * Resolves a dot-separated path against a RulesPipelineInput object.
 *
 * Algorithm:
 * 1. Split path by '.'
 * 2. If first segment is 'events', perform existential match:
 *    - For each event in input.events, resolve remaining path segments
 *    - Return first defined value found, or undefined
 * 3. Otherwise, traverse segments sequentially on the input object
 * 4. If any intermediate is undefined/null, return undefined
 * 5. Return the final resolved value
 */
export function resolvePath(input: object, path: string): unknown {
  const segments = path.split(".");

  if (segments[0] === "events") {
    const remaining = segments.slice(1);
    const events = (input as Record<string, unknown>)["events"];

    if (!Array.isArray(events)) {
      return undefined;
    }

    for (const event of events) {
      const resolved = traverseSegments(event, remaining);
      if (resolved !== undefined && resolved !== null) {
        return resolved;
      }
    }

    return undefined;
  }

  return traverseSegments(input, segments);
}

/**
 * Traverses an object using an array of path segments.
 * Returns undefined if any intermediate value is undefined or null.
 */
function traverseSegments(obj: unknown, segments: string[]): unknown {
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Evaluates a single condition against the pipeline input.
 *
 * When the condition path starts with "events.", performs existential matching:
 * the condition is evaluated against each event and returns true if ANY event
 * satisfies it (requirement 3.8).
 *
 * For operators other than 'exists', if the resolved value is undefined,
 * the condition evaluates to false. For 'matches', if the resolved value
 * is not a string, returns false. For 'in'/'notIn', if value is not an
 * array, returns false.
 */
export function evaluateCondition(condition: Condition, input: RulesPipelineInput): boolean {
  const segments = condition.path.split(".");

  // Existential matching over the events array (requirement 3.8)
  if (segments[0] === "events") {
    const remainingPath = segments.slice(1).join(".");
    if (!Array.isArray(input.events) || input.events.length === 0) {
      return condition.operator === "exists" ? false : false;
    }

    for (const event of input.events) {
      const resolved = remainingPath ? traverseSegments(event, segments.slice(1)) : event;
      if (applyOperator(condition.operator, resolved, condition.value)) {
        return true;
      }
    }
    return false;
  }

  const resolved = resolvePath(input, condition.path);
  return applyOperator(condition.operator, resolved, condition.value);
}

/**
 * Applies a condition operator against a resolved value.
 */
function applyOperator(operator: ConditionOperator, resolved: unknown, value: unknown): boolean {
  switch (operator) {
    case "exists":
      return resolved !== undefined && resolved !== null;

    case "eq":
      if (resolved === undefined || resolved === null) return false;
      return resolved === value;

    case "neq":
      if (resolved === undefined || resolved === null) return false;
      return resolved !== value;

    case "in": {
      if (resolved === undefined || resolved === null) return false;
      if (!Array.isArray(value)) return false;
      return (value as unknown[]).includes(resolved);
    }

    case "notIn": {
      if (resolved === undefined || resolved === null) return false;
      if (!Array.isArray(value)) return false;
      return !(value as unknown[]).includes(resolved);
    }

    case "gt":
      if (resolved === undefined || resolved === null) return false;
      return (resolved as number) > (value as number);

    case "gte":
      if (resolved === undefined || resolved === null) return false;
      return (resolved as number) >= (value as number);

    case "lt":
      if (resolved === undefined || resolved === null) return false;
      return (resolved as number) < (value as number);

    case "lte":
      if (resolved === undefined || resolved === null) return false;
      return (resolved as number) <= (value as number);

    case "matches": {
      if (resolved === undefined || resolved === null) return false;
      if (typeof resolved !== "string") return false;
      const pattern = value as string;
      return new RegExp(pattern).test(resolved);
    }

    default:
      return false;
  }
}

/**
 * Evaluates all conditions against the pipeline input using logical AND.
 * Returns true only when ALL conditions pass.
 */
export function evaluateConditions(conditions: Condition[], input: RulesPipelineInput): boolean {
  return conditions.every((condition) => evaluateCondition(condition, input));
}
