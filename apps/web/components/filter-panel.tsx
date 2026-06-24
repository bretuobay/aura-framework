"use client";

/**
 * FilterPanel component for the AURA E-Commerce Demo.
 *
 * Provides multi-select filters for categories, price range, ratings, and brands.
 * Supports collapsible sidebar, prescription-driven highlighting and collapse,
 * event emission on filter selection, clear-all control, and no-results messaging.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import type { FilterState, ProductCategory } from "@/lib/types/product";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_CATEGORIES: ProductCategory[] = [
  "Laptops",
  "Headphones",
  "Smartphones",
  "Accessories",
  "Wearables",
  "Tablets",
  "Monitors",
];

const ALL_RATINGS = [5, 4, 3, 2, 1];

/** Maximum number of highlighted filters at any time */
const MAX_HIGHLIGHTED = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilterPanelProps {
  /** Current filter state (controlled component) */
  filterState: FilterState;
  /** Callback when filter state changes */
  onFilterChange: (newState: FilterState) => void;
  /** List of available brands to display in the brand filter group */
  availableBrands: string[];
  /** Highlighted filter IDs from prescriptions (max 3 applied) */
  highlightedFilterIds?: string[];
  /** Collapsed state from prescriptions; overrides internal state */
  collapsed?: boolean;
  /** Callback for filter click events (parent connects to AURA event emission) */
  onFilterClick?: (elementType: "filter", elementId: string) => void;
  /** Whether to show the no-results message */
  showNoResults?: boolean;
  /** Optional className for the wrapper */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a set of highlighted IDs, capped at MAX_HIGHLIGHTED.
 */
function getHighlightedSet(ids?: string[]): Set<string> {
  if (!ids || ids.length === 0) return new Set();
  return new Set(ids.slice(0, MAX_HIGHLIGHTED));
}

/**
 * Checks if a filter group or item should be highlighted.
 */
function isHighlighted(id: string, highlightedSet: Set<string>): boolean {
  return highlightedSet.has(id);
}

/**
 * Count the number of active filters across all groups.
 */
function countActiveFilters(filterState: FilterState): number {
  let count = 0;
  count += filterState.categories.length;
  count += filterState.priceRange !== null ? 1 : 0;
  count += filterState.ratings.length;
  count += filterState.brands.length;
  return count;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterGroupHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
      {title}
      {count !== undefined && count > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {count}
        </span>
      )}
    </h3>
  );
}

function CheckboxItem({
  id,
  label,
  checked,
  onChange,
  highlighted,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlighted?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-all duration-200 hover:bg-accent/50",
        highlighted && "ring-2 ring-amber-500 bg-amber-500/5"
      )}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
      />
      <span className="text-foreground">{label}</span>
    </label>
  );
}

