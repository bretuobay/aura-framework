/**
 * Shared fast-check arbitrary generators for Product types.
 * Used by property-based tests validating Properties 1–6, 13, 21, 22.
 */
import fc from "fast-check";
import type { Product, ProductCategory } from "@/lib/types";

/** All valid product categories */
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Laptops",
  "Headphones",
  "Smartphones",
  "Accessories",
  "Wearables",
  "Tablets",
  "Monitors",
];

/** Generates a valid ProductCategory */
export const arbProductCategory: fc.Arbitrary<ProductCategory> = fc.constantFrom(
  ...PRODUCT_CATEGORIES,
);

/** Generates a non-empty product ID string */
export const arbProductId: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .map((s) => `prod_${s.replace(/[^a-zA-Z0-9]/g, "x")}`);

/** Generates a product name (1–100 chars) */
export const arbProductName: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 100 });

/** Generates a product description (1–500 chars) */
export const arbProductDescription: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 500 });

/** Generates a valid price in [0.01, 9999.99] rounded to 2 decimal places */
export const arbPrice: fc.Arbitrary<number> = fc
  .integer({ min: 1, max: 999999 })
  .map((n) => n / 100);

/** Generates a brand name (1–50 chars) */
export const arbBrand: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 50 });

/** Generates a rating in [1.0, 5.0] with 0.1 increments */
export const arbRating: fc.Arbitrary<number> = fc
  .integer({ min: 10, max: 50 })
  .map((n) => n / 10);

/** Generates a review count in [0, 99999] */
export const arbReviewCount: fc.Arbitrary<number> = fc.integer({ min: 0, max: 99999 });

/** Generates a valid image URL */
export const arbImageUrl: fc.Arbitrary<string> = fc
  .string({ minLength: 3, maxLength: 30 })
  .map((s) => `https://images.example.com/${s.replace(/[^a-zA-Z0-9]/g, "x")}.jpg`);

/** Generates a specs object with at least 3 key-value pairs */
export const arbSpecs: fc.Arbitrary<Record<string, string>> = fc
  .array(
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.string({ minLength: 1, maxLength: 50 }),
    ),
    { minLength: 5, maxLength: 10 },
  )
  .map((entries) => Object.fromEntries(entries))
  .filter((obj) => Object.keys(obj).length >= 3);

/** Generates a lowercase tag string */
export const arbTag: fc.Arbitrary<string> = fc
  .string({ minLength: 2, maxLength: 15 })
  .map((s) => s.toLowerCase().replace(/[^a-z]/g, "a"))
  .filter((s) => s.length >= 2);

/** Generates 2–10 lowercase keyword tags */
export const arbTags: fc.Arbitrary<string[]> = fc.array(arbTag, { minLength: 2, maxLength: 10 });

/** Generates a discount percentage in [0, 70] */
export const arbDiscount: fc.Arbitrary<number> = fc.integer({ min: 0, max: 70 });

/**
 * Generates a valid Product conforming to all schema constraints.
 * - id: unique non-empty string
 * - name: max 100 chars
 * - description: max 500 chars
 * - price: 0.01–9999.99
 * - category: one of 7 categories
 * - brand: max 50 chars
 * - rating: 1.0–5.0, 0.1 increments
 * - reviews: 0–99999
 * - imageUrl: valid URL
 * - specs: at least 3 key-value pairs
 * - tags: 2–10 lowercase keywords
 * - discount: 0–70
 */
export const arbProduct: fc.Arbitrary<Product> = fc
  .record({
    id: arbProductId,
    name: arbProductName,
    description: arbProductDescription,
    price: arbPrice,
    category: arbProductCategory,
    brand: arbBrand,
    rating: arbRating,
    reviews: arbReviewCount,
    imageUrl: arbImageUrl,
    specs: arbSpecs,
    tags: arbTags,
    discount: arbDiscount,
  });

/**
 * Generates a product catalog: an array of 1–200 products with unique IDs.
 * Uses a counter to ensure uniqueness across generated products.
 */
export const arbProductCatalog: fc.Arbitrary<Product[]> = fc
  .integer({ min: 1, max: 200 })
  .chain((size) =>
    fc.array(arbProduct, { minLength: size, maxLength: size }).map((products) =>
      products.map((p, i) => ({
        ...p,
        id: `prod_${String(i).padStart(4, "0")}`,
      })),
    ),
  );

/**
 * Generates a catalog with guaranteed category distribution.
 * Useful for tests requiring products in specific categories.
 */
export const arbProductCatalogWithCategories = (
  minPerCategory: number = 1,
): fc.Arbitrary<Product[]> =>
  fc
    .tuple(
      ...PRODUCT_CATEGORIES.map((category) =>
        fc
          .array(arbProduct, { minLength: minPerCategory, maxLength: minPerCategory + 5 })
          .map((products) => products.map((p) => ({ ...p, category }))),
      ),
    )
    .map((groups) => {
      const all = groups.flat();
      return all.map((p, i) => ({ ...p, id: `prod_${String(i).padStart(4, "0")}` }));
    });
