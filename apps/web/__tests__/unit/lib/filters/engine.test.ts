/**
 * Unit tests for the filter engine.
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
];

describe("Filter Engine", () => {
  describe("clearAll", () => {
    it("returns a FilterState with all groups empty", () => {
      const result = clearAll();
      expect(result).toEqual({
        categories: [],
        priceRange: null,
        ratings: [],
        brands: [],
      });
    });
  });

  describe("applyFilters", () => {
    it("returns all products when no filters are active", () => {
      const emptyFilter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, emptyFilter);
      expect(result).toHaveLength(mockProducts.length);
      expect(result).toEqual(mockProducts);
    });

    it("filters by single category (OR within group)", () => {
      const filter: FilterState = {
        categories: ["Laptops"],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.category === "Laptops")).toBe(true);
    });

    it("filters by multiple categories (OR within group)", () => {
      const filter: FilterState = {
        categories: ["Laptops", "Headphones"],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(3);
      expect(
        result.every(
          (p) => p.category === "Laptops" || p.category === "Headphones",
        ),
      ).toBe(true);
    });

    it("filters by price range", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: { min: 100, max: 300 },
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(3); // headphones 299.99, phone 199.99, watch 149.99
      expect(result.every((p) => p.price >= 100 && p.price <= 300)).toBe(true);
    });

    it("filters by ratings using floor(rating) equals selected value", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [4],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // Products with floor(rating) === 4: prod_001 (4.5→4), prod_002 (4.2→4), prod_004 (4.8→4)
      expect(result).toHaveLength(3);
      expect(result.every((p) => Math.floor(p.rating) === 4)).toBe(true);
    });

    it("filters by ratings with multiple selections (OR logic)", () => {
      // Selecting "3 stars" and "4 stars" means floor(rating) === 3 OR floor(rating) === 4
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [3, 4],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // floor(4.5)=4, floor(4.2)=4, floor(3.8)=3, floor(4.8)=4, floor(3.5)=3
      expect(result).toHaveLength(5);
      expect(
        result.every((p) => {
          const floor = Math.floor(p.rating);
          return floor === 3 || floor === 4;
        }),
      ).toBe(true);
    });

    it("excludes products whose floor(rating) does not match selected values", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [5],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // No products have floor(rating) === 5 (max is 4.8→4)
      expect(result).toHaveLength(0);
    });

    it("filters by brand (case-insensitive)", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [],
        brands: ["techbrand"], // lowercase
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("prod_001");
    });

    it("filters by multiple brands (OR within group)", () => {
      const filter: FilterState = {
        categories: [],
        priceRange: null,
        ratings: [],
        brands: ["TechBrand", "AudioCo"],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(2);
    });

    it("applies AND logic across filter groups", () => {
      const filter: FilterState = {
        categories: ["Laptops"],
        priceRange: { min: 1000, max: 2000 },
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      // Only Gaming Laptop (category=Laptops AND price=1499.99 in [1000,2000])
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("prod_001");
    });

    it("returns empty array when no products match all criteria", () => {
      const filter: FilterState = {
        categories: ["Monitors"],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters(mockProducts, filter);
      expect(result).toHaveLength(0);
    });

    it("handles empty product list", () => {
      const filter: FilterState = {
        categories: ["Laptops"],
        priceRange: null,
        ratings: [],
        brands: [],
      };
      const result = applyFilters([], filter);
      expect(result).toHaveLength(0);
    });
  });
});
