/**
 * Unit tests for the FilterPanel component.
 *
 * Validates:
 * - Multi-select filters (categories, price, ratings, brands)
 * - Collapsible sidebar behavior
 * - Prescription-driven highlighting (max 3)
 * - Prescription-driven collapsed state
 * - Interaction.clicked event emission via onFilterClick
 * - Clear-all control
 * - No-results message with clear-all prompt
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FilterPanel, type FilterPanelProps } from "@/components/filter-panel";
import type { FilterState } from "@/lib/types/product";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyFilterState(): FilterState {
  return {
    categories: [],
    priceRange: null,
    ratings: [],
    brands: [],
  };
}

function defaultProps(overrides: Partial<FilterPanelProps> = {}): FilterPanelProps {
  return {
    filterState: emptyFilterState(),
    onFilterChange: vi.fn(),
    availableBrands: ["Apple", "Samsung", "Sony", "Dell", "Bose"],
    ...overrides,
  };
}

// ─── Mock window.matchMedia ──────────────────────────────────────────────────

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("FilterPanel", () => {
  beforeEach(() => {
    // Default to desktop (≥768px) — panel expanded
    mockMatchMedia(true);
  });

  describe("rendering", () => {
    it("renders all 7 category checkboxes when expanded", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);

      expect(screen.getByLabelText("Laptops")).toBeInTheDocument();
      expect(screen.getByLabelText("Headphones")).toBeInTheDocument();
      expect(screen.getByLabelText("Smartphones")).toBeInTheDocument();
      expect(screen.getByLabelText("Accessories")).toBeInTheDocument();
      expect(screen.getByLabelText("Wearables")).toBeInTheDocument();
      expect(screen.getByLabelText("Tablets")).toBeInTheDocument();
      expect(screen.getByLabelText("Monitors")).toBeInTheDocument();
    });

    it("renders price range inputs when expanded", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);

      expect(screen.getByLabelText("Minimum price")).toBeInTheDocument();
      expect(screen.getByLabelText("Maximum price")).toBeInTheDocument();
    });

    it("renders 5 rating checkboxes when expanded", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);

      expect(screen.getByLabelText("5 stars & up")).toBeInTheDocument();
      expect(screen.getByLabelText("4 stars & up")).toBeInTheDocument();
      expect(screen.getByLabelText("3 stars & up")).toBeInTheDocument();
      expect(screen.getByLabelText("2 stars & up")).toBeInTheDocument();
      expect(screen.getByLabelText("1 stars & up")).toBeInTheDocument();
    });

    it("renders brand checkboxes from availableBrands", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);

      expect(screen.getByLabelText("Apple")).toBeInTheDocument();
      expect(screen.getByLabelText("Samsung")).toBeInTheDocument();
      expect(screen.getByLabelText("Sony")).toBeInTheDocument();
      expect(screen.getByLabelText("Dell")).toBeInTheDocument();
      expect(screen.getByLabelText("Bose")).toBeInTheDocument();
    });

    it("has accessible role and label", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);
      expect(screen.getByRole("complementary")).toHaveAttribute(
        "aria-label",
        "Product filters"
      );
    });
  });

  describe("collapsible behavior", () => {
    it("shows expanded content when collapsed prop is false", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);
      expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    it("hides filter content when collapsed prop is true", () => {
      render(<FilterPanel {...defaultProps({ collapsed: true })} />);
      expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    });

    it("shows toggle button with appropriate aria-label when expanded", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);
      expect(screen.getByLabelText("Collapse filters")).toBeInTheDocument();
    });

    it("shows toggle button with appropriate aria-label when collapsed", () => {
      render(<FilterPanel {...defaultProps({ collapsed: true })} />);
      expect(screen.getByLabelText("Expand filters")).toBeInTheDocument();
    });

    it("prescription-controlled collapsed state overrides internal state", () => {
      // Even on desktop (matchMedia=true), collapsed=true from prescription forces collapse
      render(<FilterPanel {...defaultProps({ collapsed: true })} />);
      expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    });
  });

  describe("filter interactions", () => {
    it("calls onFilterChange when a category is selected", () => {
      const onFilterChange = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({ onFilterChange, collapsed: false })}
        />
      );

      fireEvent.click(screen.getByLabelText("Laptops"));

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ["Laptops"],
        })
      );
    });

    it("calls onFilterChange when a category is deselected", () => {
      const onFilterChange = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({
            onFilterChange,
            collapsed: false,
            filterState: {
              ...emptyFilterState(),
              categories: ["Laptops", "Tablets"],
            },
          })}
        />
      );

      fireEvent.click(screen.getByLabelText("Laptops"));

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ["Tablets"],
        })
      );
    });

    it("calls onFilterChange when a rating is selected", () => {
      const onFilterChange = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({ onFilterChange, collapsed: false })}
        />
      );

      fireEvent.click(screen.getByLabelText("4 stars & up"));

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ratings: [4],
        })
      );
    });

    it("calls onFilterChange when a brand is selected", () => {
      const onFilterChange = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({ onFilterChange, collapsed: false })}
        />
      );

      fireEvent.click(screen.getByLabelText("Sony"));

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          brands: ["Sony"],
        })
      );
    });
  });

  describe("event emission via onFilterClick", () => {
    it("emits interaction.clicked with filter type and category ID on category select", () => {
      const onFilterClick = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({ onFilterClick, collapsed: false })}
        />
      );

      fireEvent.click(screen.getByLabelText("Headphones"));

      expect(onFilterClick).toHaveBeenCalledWith("filter", "category-Headphones");
    });

    it("emits interaction.clicked with filter type and rating ID on rating select", () => {
      const onFilterClick = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({ onFilterClick, collapsed: false })}
        />
      );

      fireEvent.click(screen.getByLabelText("3 stars & up"));

      expect(onFilterClick).toHaveBeenCalledWith("filter", "rating-3");
    });

    it("emits interaction.clicked with filter type and brand ID on brand select", () => {
      const onFilterClick = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({ onFilterClick, collapsed: false })}
        />
      );

      fireEvent.click(screen.getByLabelText("Apple"));

      expect(onFilterClick).toHaveBeenCalledWith("filter", "brand-Apple");
    });

    it("emits interaction.clicked with clear-all ID on clear all", () => {
      const onFilterClick = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({
            onFilterClick,
            collapsed: false,
            filterState: {
              ...emptyFilterState(),
              categories: ["Laptops"],
            },
          })}
        />
      );

      fireEvent.click(screen.getByLabelText("Clear all filters"));

      expect(onFilterClick).toHaveBeenCalledWith("filter", "clear-all");
    });
  });

  describe("clear-all control", () => {
    it("shows clear-all button when filters are active", () => {
      render(
        <FilterPanel
          {...defaultProps({
            collapsed: false,
            filterState: {
              ...emptyFilterState(),
              categories: ["Laptops"],
            },
          })}
        />
      );

      expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
    });

    it("does not show clear-all button when no filters are active", () => {
      render(<FilterPanel {...defaultProps({ collapsed: false })} />);
      expect(screen.queryByLabelText("Clear all filters")).not.toBeInTheDocument();
    });

    it("resets all filters when clear-all is clicked", () => {
      const onFilterChange = vi.fn();
      render(
        <FilterPanel
          {...defaultProps({
            onFilterChange,
            collapsed: false,
            filterState: {
              categories: ["Laptops", "Tablets"],
              priceRange: { min: 100, max: 500 },
              ratings: [4, 5],
              brands: ["Apple"],
            },
          })}
        />
      );

      fireEvent.click(screen.getByLabelText("Clear all filters"));

      expect(onFilterChange).toHaveBeenCalledWith({
        categories: [],
        priceRange: null,
        ratings: [],
        brands: [],
      });
    });
  });

  describe("no-results message", () => {
    it("shows no-results message when showNoResults is true", () => {
      render(
        <FilterPanel
          {...defaultProps({ showNoResults: true, collapsed: false })}
        />
      );

      expect(
        screen.getByText("No products match the current filters.")
      ).toBeInTheDocument();
    });

    it("shows clear-all prompt within no-results message", () => {
      render(
        <FilterPanel
          {...defaultProps({ showNoResults: true, collapsed: false })}
        />
      );

      expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    });

    it("does not show no-results message when showNoResults is false", () => {
      render(
        <FilterPanel
          {...defaultProps({ showNoResults: false, collapsed: false })}
        />
      );

      expect(
        screen.queryByText("No products match the current filters.")
      ).not.toBeInTheDocument();
    });
  });

  describe("highlighted filter IDs", () => {
    it("applies highlight styling to specified filter items (max 3)", () => {
      const { container } = render(
        <FilterPanel
          {...defaultProps({
            collapsed: false,
            highlightedFilterIds: [
              "category-Laptops",
              "rating-5",
              "brand-Apple",
            ],
          })}
        />
      );

      // The highlighted items should have the ring-2 ring-amber-500 classes
      const highlightedElements = container.querySelectorAll(".ring-amber-500");
      expect(highlightedElements.length).toBeGreaterThanOrEqual(3);
    });

    it("caps highlights at 3 even if more IDs are provided", () => {
      const { container } = render(
        <FilterPanel
          {...defaultProps({
            collapsed: false,
            highlightedFilterIds: [
              "category-Laptops",
              "category-Tablets",
              "category-Monitors",
              "category-Wearables", // 4th should be ignored
            ],
          })}
        />
      );

      // Only first 3 should be highlighted at the item level
      const laptopsLabel = screen.getByLabelText("Laptops").closest("label");
      const tabletsLabel = screen.getByLabelText("Tablets").closest("label");
      const monitorsLabel = screen.getByLabelText("Monitors").closest("label");
      const wearablesLabel = screen.getByLabelText("Wearables").closest("label");

      expect(laptopsLabel?.className).toContain("ring-amber-500");
      expect(tabletsLabel?.className).toContain("ring-amber-500");
      expect(monitorsLabel?.className).toContain("ring-amber-500");
      expect(wearablesLabel?.className).not.toContain("ring-amber-500");
    });

    it("highlights filter groups when group ID is specified", () => {
      const { container } = render(
        <FilterPanel
          {...defaultProps({
            collapsed: false,
            highlightedFilterIds: ["categories"],
          })}
        />
      );

      // The categories section wrapper should have highlight class
      const highlightedSections = container.querySelectorAll(
        "div.ring-amber-500"
      );
      expect(highlightedSections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("active filter count in collapsed state", () => {
    it("shows active filter count badge when collapsed with active filters", () => {
      render(
        <FilterPanel
          {...defaultProps({
            collapsed: true,
            filterState: {
              categories: ["Laptops", "Tablets"],
              priceRange: { min: 100, max: 500 },
              ratings: [4],
              brands: [],
            },
          })}
        />
      );

      // 2 categories + 1 price range + 1 rating = 4
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });
});
