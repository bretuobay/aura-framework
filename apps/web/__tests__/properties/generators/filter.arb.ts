/**
 * Shared fast-check arbitrary generators for FilterState.
 * Used by property-based tests validating Properties 6, 7, 8.
 */
import fc from "fast-check";
import type { FilterState, ProductCategory } from "@/lib/types";
import { PRODUCT_CATEGORIES } from "./product.arb";

/**
 * Generates a subset of product categories for filter selection.
 * Can be empty (no category filter active).
 */
export const arbCategoryFilter: fc.Arbitrary<ProductCategory[]> = fc.subarray(
  [...PRODUCT_CATEGORIES],
  { minLength: 0 },
);

/**
 * Generates a valid price range with min < max, or null (no price filter active).
 * min: 0.01–9999.98, max: min+0.01–9999.99
 */
export const arbPriceRange: fc.Arbitrary<{ min: number; max: number } | null> = fc.oneof(
  { weight: 1, arbitrary: fc.constant(null) },
  {
    weight: 3,
    arbitrary: fc
      .tuple(
        fc.integer({ min: 1, max: 999998 }),
        fc.integer({ min: 1, max: 999998 }),
      )
      .map(([a, b]) => {
        const min = Math.min(a, b) / 100;
        const max = Math.max(a, b) / 100 + 0.01;
        return { min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100 };
      }),
  },
);

/**
 * Generates selected star ratings (subset of [1, 2, 3, 4, 5]).
 * Can be empty (no rating filter active).
 */
export const arbRatingsFilter: fc.Arbitrary<number[]> = fc.subarray([1, 2, 3, 4, 5], {
  minLength: 0,
});

/**
 * Generates brand name selections for filtering.
 * Can be empty (no brand filter active).
 */
export const arbBrandsFilter: fc.Arbitrary<string[]> = fc.array(
  fc.string({ minLength: 1, maxLength: 30 }),
  { minLength: 0, maxLength: 10 },
);

/**
 * Generates a valid FilterState with random combination of filter groups.
 * Validates Properties 6, 7, 8.
 */
export const arbFilterState: fc.Arbitrary<FilterState> = fc.record({
  categories: arbCategoryFilter,
  priceRange: arbPriceRange,
  ratings: arbRatingsFilter,
  brands: arbBrandsFilter,
});

/**
 * Generates a FilterState with at least one active filter.
 * Useful for testing clear-all behavior (Property 8).
 */
export const arbActiveFilterState: fc.Arbitrary<FilterState> = arbFilterState.filter(
  (state) =>
    state.categories.length > 0 ||
    state.priceRange !== null ||
    state.ratings.length > 0 ||
    state.brands.length > 0,
);

/**
 * Generates an empty (no selections) FilterState.
 */
export const arbEmptyFilterState: fc.Arbitrary<FilterState> = fc.constant({
  categories: [],
  priceRange: null,
  ratings: [],
  brands: [],
});

/**
 * Generates highlighted filter IDs (max 3) for prescription tests.
 * Validates Property 7.
 */
export const arbHighlightedFilterIds: fc.Arbitrary<string[]> = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }),
  { minLength: 0, maxLength: 3 },
);

/**
 * Generates highlighted filter IDs that may exceed the 3-item limit (for edge case testing).
 */
export const arbHighlightedFilterIdsAnyLength: fc.Arbitrary<string[]> = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }),
  { minLength: 0, maxLength: 10 },
);
