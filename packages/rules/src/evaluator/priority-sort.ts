/**
 * Priority sorting for the rules pipeline.
 *
 * Sorts items by priority descending (highest first), using ruleId
 * lexicographic ascending as a stable tiebreaker for equal priorities.
 *
 * @module evaluator/priority-sort
 */

/**
 * Minimum shape required for priority sorting.
 * CandidatePrescription satisfies this interface.
 */
interface Sortable {
  priority: number;
  ruleId: string;
}

/**
 * Sorts items by priority descending (highest first).
 * Uses ruleId lexicographic ascending as a stable tiebreaker when priorities are equal.
 *
 * Returns a new array — does not mutate the input.
 *
 * @param items - Array of items with priority and ruleId fields
 * @returns A new sorted array
 */
export function sortByPriority<T extends Sortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.ruleId.localeCompare(b.ruleId);
  });
}
