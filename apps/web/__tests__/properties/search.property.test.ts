/**
 * Property 1: Search Result Pagination Invariant
 *
 * For any product catalog and any search query, the number of products
 * returned in a single page SHALL never exceed 20.
 *
 * **Validates: Requirements 1.3, 1.6**
 *
 * Property 24: Search Input Length Constraint
 *
 * For any text entered in the search input field, the input SHALL accept
 * at most 200 characters; characters beyond position 200 SHALL be rejected
 * or truncated.
 *
 * **Validates: Requirements 1.1**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbProductCatalog } from "./generators/product.arb";
import { arbSearchQuery, arbSearchQueryAnyLength } from "./generators/event.arb";
import { createSearchEngine, MAX_QUERY_LENGTH, PAGE_SIZE } from "@/lib/search/index";
import type { Product } from "@/lib/types";
import productsJson from "@/data/products.json";

describe("Property 1: Search Result Pagination Invariant", () => {
  it("a single page never exceeds PAGE_SIZE (20) results for any catalog and query", () => {
    fc.assert(
      fc.property(arbProductCatalog, arbSearchQuery, (catalog, query) => {
        const engine = createSearchEngine(catalog);
        const results = engine.search(query);

        expect(results.products.length).toBeLessThanOrEqual(PAGE_SIZE);
        expect(PAGE_SIZE).toBe(20);
      }),
      { numRuns: 100 },
    );
  });

  it("a single page never exceeds PAGE_SIZE (20) results for any page number", () => {
    fc.assert(
      fc.property(
        arbProductCatalog,
        arbSearchQuery,
        fc.integer({ min: 1, max: 50 }),
        (catalog, query, page) => {
          const engine = createSearchEngine(catalog);
          const results = engine.search(query, { page });

          expect(results.products.length).toBeLessThanOrEqual(PAGE_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });
});


describe("Property 24: Search Input Length Constraint", () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * For any text entered in the search input field, the input SHALL accept
   * at most 200 characters; characters beyond position 200 SHALL be rejected
   * or truncated.
   */

  it("truncateInput always returns at most MAX_QUERY_LENGTH (200) characters regardless of input length", () => {
    fc.assert(
      fc.property(arbSearchQueryAnyLength, (query) => {
        const engine = createSearchEngine([]);
        const truncated = engine.truncateInput(query);

        expect(truncated.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
        expect(MAX_QUERY_LENGTH).toBe(200);
      }),
      { numRuns: 100 },
    );
  });

  it("truncateInput preserves the first 200 characters of any input", () => {
    fc.assert(
      fc.property(arbSearchQueryAnyLength, (query) => {
        const engine = createSearchEngine([]);
        const truncated = engine.truncateInput(query);

        // The truncated result should be the first 200 chars (or the full string if shorter)
        const expected = query.slice(0, MAX_QUERY_LENGTH);
        expect(truncated).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("search function does not crash and implicitly truncates queries of any length", () => {
    fc.assert(
      fc.property(arbProductCatalog, arbSearchQueryAnyLength, (catalog, query) => {
        const engine = createSearchEngine(catalog);

        // Should not throw regardless of query length
        const results = engine.search(query);

        // Results should always be a valid SearchResults object
        expect(results).toHaveProperty("products");
        expect(results).toHaveProperty("total");
        expect(results).toHaveProperty("hasMore");
        expect(results).toHaveProperty("page");
        expect(results.products.length).toBeLessThanOrEqual(PAGE_SIZE);
      }),
      { numRuns: 100 },
    );
  });

  it("for strings longer than 200 characters, only the first 200 characters are used by the search engine", () => {
    fc.assert(
      fc.property(
        arbProductCatalog,
        fc.string({ minLength: 201, maxLength: 400 }),
        (catalog, longQuery) => {
          const engine = createSearchEngine(catalog);

          // Search with the full long query
          const resultsLong = engine.search(longQuery);

          // Search with only the first 200 characters (trimmed, as search trims)
          const truncatedQuery = longQuery.slice(0, MAX_QUERY_LENGTH);
          const resultsTruncated = engine.search(truncatedQuery);

          // Both searches should produce the same results since
          // the engine truncates internally before searching
          expect(resultsLong.total).toBe(resultsTruncated.total);
          expect(resultsLong.products.map((p) => p.id)).toEqual(
            resultsTruncated.products.map((p) => p.id),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 22: Search Fuzzy Matching
 *
 * For any product name in the catalog and any query string within edit distance 1
 * of that name (or a case-insensitive partial match), the search function SHALL
 * include that product in the results.
 *
 * **Validates: Requirements 13.3**
 */

const staticCatalog = productsJson as Product[];

// ─── Helpers for fuzzy query generation ─────────────────────────────────────────

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/**
 * Extract words from a product name that are ≥3 characters long
 * (fuzzy matching only kicks in for terms > 2 characters).
 */
function extractLongWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[\s\-_/,.;:!?()[\]{}'"]+/)
    .filter((w) => w.length >= 3);
}

/**
 * Apply a single-character substitution at a random position.
 */
function substituteChar(word: string, posIndex: number, charIndex: number): string {
  const pos = posIndex % word.length;
  const replacement = ALPHABET[charIndex % ALPHABET.length];
  // Avoid no-op substitution
  if (word[pos] === replacement) {
    const altReplacement = ALPHABET[(charIndex + 1) % ALPHABET.length];
    return word.slice(0, pos) + altReplacement + word.slice(pos + 1);
  }
  return word.slice(0, pos) + replacement + word.slice(pos + 1);
}

/**
 * Delete a single character from the word at the given position.
 */
function deleteChar(word: string, posIndex: number): string {
  const pos = posIndex % word.length;
  return word.slice(0, pos) + word.slice(pos + 1);
}

/**
 * Insert a single character into the word at the given position.
 */
function insertChar(word: string, posIndex: number, charIndex: number): string {
  const pos = posIndex % (word.length + 1);
  const insertion = ALPHABET[charIndex % ALPHABET.length];
  return word.slice(0, pos) + insertion + word.slice(pos);
}

describe("Property 22: Search Fuzzy Matching", () => {
  const engine = createSearchEngine(staticCatalog);

  // Only products with words ≥3 chars are relevant for fuzzy matching tests
  const productsWithLongWords = staticCatalog.filter(
    (p) => extractLongWords(p.name).length > 0,
  );

  it("searching with a word within edit distance 1 (substitution) returns the product", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: productsWithLongWords.length - 1 }),
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 999 }),
        (productIdx, posIndex, charIndex) => {
          const product = productsWithLongWords[productIdx];
          const words = extractLongWords(product.name);
          const word = words[posIndex % words.length];

          const fuzzyQuery = substituteChar(word, posIndex, charIndex);
          const results = engine.search(fuzzyQuery);

          const foundIds = results.products.map((p) => p.id);
          expect(foundIds).toContain(product.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("searching with a word within edit distance 1 (deletion) returns the product", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: productsWithLongWords.length - 1 }),
        fc.integer({ min: 0, max: 999 }),
        (productIdx, posIndex) => {
          const product = productsWithLongWords[productIdx];
          const words = extractLongWords(product.name);
          const word = words[posIndex % words.length];

          // Deletion requires word length ≥ 4 so that the resulting string
          // is still > 2 chars (needed to trigger fuzzy matching).
          if (word.length < 4) return;

          const fuzzyQuery = deleteChar(word, posIndex);
          const results = engine.search(fuzzyQuery);

          const foundIds = results.products.map((p) => p.id);
          expect(foundIds).toContain(product.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("searching with a word within edit distance 1 (insertion) returns the product", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: productsWithLongWords.length - 1 }),
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 999 }),
        (productIdx, posIndex, charIndex) => {
          const product = productsWithLongWords[productIdx];
          const words = extractLongWords(product.name);
          const word = words[posIndex % words.length];

          const fuzzyQuery = insertChar(word, posIndex, charIndex);
          const results = engine.search(fuzzyQuery);

          const foundIds = results.products.map((p) => p.id);
          expect(foundIds).toContain(product.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("case-insensitive matching: uppercase/lowercase variants find the product", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: productsWithLongWords.length - 1 }),
        fc.integer({ min: 0, max: 999 }),
        fc.constantFrom("upper", "lower", "mixed" as const),
        (productIdx, wordIdx, caseVariant) => {
          const product = productsWithLongWords[productIdx];
          const words = extractLongWords(product.name);
          const word = words[wordIdx % words.length];

          let query: string;
          switch (caseVariant) {
            case "upper":
              query = word.toUpperCase();
              break;
            case "lower":
              query = word.toLowerCase();
              break;
            case "mixed":
              query = word
                .split("")
                .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                .join("");
              break;
          }

          const results = engine.search(query);
          const foundIds = results.products.map((p) => p.id);
          expect(foundIds).toContain(product.id);
        },
      ),
      { numRuns: 100 },
    );
  });
});
