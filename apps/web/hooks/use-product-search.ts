"use client";

/**
 * Product search hook for the AURA E-Commerce Demo.
 *
 * Wraps `ProductSearchEngine` from `@/lib/search`, manages query state,
 * debounced search execution, pagination (page tracking, loadMore), and sort option.
 * Emits AURA events on search submission and result viewing.
 *
 * @see Requirements 1.2, 1.3, 1.4
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ProductSearchEngine,
  createSearchEngine,
  PAGE_SIZE,
  MAX_EVENT_QUERY_LENGTH,
} from "@/lib/search";
import type { Product, SortOption } from "@/lib/types";
import { useAuraEmit } from "@aura/react";
import productsJson from "@/data/products.json";

/** Debounce delay in milliseconds (300ms per Requirement 1.2) */
const DEBOUNCE_MS = 300;

/** Minimum characters to trigger search (Requirement 1.2) */
const MIN_QUERY_LENGTH = 2;

export interface UseProductSearch {
  /** Current query text in the search input */
  query: string;
  /** Update the query text (triggers debounced search) */
  setQuery: (q: string) => void;
  /** Current page of search results */
  results: Product[];
  /** Whether a search is currently in progress */
  isLoading: boolean;
  /** Error message if search failed, null otherwise */
  error: string | null;
  /** Whether more results are available beyond the current page */
  hasMore: boolean;
  /** Load the next page of results (appends to existing results) */
  loadMore: () => void;
  /** Current sort option */
  sort: SortOption;
  /** Update the sort option (re-executes search) */
  setSort: (s: SortOption) => void;
}

/**
 * Hook that provides product search functionality with debouncing, pagination, and sorting.
 *
 * - Debounces input by 300ms after final keystroke (Requirement 1.2)
 * - Returns up to 20 products per page (Requirement 1.3)
 * - Supports sort options: relevance, price-low-to-high, price-high-to-low, rating (Requirement 1.4)
 * - Emits `search.submitted` and `surface.viewed` AURA events
 */
export function useProductSearch(): UseProductSearch {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSortState] = useState<SortOption>("relevance");
  const [page, setPage] = useState(1);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emit = useAuraEmit();

  // Initialize the search engine with the product catalog
  const engine = useMemo<ProductSearchEngine>(() => {
    return createSearchEngine(productsJson as unknown as Product[]);
  }, []);

  /**
   * Execute search against the engine and update state.
   */
  const executeSearch = useCallback(
    (searchQuery: string, searchSort: SortOption, searchPage: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const searchResults = engine.search(searchQuery, {
          sort: searchSort,
          page: searchPage,
        });

        if (searchPage === 1) {
          setResults(searchResults.products);
        } else {
          // Append results for load-more pagination
          setResults((prev) => [...prev, ...searchResults.products]);
        }
        setHasMore(searchResults.hasMore);
        setIsLoading(false);

        // Emit surface.viewed event when results render
        void emit({
          type: "surface.viewed",
          surfaceId: "search.results",
          timestamp: new Date().toISOString(),
          payload: {
            resultCount: searchResults.products.length,
          },
        });
      } catch {
        setError("Search is temporarily unavailable. Please try again.");
        setIsLoading(false);
      }
    },
    [engine, emit],
  );

  /**
   * Set the query with debounced search execution.
   * Emits `search.submitted` event once debounce fires.
   */
  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);

      // Clear existing debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Reset to page 1 on new query
      setPage(1);

      // Only trigger search if query meets minimum length or is empty (show all)
      if (q.trim().length >= MIN_QUERY_LENGTH || q.trim().length === 0) {
        setIsLoading(true);
        debounceTimer.current = setTimeout(() => {
          // Emit search.submitted event with truncated query
          void emit({
            type: "search.submitted",
            surfaceId: "search.results",
            timestamp: new Date().toISOString(),
            payload: {
              query: q.slice(0, MAX_EVENT_QUERY_LENGTH),
            },
          });

          executeSearch(q, sort, 1);
        }, DEBOUNCE_MS);
      }
    },
    [sort, executeSearch, emit],
  );

  /**
   * Update sort option and re-execute search from page 1.
   */
  const setSort = useCallback(
    (s: SortOption) => {
      setSortState(s);
      setPage(1);
      executeSearch(query, s, 1);
    },
    [query, executeSearch],
  );

  /**
   * Load the next page of results (appends to existing results).
   */
  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    executeSearch(query, sort, nextPage);
  }, [page, query, sort, executeSearch]);

  // Execute initial search on mount (empty query shows all products)
  useEffect(() => {
    executeSearch("", "relevance", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasMore,
    loadMore,
    sort,
    setSort,
  };
}
