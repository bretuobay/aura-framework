/**
 * Property 21: Product Schema Validation
 *
 * For any product in the catalog: id SHALL be a non-empty unique string,
 * name SHALL be ≤100 characters, description SHALL be ≤500 characters,
 * price SHALL be in [0.01, 9999.99], rating SHALL be in [1.0, 5.0] in 0.1 increments,
 * reviews SHALL be in [0, 99999], tags SHALL have 2–10 entries, and discount SHALL be in [0, 70].
 *
 * **Validates: Requirements 13.2**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbProduct, arbProductCatalog, PRODUCT_CATEGORIES } from "./generators/product.arb";
import type { Product } from "@/lib/types";
import catalogData from "@/data/products.json";

const staticCatalog: Product[] = catalogData as Product[];

/**
 * Validates all schema constraints for a single product.
 */
function validateProductSchema(product: Product): string[] {
  const errors: string[] = [];

  // id: non-empty string
  if (typeof product.id !== "string" || product.id.length === 0) {
    errors.push(`id must be a non-empty string, got: "${product.id}"`);
  }

  // name: max 100 characters
  if (typeof product.name !== "string" || product.name.length > 100) {
    errors.push(`name must be ≤100 characters, got length: ${product.name?.length}`);
  }

  // description: max 500 characters
  if (typeof product.description !== "string" || product.description.length > 500) {
    errors.push(`description must be ≤500 characters, got length: ${product.description?.length}`);
  }

  // price: [0.01, 9999.99]
  if (typeof product.price !== "number" || product.price < 0.01 || product.price > 9999.99) {
    errors.push(`price must be in [0.01, 9999.99], got: ${product.price}`);
  }

  // category: one of 7 ProductCategory values
  if (!PRODUCT_CATEGORIES.includes(product.category)) {
    errors.push(`category must be one of ${PRODUCT_CATEGORIES.join(", ")}, got: "${product.category}"`);
  }

  // brand: max 50 characters
  if (typeof product.brand !== "string" || product.brand.length > 50) {
    errors.push(`brand must be ≤50 characters, got length: ${product.brand?.length}`);
  }

  // rating: [1.0, 5.0] in 0.1 increments
  if (typeof product.rating !== "number" || product.rating < 1.0 || product.rating > 5.0) {
    errors.push(`rating must be in [1.0, 5.0], got: ${product.rating}`);
  } else {
    const ratingTenths = Math.round(product.rating * 10);
    if (Math.abs(ratingTenths - product.rating * 10) > 0.001) {
      errors.push(`rating must be in 0.1 increments, got: ${product.rating}`);
    }
  }

  // reviews: [0, 99999]
  if (typeof product.reviews !== "number" || !Number.isInteger(product.reviews) || product.reviews < 0 || product.reviews > 99999) {
    errors.push(`reviews must be an integer in [0, 99999], got: ${product.reviews}`);
  }

  // imageUrl: valid URL string
  if (typeof product.imageUrl !== "string" || product.imageUrl.length === 0) {
    errors.push(`imageUrl must be a non-empty string, got: "${product.imageUrl}"`);
  }

  // specs: at least 3 key-value pairs
  if (typeof product.specs !== "object" || product.specs === null || Object.keys(product.specs).length < 3) {
    errors.push(`specs must have at least 3 key-value pairs, got: ${Object.keys(product.specs || {}).length}`);
  }

  // tags: 2–10 lowercase keyword strings
  if (!Array.isArray(product.tags) || product.tags.length < 2 || product.tags.length > 10) {
    errors.push(`tags must have 2–10 entries, got: ${product.tags?.length}`);
  }

  // discount: [0, 70]
  if (typeof product.discount !== "number" || product.discount < 0 || product.discount > 70) {
    errors.push(`discount must be in [0, 70], got: ${product.discount}`);
  }

  return errors;
}

describe("Property 21: Product Schema Validation", () => {
  it("generated products from arbProduct always satisfy schema constraints", () => {
    fc.assert(
      fc.property(arbProduct, (product) => {
        const errors = validateProductSchema(product);
        if (errors.length > 0) {
          return false;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("generated product catalogs have unique IDs", () => {
    fc.assert(
      fc.property(arbProductCatalog, (catalog) => {
        const ids = catalog.map((p) => p.id);
        const uniqueIds = new Set(ids);
        return uniqueIds.size === ids.length;
      }),
      { numRuns: 100 }
    );
  });

  describe("static catalog validation", () => {
    it("all products in static catalog satisfy schema constraints", () => {
      for (const product of staticCatalog) {
        const errors = validateProductSchema(product);
        expect(errors, `Product ${product.id} failed schema validation`).toEqual([]);
      }
    });

    it("static catalog has unique product IDs", () => {
      const ids = staticCatalog.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("static catalog has products in all 7 categories", () => {
      const categoriesPresent = new Set(staticCatalog.map((p) => p.category));
      for (const category of PRODUCT_CATEGORIES) {
        expect(categoriesPresent.has(category)).toBe(true);
      }
    });

    it("static catalog meets minimum category distribution requirements", () => {
      const categoryCounts: Record<string, number> = {};
      for (const product of staticCatalog) {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
      }

      expect(categoryCounts["Laptops"]).toBeGreaterThanOrEqual(20);
      expect(categoryCounts["Headphones"]).toBeGreaterThanOrEqual(15);
      expect(categoryCounts["Smartphones"]).toBeGreaterThanOrEqual(15);
      expect(categoryCounts["Accessories"]).toBeGreaterThanOrEqual(20);
      expect(categoryCounts["Wearables"]).toBeGreaterThanOrEqual(10);
      expect(categoryCounts["Tablets"]).toBeGreaterThanOrEqual(10);
      expect(categoryCounts["Monitors"]).toBeGreaterThanOrEqual(10);
    });

    it("static catalog has at least 100 products total", () => {
      expect(staticCatalog.length).toBeGreaterThanOrEqual(100);
    });
  });
});
