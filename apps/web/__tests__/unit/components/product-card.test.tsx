import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types/product";

// Mock usePrescription from @aura/react
vi.mock("@aura/react", () => ({
  usePrescription: vi.fn(() => undefined),
}));

import { usePrescription } from "@aura/react";
const mockUsePrescription = vi.mocked(usePrescription);

const mockProduct: Product = {
  id: "prod_001",
  name: "Test Laptop Pro",
  description:
    "This is a high-performance laptop with cutting-edge features designed for professionals who need power and portability in their daily work environment.",
  price: 999.99,
  category: "Laptops",
  brand: "TestBrand",
  rating: 4.5,
  reviews: 1234,
  imageUrl: "https://example.com/laptop.jpg",
  specs: {
    Processor: "Intel i9",
    RAM: "32GB",
    Storage: "1TB SSD",
    Display: "15.6 inch 4K",
    Battery: "12 hours",
    Weight: "1.8 kg",
  },
  tags: ["laptop", "professional", "ultrabook"],
  discount: 10,
};

describe("ProductCard", () => {
  beforeEach(() => {
    mockUsePrescription.mockReturnValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Standard variant", () => {
    it("renders title, price, rating, description, and add-to-cart", () => {
      render(<ProductCard product={mockProduct} variant="standard" />);

      expect(screen.getByText("Test Laptop Pro")).toBeInTheDocument();
      expect(screen.getByText("$899.99")).toBeInTheDocument(); // discounted price
      expect(screen.getByText("$999.99")).toBeInTheDocument(); // original price
      expect(screen.getByText("4.5")).toBeInTheDocument();
      // Description is truncated to 120 chars
      expect(screen.getByText(/This is a high-performance/)).toBeInTheDocument();
      expect(screen.getByLabelText("Add to cart")).toBeInTheDocument();
    });

    it("truncates description to 120 characters", () => {
      render(<ProductCard product={mockProduct} variant="standard" />);

      const descriptionEl = screen.getByText(/This is a high-performance/);
      // The full description is > 120 chars, so it should be truncated
      expect(descriptionEl.textContent!.length).toBeLessThanOrEqual(120);
    });

    it("is the default variant when no variant is specified", () => {
      render(<ProductCard product={mockProduct} />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("data-variant", "standard");
    });
  });

  describe("Compact variant", () => {
    it("renders title, price, rating, and add-to-cart without description", () => {
      render(<ProductCard product={mockProduct} variant="compact" />);

      expect(screen.getByText("Test Laptop Pro")).toBeInTheDocument();
      expect(screen.getByText("$899.99")).toBeInTheDocument();
      expect(screen.getByText("4.5")).toBeInTheDocument();
      expect(screen.getByLabelText("Add to cart")).toBeInTheDocument();

      // Description should NOT be present
      expect(
        screen.queryByText(/This is a high-performance/)
      ).not.toBeInTheDocument();
    });

    it("sets data-variant to compact", () => {
      render(<ProductCard product={mockProduct} variant="compact" />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("data-variant", "compact");
    });
  });

  describe("Comparison variant", () => {
    it("renders title, price, rating, add-to-cart, badge, and spec highlights", () => {
      render(<ProductCard product={mockProduct} variant="comparison" />);

      expect(screen.getByText("Test Laptop Pro")).toBeInTheDocument();
      expect(screen.getByText("$899.99")).toBeInTheDocument();
      expect(screen.getByText("4.5")).toBeInTheDocument();
      expect(screen.getByLabelText("Add to cart")).toBeInTheDocument();
      // Default comparison badge
      expect(screen.getByText("Compare")).toBeInTheDocument();
    });

    it("shows at most 5 spec highlights", () => {
      render(<ProductCard product={mockProduct} variant="comparison" />);

      const specList = screen.getByLabelText("Specifications");
      const items = specList.querySelectorAll("li");
      expect(items.length).toBeLessThanOrEqual(5);
    });

    it("shows a custom badge when provided", () => {
      render(
        <ProductCard
          product={mockProduct}
          variant="comparison"
          badgeLabel="Best Value"
        />
      );

      expect(screen.getByText("Best Value")).toBeInTheDocument();
      expect(screen.queryByText("Compare")).not.toBeInTheDocument();
    });
  });

  describe("Image-lead variant", () => {
    it("renders image, title, price, and add-to-cart", () => {
      render(<ProductCard product={mockProduct} variant="image-lead" />);

      expect(screen.getByText("Test Laptop Pro")).toBeInTheDocument();
      expect(screen.getByText("$899.99")).toBeInTheDocument();
      expect(screen.getByLabelText("Add to cart")).toBeInTheDocument();
      expect(screen.getByAltText("Test Laptop Pro")).toBeInTheDocument();
    });

    it("sets a fixed height on the card for image-lead", () => {
      render(<ProductCard product={mockProduct} variant="image-lead" />);

      const article = screen.getByRole("article");
      expect(article.className).toContain("h-[400px]");
    });

    it("image container has min-h-[60%]", () => {
      render(<ProductCard product={mockProduct} variant="image-lead" />);

      const article = screen.getByRole("article");
      const imageContainer = article.querySelector("[class*='min-h-\\[60%\\]']");
      expect(imageContainer).toBeInTheDocument();
    });
  });

  describe("Variant fallback", () => {
    it("falls back to standard on unrecognized variant", () => {
      render(<ProductCard product={mockProduct} variant="unknown-variant" />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("data-variant", "standard");
    });

    it("falls back to standard on empty string variant", () => {
      render(<ProductCard product={mockProduct} variant="" />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("data-variant", "standard");
    });
  });

  describe("Badge label", () => {
    it("displays badge label when provided", () => {
      render(
        <ProductCard product={mockProduct} variant="standard" badgeLabel="Top Pick" />
      );

      expect(screen.getByText("Top Pick")).toBeInTheDocument();
    });

    it("truncates badge label to 24 characters", () => {
      const longLabel = "This is a very long badge label text that exceeds limit";
      render(
        <ProductCard product={mockProduct} variant="standard" badgeLabel={longLabel} />
      );

      // The badge should contain at most 24 characters
      const badges = screen.getAllByText(/This is a very long badg/);
      badges.forEach((badge) => {
        expect(badge.textContent!.length).toBeLessThanOrEqual(24);
      });
    });
  });

  describe("Prescription integration", () => {
    it("uses variant from prescription over prop", () => {
      mockUsePrescription.mockReturnValue({
        id: "rx-1",
        surfaceId: "search.results",
        mode: "autoApply",
        latencyClass: "fast",
        contextLock: { sequenceId: 1, capturedAt: "2024-01-01T00:00:00Z" },
        adaptations: [
          {
            type: "componentVariant",
            slotId: "slot-1",
            componentId: "product-card",
            variant: "compact",
            reasonCode: "mobile-context",
          },
        ],
        constraints: { expiresAt: "2025-01-01T00:00:00Z" },
        manifestVersion: "1.0.0",
        audit: {},
      });

      render(<ProductCard product={mockProduct} variant="standard" />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("data-variant", "compact");
    });

    it("uses badge from prescription over prop", () => {
      mockUsePrescription.mockReturnValue({
        id: "rx-2",
        surfaceId: "search.results",
        mode: "autoApply",
        latencyClass: "fast",
        contextLock: { sequenceId: 1, capturedAt: "2024-01-01T00:00:00Z" },
        adaptations: [
          {
            type: "content",
            target: "product-card",
            contentKey: "badgeLabel",
            content: "Best Price",
            reasonCode: "price-sensitive",
          },
        ],
        constraints: { expiresAt: "2025-01-01T00:00:00Z" },
        manifestVersion: "1.0.0",
        audit: {},
      });

      render(
        <ProductCard product={mockProduct} variant="standard" badgeLabel="Old Badge" />
      );

      expect(screen.getAllByText("Best Price").length).toBeGreaterThan(0);
      expect(screen.queryByText("Old Badge")).not.toBeInTheDocument();
    });
  });

  describe("Adaptation indicator", () => {
    it("shows blue border when adapted via prescription", () => {
      mockUsePrescription.mockReturnValue({
        id: "rx-3",
        surfaceId: "search.results",
        mode: "autoApply",
        latencyClass: "fast",
        contextLock: { sequenceId: 1, capturedAt: "2024-01-01T00:00:00Z" },
        adaptations: [
          {
            type: "componentVariant",
            slotId: "slot-1",
            componentId: "product-card",
            variant: "standard",
            reasonCode: "default",
          },
        ],
        constraints: { expiresAt: "2025-01-01T00:00:00Z" },
        manifestVersion: "1.0.0",
        audit: {},
      });

      render(<ProductCard product={mockProduct} />);

      const article = screen.getByRole("article");
      expect(article.className).toContain("border-blue-500");
    });

    it("removes adaptation indicator after 3 seconds", () => {
      mockUsePrescription.mockReturnValue({
        id: "rx-4",
        surfaceId: "search.results",
        mode: "autoApply",
        latencyClass: "fast",
        contextLock: { sequenceId: 1, capturedAt: "2024-01-01T00:00:00Z" },
        adaptations: [
          {
            type: "componentVariant",
            slotId: "slot-1",
            componentId: "product-card",
            variant: "standard",
            reasonCode: "default",
          },
        ],
        constraints: { expiresAt: "2025-01-01T00:00:00Z" },
        manifestVersion: "1.0.0",
        audit: {},
      });

      render(<ProductCard product={mockProduct} />);

      const article = screen.getByRole("article");
      expect(article.className).toContain("border-blue-500");

      // After 3 seconds, the indicator should be removed
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(article.className).not.toContain("border-blue-500");
    });

    it("does not show indicator when no prescription", () => {
      mockUsePrescription.mockReturnValue(undefined);

      render(<ProductCard product={mockProduct} />);

      const article = screen.getByRole("article");
      expect(article.className).not.toContain("border-blue-500");
    });
  });

  describe("Accessibility", () => {
    it("has aria-label with product name", () => {
      render(<ProductCard product={mockProduct} />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("aria-label", "Product: Test Laptop Pro");
    });

    it("rating has aria-label", () => {
      render(<ProductCard product={mockProduct} variant="standard" />);

      expect(
        screen.getByLabelText("Rating: 4.5 out of 5")
      ).toBeInTheDocument();
    });
  });
});