function RatingCheckboxItem({
  rating,
  checked,
  onChange,
  highlighted,
}: {
  rating: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlighted?: boolean;
}) {
  const id = `filter-rating-${rating}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-all duration-200 hover:bg-accent/50",
        highlighted && "ring-2 ring-amber-500 bg-amber-500/5"
      )}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
      />
      <span className="flex items-center gap-0.5" aria-label={`${rating} stars & up`}>
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        ))}
        {Array.from({ length: 5 - rating }).map((_, i) => (
          <Star key={`empty-${i}`} className="h-3.5 w-3.5 text-muted-foreground/30" />
        ))}
        <span className="ml-1 text-muted-foreground">& up</span>
      </span>
    </label>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FilterPanel({
  filterState,
  onFilterChange,
  availableBrands,
  highlightedFilterIds,
  collapsed: collapsedProp,
  onFilterClick,
  showNoResults = false,
  className,
}: FilterPanelProps) {
  // Internal collapsed state: default expanded ≥768px, collapsed <768px
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  // Prescription-controlled collapse overrides internal state
  const isCollapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;

  // Listen for viewport changes to update default collapsed state
  useEffect(() => {
    if (collapsedProp !== undefined) return; // Prescription controls state

    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      setInternalCollapsed(!e.matches);
    };

    setInternalCollapsed(!mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [collapsedProp]);

  // Highlighted filter set (capped at 3)
  const highlightedSet = getHighlightedSet(highlightedFilterIds);

  // Active filter count
  const activeCount = countActiveFilters(filterState);

  // ─── Filter change handlers ──────────────────────────────────────────────

  const handleCategoryChange = useCallback(
    (category: ProductCategory, checked: boolean) => {
      const newCategories = checked
        ? [...filterState.categories, category]
        : filterState.categories.filter((c) => c !== category);

      onFilterChange({ ...filterState, categories: newCategories });
      onFilterClick?.("filter", `category-${category}`);
    },
    [filterState, onFilterChange, onFilterClick]
  );

  const handlePriceMinChange = useCallback(
    (value: string) => {
      const min = value === "" ? 0 : Number(value);
      const currentMax = filterState.priceRange?.max ?? 9999.99;
      const newRange = min === 0 && currentMax === 9999.99 ? null : { min, max: currentMax };
      onFilterChange({ ...filterState, priceRange: newRange });
    },
    [filterState, onFilterChange]
  );

  const handlePriceMaxChange = useCallback(
    (value: string) => {
      const max = value === "" ? 9999.99 : Number(value);
      const currentMin = filterState.priceRange?.min ?? 0;
      const newRange = currentMin === 0 && max === 9999.99 ? null : { min: currentMin, max };
      onFilterChange({ ...filterState, priceRange: newRange });
    },
    [filterState, onFilterChange]
  );

  const handlePriceApply = useCallback(() => {
    onFilterClick?.("filter", "price-range");
  }, [onFilterClick]);

  const handleRatingChange = useCallback(
    (rating: number, checked: boolean) => {
      const newRatings = checked
        ? [...filterState.ratings, rating]
        : filterState.ratings.filter((r) => r !== rating);

      onFilterChange({ ...filterState, ratings: newRatings });
      onFilterClick?.("filter", `rating-${rating}`);
    },
    [filterState, onFilterChange, onFilterClick]
  );

  const handleBrandChange = useCallback(
    (brand: string, checked: boolean) => {
      const newBrands = checked
        ? [...filterState.brands, brand]
        : filterState.brands.filter((b) => b !== brand);

      onFilterChange({ ...filterState, brands: newBrands });
      onFilterClick?.("filter", `brand-${brand}`);
    },
    [filterState, onFilterChange, onFilterClick]
  );

  const handleClearAll = useCallback(() => {
    onFilterChange({
      categories: [],
      priceRange: null,
      ratings: [],
      brands: [],
    });
    onFilterClick?.("filter", "clear-all");
  }, [onFilterChange, onFilterClick]);

  const handleToggleCollapse = useCallback(() => {
    if (collapsedProp === undefined) {
      setInternalCollapsed((prev) => !prev);
    }
  }, [collapsedProp]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-card transition-all duration-300",
        isCollapsed ? "w-12" : "w-64",
        className
      )}
      aria-label="Product filters"
      role="complementary"
    >
      {/* Toggle button */}
      <button
        onClick={handleToggleCollapse}
        className="absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors"
        aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Collapsed state: show only icon indicators */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-3 pt-12 px-1">
          {activeCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </div>
      )}

      {/* Expanded state: full filter panel */}
      {!isCollapsed && (
        <div className="flex flex-col gap-5 overflow-y-auto p-4 pt-10">
          {/* Header with Clear All */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Filters</h2>
            {activeCount > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Clear all filters"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>

          {/* No results message */}
          {showNoResults && (
            <div className="rounded-md border border-dashed border-muted-foreground/30 p-3 text-center">
              <p className="text-sm text-muted-foreground">
                No products match the current filters.
              </p>
              <button
                onClick={handleClearAll}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Categories filter group */}
          <div
            className={cn(
              "flex flex-col gap-2 rounded-lg p-2 transition-all duration-200",
              isHighlighted("categories", highlightedSet) &&
                "ring-2 ring-amber-500 bg-amber-500/5"
            )}
          >
            <FilterGroupHeader
              title="Categories"
              count={filterState.categories.length}
            />
            <div className="flex flex-col gap-0.5">
              {ALL_CATEGORIES.map((category) => (
                <CheckboxItem
                  key={category}
                  id={`filter-category-${category}`}
                  label={category}
                  checked={filterState.categories.includes(category)}
                  onChange={(checked) => handleCategoryChange(category, checked)}
                  highlighted={isHighlighted(
                    `category-${category}`,
                    highlightedSet
                  )}
                />
              ))}
            </div>
          </div>

          {/* Price range filter group */}
          <div
            className={cn(
              "flex flex-col gap-2 rounded-lg p-2 transition-all duration-200",
              isHighlighted("price-range", highlightedSet) &&
                "ring-2 ring-amber-500 bg-amber-500/5"
            )}
          >
            <FilterGroupHeader
              title="Price Range"
              count={filterState.priceRange !== null ? 1 : 0}
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                min={0}
                max={9999.99}
                step={0.01}
                value={filterState.priceRange?.min ?? ""}
                onChange={(e) => handlePriceMinChange(e.target.value)}
                onBlur={handlePriceApply}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Minimum price"
              />
              <span className="text-sm text-muted-foreground">–</span>
              <input
                type="number"
                placeholder="Max"
                min={0}
                max={9999.99}
                step={0.01}
                value={filterState.priceRange?.max ?? ""}
                onChange={(e) => handlePriceMaxChange(e.target.value)}
                onBlur={handlePriceApply}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Maximum price"
              />
            </div>
          </div>

          {/* Ratings filter group */}
          <div
            className={cn(
              "flex flex-col gap-2 rounded-lg p-2 transition-all duration-200",
              isHighlighted("ratings", highlightedSet) &&
                "ring-2 ring-amber-500 bg-amber-500/5"
            )}
          >
            <FilterGroupHeader
              title="Ratings"
              count={filterState.ratings.length}
            />
            <div className="flex flex-col gap-0.5">
              {ALL_RATINGS.map((rating) => (
                <RatingCheckboxItem
                  key={rating}
                  rating={rating}
                  checked={filterState.ratings.includes(rating)}
                  onChange={(checked) => handleRatingChange(rating, checked)}
                  highlighted={isHighlighted(
                    `rating-${rating}`,
                    highlightedSet
                  )}
                />
              ))}
            </div>
          </div>

          {/* Brands filter group */}
          <div
            className={cn(
              "flex flex-col gap-2 rounded-lg p-2 transition-all duration-200",
              isHighlighted("brands", highlightedSet) &&
                "ring-2 ring-amber-500 bg-amber-500/5"
            )}
          >
            <FilterGroupHeader
              title="Brands"
              count={filterState.brands.length}
            />
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {availableBrands.map((brand) => (
                <CheckboxItem
                  key={brand}
                  id={`filter-brand-${brand}`}
                  label={brand}
                  checked={filterState.brands.includes(brand)}
                  onChange={(checked) => handleBrandChange(brand, checked)}
                  highlighted={isHighlighted(
                    `brand-${brand}`,
                    highlightedSet
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default FilterPanel;
