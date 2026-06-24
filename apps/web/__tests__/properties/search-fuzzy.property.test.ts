/**
 * Property 22: Search Fuzzy Matching
 *
 * For any product name in the catalog and any query string within edit distance 1
 * of that name (or a case-insensitive partial match), the search function SHALL
 * include that product in the results.
 *
 * **Validates: Requirements 13.3**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ProductSearchEngine } from "@/lib/search";
import type { Product } from "@/lib/types";
import { arbProduct } from "./generators/product.arb";

/** Generates a single lowercase letter a-z */
const arbLetter: fc.Arbitrary<string> = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyz".split("")
);

/**
 * Generates a string within edit distance 1 of the target by applying
 * one of three mutations: substitution, deletion, or insertion.
 * Ensures the resulting query is at least 3 characters long (MiniSearch
 * only applies fuzzy matching for terms > 2 characters).
 */
function arbEditDistance1(target: string): fc.Arbitrary<string> {
  return fc
    .record({
      mutationType: fc.constantFrom("substitute", "delete", "insert"),
      position: fc.nat({ max: Math.max(0, target.length - 1) }),
      char: arbLetter,
    })
    .map(({ mutationType, position, char }) => {
      const pos = Math.min(position, target.length - 1);
      switch (mutationType) {
        case "substitute": {
          // Replace a character at `pos` with a different character
          const chars = target.split("");
          if (chars[pos]?.toLowerCase() === char) {
            // Ensure we actually substitute a different character
            chars[pos] = char === "a" ? "b" : "a";
          } else {
            chars[pos] = char;
          }
          return chars.join("");
        }
        case "delete": {
          // Delete a character at `pos`
          return target.slice(0, pos) + target.slice(pos + 1);
        }
        case "insert": {
          // Insert a character at `pos`
          return target.slice(0, pos) + char + target.slice(pos);
        }
      }
    })
    .filter((q) => q.length >= 3); // MiniSearch requires > 2 chars for fuzzy
}

/**
 * Creates a small test catalog with the given product and a few filler products,
 * ensuring distinct IDs.
 */
function buildTestCatalog(targetProduct: Product): Product[] {
  const fillerProducts: Product[] = [
    {
      id: "filler_001",
      name: "Quantum Widget",
      description: "A basic widget for quantum computing",
      price: 29.99,
      category: "Accessories",
      brand: "WidgetCo",
      rating: 4.0,
      reviews: 100,
      imageUrl: "https://images.example.com/widget.jpg",
      specs: { material: "carbon", weight: "50g", warranty: "1 year" },
      tags: ["widget", "quantum"],
      discount: 0,
    },
    {
      id: "filler_002",
      name: "Nebula Headphone",
      description: "Premium noise cancelling headphone",
      price: 199.99,
      category: "Headphones",
      brand: "SoundMax",
      rating: 4.5,
      reviews: 500,
      imageUrl: "https://images.example.com/headphone.jpg",
      specs: { driver: "40mm", impedance: "32ohm", frequency: "20Hz-20kHz" },
      tags: ["headphone", "noise-cancelling"],
      discount: 10,
    },
    {
      id: "filler_003",
      name: "Stellar Laptop Pro",
      description: "High performance laptop for professionals",
      price: 1499.99,
      category: "Laptops",
      brand: "TechBrand",
      rating: 4.8,
      reviews: 2000,
      imageUrl: "https://images.example.com/laptop.jpg",
      specs: { cpu: "i9", ram: "32GB", storage: "1TB SSD" },
      tags: ["laptop", "professional"],
      discount: 5,
    },
  ];

  // Ensure target product has a unique ID from fillers
  const product = { ...targetProduct, id: "target_product" };
  return [product, ...fillerProducts];
}

describe("Property 22: Search Fuzzy Matching", () => {
  it("products are found when searching with a query within edit distance 1 of their name", () => {
    // Use a set of known product names that are long enough for fuzzy matching
    const knownNames = [
      "Wireless Headphones",
      "Laptop Stand",
      "Bluetooth Speaker",
      "Gaming Mouse",
      "Mechanical Keyboard",
      "Ultra Monitor",
      "Smart Watch",
      "Tablet Cover",
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...knownNames).chain((name) =>
          arbEditDistance1(name).map((query) => ({ name, query }))
        ),
        ({ name, query }) => {
          // Build a product with the known name
          const product: Product = {
            id: "target_product",
            name,
            description: "A test product for fuzzy matching",
            price: 49.99,
            category: "Accessories",
            brand: "TestBrand",
            rating: 4.0,
            reviews: 50,
            imageUrl: "https://images.example.com/test.jpg",
            specs: { weight: "200g", color: "black", warranty: "2 years" },
            tags: ["test", "fuzzy"],
            discount: 0,
          };

          const catalog = buildTestCatalog(product);
          const engine = new ProductSearchEngine(catalog);

          const results = engine.search(query);

          // The product with the target name should appear in search results
          const found = results.products.some((p) => p.id === "target_product");
          expect(found).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("products are found when searching with case-insensitive partial match of their name", () => {
    const knownNames = [
      "Wireless Headphones",
      "Laptop Stand",
      "Bluetooth Speaker",
      "Gaming Mouse",
      "Mechanical Keyboard",
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...knownNames).chain((name) => {
          // Extract a substring of at least 3 characters and randomize case
          const words = name.split(" ");
          return fc.constantFrom(...words).chain((word) =>
            fc.boolean().map((toUpper) => ({
              name,
              query: toUpper ? word.toUpperCase() : word.toLowerCase(),
            }))
          );
        }),
        ({ name, query }) => {
          // Only test queries > 2 chars
          if (query.length <= 2) return true;

          const product: Product = {
            id: "target_product",
            name,
            description: "A test product for case-insensitive matching",
            price: 49.99,
            category: "Accessories",
            brand: "TestBrand",
            rating: 4.0,
            reviews: 50,
            imageUrl: "https://images.example.com/test.jpg",
            specs: { weight: "200g", color: "black", warranty: "2 years" },
            tags: ["test", "matching"],
            discount: 0,
          };

          const catalog = buildTestCatalog(product);
          const engine = new ProductSearchEngine(catalog);

          const results = engine.search(query);

          const found = results.products.some((p) => p.id === "target_product");
          expect(found).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("products are found with single-word fuzzy queries from generated products", () => {
    fc.assert(
      fc.property(
        arbProduct
          .filter((p) => {
            // Ensure product name has a word with at least 4 characters
            // (needed for meaningful fuzzy matching: > 2 chars after mutation)
            const words = p.name.split(/[\s\-_/,.;:!?()[\]{}'"]+/).filter((w) => w.length >= 4);
            return words.length > 0;
          })
          .chain((product) => {
            const words = product.name
              .split(/[\s\-_/,.;:!?()[\]{}'"]+/)
              .filter((w) => w.length >= 4);
            return fc.constantFrom(...words).chain((word) =>
              arbEditDistance1(word).map((query) => ({ product, query }))
            );
          }),
        ({ product, query }) => {
          const catalog = buildTestCatalog(product);
          const engine = new ProductSearchEngine(catalog);

          const results = engine.search(query);

          const found = results.products.some((p) => p.id === "target_product");
          expect(found).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
