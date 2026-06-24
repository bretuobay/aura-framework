/**
 * Property 2: Sort Ordering Correctness
 *
 * For any list of products and any selected sort option (price-low-to-high,
 * price-high-to-low, rating), the resulting list SHALL be ordered according
 * to the specified comparator — i.e., for price-low-to-high, each product's
 * price SHALL be less than or equal to the next product's price.
 *
 * **Validates: Requirements 1.4**
 */
import { describe, it } from "vitest";
import fc from "fast-check";
import { arbProductCatalog } from "./generators/product.arb";
import { createSearchEngine } from "@/lib/search/index";

/** Sort options that impose a deterministic ordering (excludes "relevance") */
const sortOptionsWithOrder = ["price-low-to-high", "price-high-to-low", "rating"] as const;

/** Arbitrary for the three sort options that define a strict ordering */
const arbSortOption = fc.constantFrom(...sortOptionsWithOrder);

describe("Property 2: Sort Ordering Correctness", () => {
  it("for price-low-to-high, each product's price ≤ next product's price", () => {
    fc.assert(
      fc.property(arbProductCatalog, (catalog) => {
        const engine = createSearchEngine(catalog);
        // Use empty query to get all products, sorted by price ascending
        const results = engine.search("", { sort: "price-low-to-high" });

        for (let i = 0; i < results.products.length - 1; i++) {
          if (results.products[i].price > results.products[i + 1].price) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("for price-high-to-low, each product's price ≥ next product's price", () => {
    fc.assert(
      fc.property(arbProductCatalog, (catalog) => {
        const engine = createSearchEngine(catalog);
        // Use empty query to get all products, sorted by price descending
        const results = engine.search("", { sort: "price-high-to-low" });

        for (let i = 0; i < results.products.length - 1; i++) {
          if (results.products[i].price < results.products[i + 1].price) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("for rating sort, each product's rating ≥ next product's rating (descending)", () => {
    fc.assert(
      fc.property(arbProductCatalog, (catalog) => {
        const engine = createSearchEngine(catalog);
        // Use empty query to get all products, sorted by rating descending
        const results = engine.search("", { sort: "rating" });

        for (let i = 0; i < results.products.length - 1; i++) {
          if (results.products[i].rating < results.products[i + 1].rating) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("sort ordering holds across all pages for any sort option", () => {
    fc.assert(
      fc.property(arbProductCatalog, arbSortOption, (catalog, sortOption) => {
        const engine = createSearchEngine(catalog);

        // Collect all products across pages
        const allProducts: { price: number; rating: number }[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const results = engine.search("", { sort: sortOption, page });
          allProducts.push(
            ...results.products.map((p) => ({ price: p.price, rating: p.rating })),
          );
          hasMore = results.hasMore;
          page++;
        }

        // Verify ordering across the full result set
        for (let i = 0; i < allProducts.length - 1; i++) {
          switch (sortOption) {
            case "price-low-to-high":
              if (allProducts[i].price > allProducts[i + 1].price) return false;
              break;
            case "price-high-to-low":
              if (allProducts[i].price < allProducts[i + 1].price) return false;
              break;
            case "rating":
              if (allProducts[i].rating < allProducts[i + 1].rating) return false;
              break;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
