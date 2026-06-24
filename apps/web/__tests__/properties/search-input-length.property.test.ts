/**
 * Property 24: Search Input Length Constraint
 *
 * For any text entered in the search input field, the input SHALL accept
 * at most 200 characters; characters beyond position 200 SHALL be rejected or truncated.
 *
 * **Validates: Requirements 1.1**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbSearchQueryAnyLength } from "./generators/event.arb";
import { createSearchEngine, MAX_QUERY_LENGTH } from "@/lib/search/index";

describe("Property 24: Search Input Length Constraint", () => {
  it("for any string of any length, truncateInput() returns at most 200 chars", () => {
    const engine = createSearchEngine([]);

    fc.assert(
      fc.property(arbSearchQueryAnyLength, (input) => {
        const result = engine.truncateInput(input);
        expect(result.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
      }),
      { numRuns: 100 }
    );
  });

  it("for strings ≤200 chars, truncateInput() returns the original string unchanged", () => {
    const engine = createSearchEngine([]);

    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: MAX_QUERY_LENGTH }),
        (input) => {
          const result = engine.truncateInput(input);
          expect(result).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("for strings >200 chars, truncateInput() returns exactly 200 chars (the first 200)", () => {
    const engine = createSearchEngine([]);

    fc.assert(
      fc.property(
        fc.string({ minLength: MAX_QUERY_LENGTH + 1, maxLength: 400 }),
        (input) => {
          const result = engine.truncateInput(input);
          expect(result.length).toBe(MAX_QUERY_LENGTH);
          expect(result).toBe(input.slice(0, MAX_QUERY_LENGTH));
        }
      ),
      { numRuns: 100 }
    );
  });
});
