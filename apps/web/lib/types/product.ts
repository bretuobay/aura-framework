/**
 * Product catalog types for the AURA E-Commerce Demo.
 * Defines the product schema, categories, filter state, and sort options.
 *
 * @see Requirements 13.2
 */

/**
 * The 7 product categories supported by the catalog.
 */
export type ProductCategory =
  | "Laptops"
  | "Headphones"
  | "Smartphones"
  | "Accessories"
  | "Wearables"
  | "Tablets"
  | "Monitors";

/**
 * A product in the catalog.
 *
 * Constraints:
 * - id: unique non-empty string (e.g. "prod_001")
 * - name: max 100 characters
 * - description: max 500 characters
 * - price: 0.01 – 9999.99
 * - category: one of 7 ProductCategory values
 * - brand: max 50 characters
 * - rating: 1.0 – 5.0, increments of 0.1
 * - reviews: 0 – 99999
 * - imageUrl: valid URL string
 * - specs: at least 3 key-value pairs
 * - tags: 2–10 lowercase keyword strings
 * - discount: 0 – 70 (percentage)
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  brand: string;
  rating: number;
  reviews: number;
  imageUrl: string;
  specs: Record<string, string>;
  tags: string[];
  discount: number;
}

/**
 * Filter state representing the user's active filter selections.
 *
 * - OR logic within each group (e.g. selecting multiple categories matches any)
 * - AND logic across groups (all groups must be satisfied)
 */
export interface FilterState {
  categories: ProductCategory[];
  priceRange: { min: number; max: number } | null;
  ratings: number[];
  brands: string[];
}

/**
 * Available sort options for search results.
 */
export type SortOption =
  | "relevance"
  | "price-low-to-high"
  | "price-high-to-low"
  | "rating";
