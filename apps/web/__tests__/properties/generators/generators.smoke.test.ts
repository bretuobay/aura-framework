/**
 * Smoke test for shared arbitrary generators.
 * Validates that all generators produce valid values.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  arbProduct,
  arbProductCatalog,
  PRODUCT_CATEGORIES,
} from "./product.arb";
import {
  arbPrescription,
  arbRankingPrescriptionStandalone,
  arbBadgeLabel,
  arbVariant,
  arbValidVariant,
  arbInvalidVariant,
  VALID_VARIANTS,
} from "./prescription.arb";
import { arbFilterState, arbActiveFilterState } from "./filter.arb";
import { arbEvent, arbSearchQuery, arbEventSequence } from "./event.arb";
import { arbExplanation, arbRiskClass, RISK_CLASSES } from "./explanation.arb";

describe("Shared Generators Smoke Tests", () => {
  it("arbProduct generates valid products", () => {
    fc.assert(
      fc.property(arbProduct, (product) => {
        expect(product.id).toBeTruthy();
        expect(product.name.length).toBeLessThanOrEqual(100);
        expect(product.description.length).toBeLessThanOrEqual(500);
        expect(product.price).toBeGreaterThanOrEqual(0.01);
        expect(product.price).toBeLessThanOrEqual(9999.99);
        expect(PRODUCT_CATEGORIES).toContain(product.category);
        expect(product.brand.length).toBeLessThanOrEqual(50);
        expect(product.rating).toBeGreaterThanOrEqual(1.0);
        expect(product.rating).toBeLessThanOrEqual(5.0);
        expect(product.reviews).toBeGreaterThanOrEqual(0);
        expect(product.reviews).toBeLessThanOrEqual(99999);
        expect(product.imageUrl).toMatch(/^https:\/\//);
        expect(Object.keys(product.specs).length).toBeGreaterThanOrEqual(3);
        expect(product.tags.length).toBeGreaterThanOrEqual(2);
        expect(product.tags.length).toBeLessThanOrEqual(10);
        expect(product.discount).toBeGreaterThanOrEqual(0);
        expect(product.discount).toBeLessThanOrEqual(70);
      }),
      { numRuns: 50 },
    );
  });

  it("arbProductCatalog generates catalogs with unique IDs", () => {
    fc.assert(
      fc.property(arbProductCatalog, (catalog) => {
        expect(catalog.length).toBeGreaterThanOrEqual(1);
        expect(catalog.length).toBeLessThanOrEqual(200);
        const ids = catalog.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 10 },
    );
  });

  it("arbBadgeLabel generates labels within 24 chars", () => {
    fc.assert(
      fc.property(arbBadgeLabel, (label) => {
        expect(label.length).toBeGreaterThanOrEqual(1);
        expect(label.length).toBeLessThanOrEqual(24);
      }),
      { numRuns: 100 },
    );
  });

  it("arbValidVariant only generates valid variants", () => {
    fc.assert(
      fc.property(arbValidVariant, (variant) => {
        expect(VALID_VARIANTS).toContain(variant);
      }),
      { numRuns: 50 },
    );
  });

  it("arbInvalidVariant never generates valid variants", () => {
    fc.assert(
      fc.property(arbInvalidVariant, (variant) => {
        expect(VALID_VARIANTS as readonly string[]).not.toContain(variant);
      }),
      { numRuns: 50 },
    );
  });

  it("arbFilterState generates valid filter states", () => {
    fc.assert(
      fc.property(arbFilterState, (state) => {
        expect(Array.isArray(state.categories)).toBe(true);
        expect(
          state.priceRange === null ||
            (state.priceRange.min <= state.priceRange.max),
        ).toBe(true);
        expect(Array.isArray(state.ratings)).toBe(true);
        expect(Array.isArray(state.brands)).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it("arbActiveFilterState always has at least one active filter", () => {
    fc.assert(
      fc.property(arbActiveFilterState, (state) => {
        const hasActive =
          state.categories.length > 0 ||
          state.priceRange !== null ||
          state.ratings.length > 0 ||
          state.brands.length > 0;
        expect(hasActive).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it("arbEvent generates events with required metadata", () => {
    fc.assert(
      fc.property(arbEvent, (event) => {
        expect(event.type.length).toBeGreaterThan(0);
        expect(event.surfaceId.length).toBeGreaterThan(0);
        expect(event.timestamp.length).toBeGreaterThan(0);
        // Validate ISO 8601
        expect(new Date(event.timestamp).toISOString()).toBeTruthy();
      }),
      { numRuns: 50 },
    );
  });

  it("arbSearchQuery generates queries within 200 chars", () => {
    fc.assert(
      fc.property(arbSearchQuery, (query) => {
        expect(query.length).toBeLessThanOrEqual(200);
      }),
      { numRuns: 100 },
    );
  });

  it("arbExplanation generates valid explanations", () => {
    fc.assert(
      fc.property(arbExplanation, (explanation) => {
        expect(explanation.text.length).toBeLessThanOrEqual(200);
        expect(explanation.confidence).toBeGreaterThanOrEqual(0);
        expect(explanation.confidence).toBeLessThanOrEqual(100);
        expect(explanation.factors.length).toBeGreaterThanOrEqual(1);
        for (const sentence of explanation.sentences) {
          const wordCount = sentence.split(/\s+/).length;
          expect(wordCount).toBeLessThanOrEqual(30);
        }
      }),
      { numRuns: 50 },
    );
  });

  it("arbRiskClass generates valid risk classes", () => {
    fc.assert(
      fc.property(arbRiskClass, (riskClass) => {
        expect(RISK_CLASSES).toContain(riskClass);
      }),
      { numRuns: 20 },
    );
  });

  it("arbPrescription generates valid UIPrescriptions", () => {
    fc.assert(
      fc.property(arbPrescription, (prescription) => {
        expect(prescription.id.length).toBeGreaterThan(0);
        expect(prescription.surfaceId.length).toBeGreaterThan(0);
        expect(prescription.adaptations.length).toBeGreaterThanOrEqual(1);
        expect(prescription.contextLock.sequenceId).toBeGreaterThanOrEqual(0);
        expect(new Date(prescription.contextLock.capturedAt).toISOString()).toBeTruthy();
        expect(new Date(prescription.constraints.expiresAt).toISOString()).toBeTruthy();
      }),
      { numRuns: 30 },
    );
  });

  it("arbRankingPrescriptionStandalone generates non-empty arrays of unique IDs", () => {
    fc.assert(
      fc.property(arbRankingPrescriptionStandalone, (ids) => {
        expect(ids.length).toBeGreaterThanOrEqual(1);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 30 },
    );
  });

  it("arbEventSequence generates between 1–150 events", () => {
    fc.assert(
      fc.property(arbEventSequence, (events) => {
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events.length).toBeLessThanOrEqual(150);
      }),
      { numRuns: 10 },
    );
  });
});
