"use client";

/**
 * Filter state management hook for the AURA E-Commerce Demo.
 *
 * Wraps `applyFilters` and `clearAll` from `@/lib/filters/engine`,
 * tracks active filter count, and emits AURA interaction events.
 *
 * @see Requirements 3.1, 3.7
 */

import { useState, useCallback, useMemo } from "react";
import { clearAll as clearAllFilters } from "@/lib/filters/engine";
import type { FilterState, ProductCategory } from "@/lib/types";
import { useAuraEmit } from "@aura/react";

export interface UseFilters {
  /** Current filter state */
  filters: FilterState;
  /** Set filter values for a specific group */
  setFilter: (group: string, values: string[]) => void;
  /** Clear all active filters */
  clearAll: () => void;
  /** Number of active filter groups (groups with at least one selection) */
  activeCount: number;
}

/**
 * Hook that manages filter state for the product catalog.
 *
 * - Manages categories, priceRange, ratings, and brands filter groups
 * - Provides OR logic within groups, AND logic across groups (via applyFilters in engine)
 * - Tracks the number of active filter groups
 * - Emits `interaction.clicked` AURA events on filter changes
 *
 * @see Requirements 3.1, 3.7
 */
export function useFilters(): UseFilters {
  const [filters, setFilters] = useState<FilterState>(clearAllFilters());
  const emit = useAuraEmit();

  /**
   * Compute the number of active filter groups.
   * A group is "active" if it has at least one non-null/non-empty selection.
   */
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.priceRange !== null) count++;
    if (filters.ratings.length > 0) count++;
    if (filters.brands.length > 0) count++;
    return count;
  }, [filters]);

  /**
   * Set filter values for a specific group.
   *
   * Supported groups: "categories", "priceRange", "ratings", "brands"
   *
   * - For "categories": values are ProductCategory strings
   * - For "priceRange": values should be [min, max] as string numbers, or empty to clear
   * - For "ratings": values are rating numbers as strings (e.g., ["4", "5"])
   * - For "brands": values are brand name strings
   */
  const setFilter = useCallback(
    (group: string, values: string[]) => {
      setFilters((prev) => {
        const next = { ...prev };

        switch (group) {
          case "categories":
            next.categories = values as ProductCategory[];
            break;
          case "priceRange":
            if (values.length === 2) {
              const min = parseFloat(values[0]);
              const max = parseFloat(values[1]);
              if (!isNaN(min) && !isNaN(max)) {
                next.priceRange = { min, max };
              }
            } else {
              next.priceRange = null;
            }
            break;
          case "ratings":
            next.ratings = values.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n));
            break;
          case "brands":
            next.brands = values;
            break;
          default:
            // Unknown group — no-op
            return prev;
        }

        return next;
      });

      // Emit interaction.clicked event for filter change
      void emit({
        type: "interaction.clicked",
        surfaceId: "filter.panel",
        timestamp: new Date().toISOString(),
        payload: {
          elementType: "filter",
          elementId: group,
        },
      });
    },
    [emit],
  );

  /**
   * Clear all active filters, resetting to the initial empty state.
   * @see Requirement 3.7
   */
  const clearAll = useCallback(() => {
    setFilters(clearAllFilters());
  }, []);

  return {
    filters,
    setFilter,
    clearAll,
    activeCount,
  };
}
