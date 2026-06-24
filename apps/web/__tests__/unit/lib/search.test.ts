import { describe, it, expect, beforeAll } from "vitest";
import {
  ProductSearchEngine,
  createSearchEngine,
  MAX_QUERY_LENGTH,
  MAX_EVENT_QUERY_LENGTH,
  PAGE_SIZE,
} from "@/lib/search/index";
import type { Product } from "@/lib/types";

// Minimal test products
const testProducts: Product[] = [
  {
    id: "prod_001",
    name: "Dell XPS 13 Ultrabook",
    description: "Ultra-thin and lightweight laptop for travelers.",
    price: 1299.99,
    category: "Laptops",
    brand: "Dell",
    rating: 4.6,
    reviews: 3421,
    imageUrl: "https://placehold.co/400x400",
    specs: { Processor: "Intel i7", RAM: "16GB", Storage: "512GB" },
    tags: ["ultraportable", "business", "travel"],
    discount: 10,
  },
  {
    id: "prod_002",
    name: "Apple MacBook Air M3",
    description: "Supercharged by M3 chip for exceptional performance.",
    price: 1199.99,
    category: "Laptops",
    brand: "Apple",
    rating: 4.8,
    reviews: 8754,
    imageUrl: "https://placehold.co/400x400",
    specs: { Processor: "Apple M3", RAM: "8GB", Storage: "256GB" },
    tags: ["ultraportable", "creative", "silent"],
    discount: 0,
  },
  {
    id: "prod_003",
    name: "Sony WH-1000XM5",
    description: "Premium noise-cancelling wireless headphones.",
    price: 349.99,
    category: "Headphones",
    brand: "Sony",
    rating: 4.7,
    reviews: 12000,
    imageUrl: "https://placehold.co/400x400",
    specs: { Driver: "30mm", "Battery Life": "30 hours", ANC: "Yes" },
    tags: ["wireless", "noise-cancelling", "premium"],
    discount: 5,
  },
  {
    id: "prod_004",
    name: "Samsung Galaxy S24 Ultra",
    description: "Flagship smartphone with AI-powered features and titanium frame.",
    price: 1199.99,
    category: "Smartphones",
    brand: "Samsung",
    rating: 4.5,
    reviews: 5678,
    imageUrl: "https://placehold.co/400x400",
    specs: { Display: "6.8-inch", Processor: "Snapdragon 8 Gen 3", Camera: "200MP" },
    tags: ["flagship", "ai", "titanium", "premium"],
    discount: 0,
  },
];

describe("ProductSearchEngine", () => {
  let engine: ProductSearchEngine;

  beforeAll(() => {
    engine = createSearchEngine(testProducts);
  });

  describe("initialization", () => {
    it("should create an engine with the correct catalog size", () => {
      expect(engine.size).toBe(4);
    });
  });

  describe("search", () => {
    it("should return all products for empty query", () => {
      const results = engine.search("");
      expect(results.total).toBe(4);
      expect(results.products).toHaveLength(4);
    });

    it("should find products by name", () => {
      const results = engine.search("Dell");
      expect(results.products.length).toBeGreaterThanOrEqual(1);
      expect(results.products.some((p) => p.id === "prod_001")).toBe(true);
    });

    it("should find products by category", () => {
      const results = engine.search("Headphones");
      expect(results.products.some((p) => p.id === "prod_003")).toBe(true);
    });

    it("should find products by brand", () => {
      const results = engine.search("Apple");
      expect(results.products.some((p) => p.id === "prod_002")).toBe(true);
    });

    it("should find products by tags", () => {
      const results = engine.search("wireless");
      expect(results.products.some((p) => p.id === "prod_003")).toBe(true);
    });

    it("should be case-insensitive", () => {
      const results = engine.search("dell");
      expect(results.products.some((p) => p.id === "prod_001")).toBe(true);
    });

    it("should support fuzzy matching (edit distance 1)", () => {
      // "Somy" is within edit distance 1 of "Sony"
      const results = engine.search("Somy");
      expect(results.products.some((p) => p.id === "prod_003")).toBe(true);
    });

    it("should support prefix/partial matching", () => {
      const results = engine.search("ultra");
      expect(results.products.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("query truncation", () => {
    it("should truncate input to MAX_QUERY_LENGTH", () => {
      const longQuery = "a".repeat(300);
      expect(engine.truncateInput(longQuery).length).toBe(MAX_QUERY_LENGTH);
    });

    it("should not truncate short queries", () => {
      expect(engine.truncateInput("laptop").length).toBe(6);
    });

    it("should truncate for event emission to MAX_EVENT_QUERY_LENGTH", () => {
      const longQuery = "b".repeat(500);
      expect(engine.truncateForEvent(longQuery).length).toBe(MAX_EVENT_QUERY_LENGTH);
    });
  });

  describe("pagination", () => {
    it("should return at most PAGE_SIZE results per page", () => {
      // With 4 products, a single page should contain all
      const results = engine.search("");
      expect(results.products.length).toBeLessThanOrEqual(PAGE_SIZE);
    });

    it("should indicate hasMore when there are more results", () => {
      // Create a larger catalog to test pagination
      const manyProducts: Product[] = Array.from({ length: 30 }, (_, i) => ({
        id: `prod_${String(i).padStart(3, "0")}`,
        name: `Product ${i}`,
        description: `Description for product ${i}`,
        price: 10 + i,
        category: "Laptops" as const,
        brand: "TestBrand",
        rating: 4.0,
        reviews: 100,
        imageUrl: "https://placehold.co/400x400",
        specs: { A: "1", B: "2", C: "3" },
        tags: ["test", "product"],
        discount: 0,
      }));

      const bigEngine = createSearchEngine(manyProducts);
      const page1 = bigEngine.search("", { page: 1 });
      expect(page1.products.length).toBe(PAGE_SIZE);
      expect(page1.hasMore).toBe(true);
      expect(page1.total).toBe(30);

      const page2 = bigEngine.search("", { page: 2 });
      expect(page2.products.length).toBe(10);
      expect(page2.hasMore).toBe(false);
    });
  });

  describe("sorting", () => {
    it("should sort by price low-to-high", () => {
      const results = engine.search("", { sort: "price-low-to-high" });
      for (let i = 1; i < results.products.length; i++) {
        expect(results.products[i].price).toBeGreaterThanOrEqual(
          results.products[i - 1].price
        );
      }
    });

    it("should sort by price high-to-low", () => {
      const results = engine.search("", { sort: "price-high-to-low" });
      for (let i = 1; i < results.products.length; i++) {
        expect(results.products[i].price).toBeLessThanOrEqual(
          results.products[i - 1].price
        );
      }
    });

    it("should sort by rating (highest first)", () => {
      const results = engine.search("", { sort: "rating" });
      for (let i = 1; i < results.products.length; i++) {
        expect(results.products[i].rating).toBeLessThanOrEqual(
          results.products[i - 1].rating
        );
      }
    });

    it("should default to relevance sort", () => {
      const results = engine.search("laptop");
      // Relevance sort means we just check that results are returned
      expect(results.products.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("constants", () => {
    it("should have correct constants", () => {
      expect(MAX_QUERY_LENGTH).toBe(200);
      expect(MAX_EVENT_QUERY_LENGTH).toBe(256);
      expect(PAGE_SIZE).toBe(20);
    });
  });
});
