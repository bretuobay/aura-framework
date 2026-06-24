/**
 * Unit tests for the filter engine.
 * Validates OR-within-group, AND-across-groups logic, and clearAll behavior.
 *
 * @see Requirements 3.1, 3.3, 3.7
 */

import { describe, it, expect } from "vitest";
import { applyFilters, clearAll } from "@/lib/filters/engine";
import type { Product, FilterState } from "@/lib/types";

const mockProducts: Product[] = [
  {
    id: "prod_001",
    name: "Gaming Laptop",
    description: "Powerful gaming laptop",
    price: 1499.99,
    category: "Laptops",
    brand: "TechBrand",
    rating: 4.5,
    reviews: 120,
    imageUrl: "https://example.com/img1.jpg",
    specs: { CPU: "i9", RAM: "32GB", Storage: "1TB SSD" },
    tags: ["gaming", "laptop"],
    discount: 10,
  },
  {
    id: "prod_002",
    name: "Wireless Headphones",
    description: "Noise cancelling headphones",
    price: 299.99,
    category: "Headphones",
    brand: "AudioCo",
    rating: 4.2,
    reviews: 500,
    imageUrl: "https://example.com/img2.jpg",
    specs: { Driver: "40mm", Battery: "30h", ANC: "Yes" },
    tags: ["wireless", "headphones", "anc"],
    discount: 0,
  },
  {
    id: "prod_003",
    name: "Budget Phone",
    description: "Affordable smartphone",
    price: 199.99,
    category: "Smartphones",
    brand: "PhoneMaker",
    rating: 3.8,
    reviews: 1000,
    imageUrl: "https://example.com/img3.jpg",
    specs: { Screen: "6.5in", RAM: "4GB", Storage: "64GB" },
    tags: ["budget", "phone"],
    discount: 15,
  },
  {
    id: "prod_004",
    name: "Premium Laptop",
    description: "Ultra-thin premium laptop",
    price: 2499.99,
    category: "Laptops",
    brand: "LuxTech",
    rating: 4.8,
    reviews: 80,
    imageUrl: "https://example.com/img4.jpg",
    specs: { CPU: "M2", RAM: "16GB", Storage: "512GB SSD" },
    tags: ["premium", "laptop", "ultraportable"],
    discount: 0,
  },
  {
    id: "prod_005",
    name: "Fitness Watch",
    description: "Smart fitness tracker",
    price: 149.99,
    category: "Wearables",
    brand: "FitGear",
    rating: 3.5,
    reviews: 2000,
    imageUrl: "https://example.com/img5.jpg",
    specs: { Battery: "7 days", GPS: "Yes", Water: "5ATM" },
    tags: ["fitness", "watch", "tracker"],
    discount: 20,
  },
  {
    id: "prod_006",
    name: "Pro Headphones",
    description: "Studio quality headphones",
    price: 599.99,
    category: "Headphones",
    brand: "TechBrand",
    rating: 5.0,
    reviews: 50,
    imageUrl: "https://example.com/img6.jpg",
    specs: { Driver: "50mm", Impedance: "250Ω", Type: "Over-ear" },
    tags: ["studio", "headphones", "pro"],
    discount: 5,
  },
];

describe("Filter Engine - applyFilters", () => {
  describe("empty/no filters (no constraint = matches all)", () => {
    it("returns all products when all filter groups are empty", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(mockProducts.length);
      expect(result).toEqual(mockProducts);
    });

    it("handles empty product list", () => {
      const filter: FilterState = {
        categories: ["Laptops"],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      expect(applyFilters([], filter)).toHaveLength(0);
    });
  });

  describe("OR within category group", () => {
    it("matches product in either selected category", () => {
      const filter: FilterState = {
        categories: ["Laptops", "Headphones"],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // prod_001 (Laptops), prod_002 (Headphones), prod_004 (Laptops), prod_006 (Headphones)
      expect(result).toHaveLength(4);
      expect(
        result.every(
          (p) => p.category === "Laptops" || p.category === "Headphones",
        ),
      ).toBe(true);
    });

    it("single category filters correctly", () => {
      const filter: FilterState = {
        categories: ["Wearables"],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("prod_005");
    });
  });

  describe("price range filter", () => {
    it("includes products within [min, max] inclusive", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: { min: 149.99, max: 299.99 },
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // prod_002 (299.99), prod_003 (199.99), prod_005 (149.99)
      expect(result).toHaveLength(3);
      expect(result.every((p) => p.price >= 149.99 && p.price <= 299.99)).toBe(
        true,
      );
    });

    it("excludes products outside the range", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: { min: 3000, max: 5000 },
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(0);
    });

    it("null priceRange means no constraint", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(mockProducts.length);
    });
  });

  describe("ratings filter (floor logic)", () => {
    it("matches products where floor(rating) equals selected value", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [4],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // floor(4.5)=4, floor(4.2)=4, floor(4.8)=4 => prod_001, prod_002, prod_004
      expect(result).toHaveLength(3);
      expect(result.every((p) => Math.floor(p.rating) === 4)).toBe(true);
    });

    it("OR logic: matches if floor(rating) is any selected value", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [3, 5],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // floor(3.8)=3 (prod_003), floor(3.5)=3 (prod_005), floor(5.0)=5 (prod_006)
      expect(result).toHaveLength(3);
      expect(
        result.every((p) => [3, 5].includes(Math.floor(p.rating))),
      ).toBe(true);
    });

    it("excludes products whose floor(rating) does not match", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [1, 2],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(0);
    });
  });

  describe("brands filter (case-insensitive OR)", () => {
    it("matches brand case-insensitively", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [],
        brands: ["TECHBRAND"],
      };
      const result = applyFilters(mockProducts, filter);
      // prod_001 and prod_006 are TechBrand
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.brand === "TechBrand")).toBe(true);
    });

    it("OR logic: matches if brand is any of the selected brands", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [],
        brands: ["AudioCo", "FitGear"],
      };
      const result = applyFilters(mockProducts, filter);
      // prod_002 (AudioCo), prod_005 (FitGear)
      expect(result).toHaveLength(2);
    });
  });

  describe("AND logic across groups", () => {
    it("requires product to match ALL active filter groups", () => {
      const filter: FilterState = {
        categories: ["Laptops"],
        priceRange: { min: 2000, max: 3000 },
        ratings: [4],
        brands: ["LuxTech"],
      };
      const result = applyFilters(mockProducts, filter);
      // Only prod_004: Laptops, price=2499.99, floor(4.8)=4, LuxTech
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("prod_004");
    });

    it("returns empty when groups contradict", () => {
      const filter: FilterState = {
        categories: ["Laptops"],
        priceRange: null,
        ratings: [],
        brands: ["AudioCo"], // AudioCo only makes Headphones, not Laptops
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(0);
    });

    it("combines category and price range correctly", () => {
      const filter: FilterState = {
        categories: ["Headphones"],
        priceRange: { min: 200, max: 400 },
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // prod_002 (Headphones, 299.99) matches; prod_006 (Headphones, 599.99) does not
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("prod_002");
    });
  });
});

describe("Filter Engine - clearAll", () => {
  it("returns empty FilterState with all groups reset", () => {
    const result = clearAll();
    expect(result).toEqual({
      categories: [],
      priceRange: null,
      ratings: [],
      brands: [],
    });
  });

  it("clearAll result means no filtering when applied", () => {
    const cleared = clearAll();
    const result = applyFilters(mockProducts, cleared);
    expect(result).toHaveLength(mockProducts.length);
    expect(result).toEqual(mockProducts);
  });
});
