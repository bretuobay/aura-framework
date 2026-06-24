/**
 * Filter engine for the AURA E-Commerce Demo.
 *
 * Implements multi-select filtering with:
 * - OR logic within each filter group (any selected option matches)
 * - AND logic across filter groups (all active groups must be satisfied)
 *
 * @see Requirements 3.1, 3.3, 3.7
 */

import type { Product, FilterState, ProductCategory } from "@/lib/types";

/**
 * Returns an empty FilterState with no active filters.
 * Used to reset all filter selections (clear-all action).
 *
 * @see Requirement 3.7
 */
export function clearAll(): FilterState {
  return {
    categories: [],
    priceRange: null,
    ratings: [],
    brands: [],
  };
}

/**
 * Checks whether a product matches the category filter group.
 * Empty categories array means no category filter is active (all pass).
 * OR logic: product matches if its category is ANY of the selected categories.
 */
function matchesCategories(
  product: Product,
  categories: ProductCategory[],
): boolean {
  if (categories.length === 0) return true;
  return categories.includes(product.category);
}

/**
 * Checks whether a product matches the price range filter.
 * Null priceRange means no price filter is active (all pass).
 * Product matches if its price is within [min, max] inclusive.
 */
function matchesPriceRange(
  product: Product,
  priceRange: { min: number; max: number } | null,
): boolean {
  if (priceRange === null) return true;
  return product.price >= priceRange.min && product.price <= priceRange.max;
}

/**
 * Checks whether a product matches the ratings filter group.
 * Empty ratings array means no rating filter is active (all pass).
 * OR logic: product matches if floor(product.rating) equals ANY of the
 * selected rating values.
 *
 * Example: if user selects "4 stars", products with rating 4.0–4.9 match.
 */
function matchesRatings(product: Product, ratings: number[]): boolean {
  if (ratings.length === 0) return true;
  const productRatingFloor = Math.floor(product.rating);
  return ratings.includes(productRatingFloor);
}

/**
 * Checks whether a product matches the brands filter group.
 * Empty brands array means no brand filter is active (all pass).
 * OR logic: product matches if its brand is ANY of the selected brands.
 * Comparison is case-insensitive.
 */
function matchesBrands(product: Product, brands: string[]): boolean {
  if (brands.length === 0) return true;
  const lowerBrands = brands.map((b) => b.toLowerCase());
  return lowerBrands.includes(product.brand.toLowerCase());
}

/**
 * Applies the given filter state to a list of products.
 *
 * - OR logic within each group: selecting multiple options within the same
 *   filter group matches products that satisfy ANY selected option.
 * - AND logic across groups: selections across different filter groups match
 *   products that satisfy ALL groups.
 * - Empty filter arrays / null priceRange mean "no filter active" for that group
 *   (all products pass that group).
 *
 * @param products - The full list of products to filter
 * @param filterState - The current filter selections
 * @returns The filtered list of products matching all active criteria
 *
 * @see Requirement 3.1, 3.3
 */
export function applyFilters(
  products: Product[],
  filterState: FilterState,
): Product[] {
  return products.filter((product) => {
    // AND across groups: product must pass ALL active filter groups
    return (
      matchesCategories(product, filterState.categories) &&
      matchesPriceRange(product, filterState.priceRange) &&
      matchesRatings(product, filterState.ratings) &&
      matchesBrands(product, filterState.brands)
    );
  });
}
