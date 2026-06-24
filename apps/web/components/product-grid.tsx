"use client";

/**
 * ProductGrid component that renders products in a responsive grid layout.
 *
 * Supports three layout densities controlled by AURA prescriptions:
 * - "compact": 4-column grid on desktop
 * - "standard": 3-column grid on desktop (default)
 * - "expanded": 2-column grid on desktop
 *
 * Responsive behavior:
 * - Mobile (<768px): 1 column
 * - Tablet (768px–1023px): 2 columns
 * - Desktop (1024px+): full density columns
 *
 * Provides "Load More" pagination (20 products per page) and CSS transitions
 * (200–500ms) for smooth layout changes when grid density adapts.
 *
 * @see Requirements 1.3, 1.6, 6.4, 14.3
 */

import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types/product";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LayoutDensity = "compact" | "standard" | "expanded";

export interface ProductGridProps {
  products: Product[];
  /** Product card variant to pass to all cards */
  variant?: string;
  /** Layout density: compact (4-col), standard (3-col), expanded (2-col) */
  layoutDensity?: LayoutDensity;
  /** Whether more products are available to load */
  hasMore?: boolean;
  /** Callback to load the next page of products */
  onLoadMore?: () => void;
  /** Whether a load operation is in progress */
  isLoading?: boolean;
  /** Badge label to pass to all cards */
  badgeLabel?: string;
}

// ─── Grid Layout Classes ─────────────────────────────────────────────────────

/**
 * Tailwind grid column classes for each density.
 * Mobile: 1 col, Tablet: 2 col, Desktop: density-specific columns.
 */
const GRID_CLASSES: Record<LayoutDensity, string> = {
  compact: "grid-cols-[repeat(auto-fit,minmax(190px,1fr))]",
  standard: "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
  expanded: "grid-cols-[repeat(auto-fit,minmax(300px,1fr))]",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductGrid({
  products,
  variant,
  layoutDensity = "standard",
  hasMore = false,
  onLoadMore,
  isLoading = false,
  badgeLabel,
}: ProductGridProps) {
  // Resolve density, falling back to "standard" if invalid value provided
  const density: LayoutDensity =
    layoutDensity === "compact" || layoutDensity === "standard" || layoutDensity === "expanded"
      ? layoutDensity
      : "standard";

  return (
    <section aria-label="Product results" className="w-full">
      {/* Product grid with transition for smooth layout density changes */}
      <div
        className={cn(
          "grid min-w-0 gap-4 transition-all duration-300",
          GRID_CLASSES[density]
        )}
        data-layout-density={density}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            variant={variant}
            badgeLabel={badgeLabel}
          />
        ))}
      </div>

      {/* Empty state */}
      {products.length === 0 && !isLoading && (
        <p className="py-12 text-center text-muted-foreground">
          No products to display.
        </p>
      )}

      {/* Load More button — shown when more results are available */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className={cn(
              "rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "disabled:pointer-events-none disabled:opacity-50",
              "transition-opacity duration-200"
            )}
            aria-label="Load more products"
          >
            {isLoading ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </section>
  );
}
