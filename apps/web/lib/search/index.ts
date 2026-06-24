/**
 * MiniSearch-based product search engine for the AURA E-Commerce Demo.
 *
 * Provides full-text search with fuzzy matching (edit distance 1),
 * case-insensitive partial matching, pagination (20 per page),
 * and multiple sort options.
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 13.3
 */

import MiniSearch from "minisearch";
import type { SearchResult } from "minisearch";
import type { Product, SortOption } from "@/lib/types";

/** Maximum characters allowed in the search input field. */
export const MAX_QUERY_LENGTH = 200;

/** Maximum characters for a search query in emitted events. */
export const MAX_EVENT_QUERY_LENGTH = 256;

/** Number of results per page (load-more pagination). */
export const PAGE_SIZE = 20;

export interface SearchOptions {
  /** Sort mode (default: "relevance") */
  sort?: SortOption;
  /** 1-indexed page number (default: 1) */
  page?: number;
}

export interface SearchResults {
  /** Products for the current page */
  products: Product[];
  /** Total number of matching products (across all pages) */
  total: number;
  /** Whether more results are available beyond the current page */
  hasMore: boolean;
  /** The page number that was returned */
  page: number;
}

/**
 * ProductSearchEngine wraps MiniSearch and provides search, pagination, and sorting
 * over the product catalog.
 */
export class ProductSearchEngine {
  private index: MiniSearch<Product>;
  private catalog: Product[];
  private catalogMap: Map<string, Product>;

  constructor(products: Product[]) {
    this.catalog = products;
    this.catalogMap = new Map(products.map((p) => [p.id, p]));

    this.index = new MiniSearch<Product>({
      fields: ["name", "description", "category", "brand", "tags"],
      storeFields: ["id"],
      idField: "id",
      extractField: (document, fieldName) => {
        if (fieldName === "tags") {
          return (document as Product).tags.join(" ");
        }
        return (document as unknown as Record<string, unknown>)[fieldName] as string;
      },
      searchOptions: {
        boost: { name: 3, tags: 2, brand: 1.5, category: 1.5, description: 1 },
        fuzzy: (term) => (term.length > 2 ? 1 : false),
        prefix: true,
      },
      tokenize: (text) =>
        text
          .toLowerCase()
          .split(/[\s\-_/,.;:!?()[\]{}'"]+/)
          .filter((t) => t.length > 0),
    });

    this.index.addAll(products);
  }

  /**
   * Truncates a query string to the maximum allowed input length (200 chars).
   */
  truncateInput(query: string): string {
    return query.slice(0, MAX_QUERY_LENGTH);
  }

  /**
   * Truncates a query string for event emission (max 256 chars).
   */
  truncateForEvent(query: string): string {
    return query.slice(0, MAX_EVENT_QUERY_LENGTH);
  }

  /**
   * Search the catalog by text query with pagination and sorting.
   *
   * - The query is truncated to MAX_QUERY_LENGTH (200) characters.
   * - Fuzzy matching with edit distance 1 is applied for terms > 2 characters.
   * - Results are case-insensitive and support partial prefix matching.
   * - An empty/blank query returns all products (sorted as requested).
   */
  search(query: string, options: SearchOptions = {}): SearchResults {
    const { sort = "relevance", page = 1 } = options;

    // Truncate query to max allowed length
    const truncatedQuery = this.truncateInput(query.trim());

    let matchedProducts: Product[];

    if (truncatedQuery.length === 0) {
      // Empty query returns all products
      matchedProducts = [...this.catalog];
    } else {
      // Perform search with fuzzy and prefix matching
      const results: SearchResult[] = this.index.search(truncatedQuery, {
        fuzzy: (term) => (term.length > 2 ? 1 : false),
        prefix: true,
      });

      // Map search results back to full Product objects
      matchedProducts = results
        .map((r) => this.catalogMap.get(r.id as string))
        .filter((p): p is Product => p !== undefined);
    }

    // Sort results
    const sorted = this.sortProducts(matchedProducts, sort);

    // Paginate
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const paginatedProducts = sorted.slice(startIndex, endIndex);

    return {
      products: paginatedProducts,
      total: sorted.length,
      hasMore: endIndex < sorted.length,
      page,
    };
  }

  /**
   * Sort products according to the specified sort option.
   * "relevance" preserves the order from MiniSearch (or catalog order for empty queries).
   */
  private sortProducts(products: Product[], sort: SortOption): Product[] {
    switch (sort) {
      case "price-low-to-high":
        return [...products].sort((a, b) => a.price - b.price);
      case "price-high-to-low":
        return [...products].sort((a, b) => b.price - a.price);
      case "rating":
        return [...products].sort((a, b) => b.rating - a.rating);
      case "relevance":
      default:
        // Relevance order is already provided by MiniSearch ranking
        return products;
    }
  }

  /**
   * Get the total number of products in the catalog.
   */
  get size(): number {
    return this.catalog.length;
  }
}

/**
 * Creates and returns a ProductSearchEngine initialized with the provided products.
 */
export function createSearchEngine(products: Product[]): ProductSearchEngine {
  return new ProductSearchEngine(products);
}
