/**
 * Shared fast-check arbitrary generators for Explanation types.
 * Used by property-based tests validating Property 19.
 */
import fc from "fast-check";
import type { Explanation, ContributingFactor, FactorCategory, RiskClass } from "@/lib/types";

/** All valid factor categories */
export const FACTOR_CATEGORIES: FactorCategory[] = [
  "user behavior",
  "device context",
  "stated preference",
  "browsing history",
  "search intent",
  "accessibility needs",
];

/** All valid risk classes */
export const RISK_CLASSES: RiskClass[] = ["low", "medium", "high"];

/** Generates a valid risk class */
export const arbRiskClass: fc.Arbitrary<RiskClass> = fc.constantFrom(...RISK_CLASSES);

/** Generates a valid factor category */
export const arbFactorCategory: fc.Arbitrary<FactorCategory> = fc.constantFrom(
  ...FACTOR_CATEGORIES,
);

/** Generates a contributing factor with a category and description */
export const arbContributingFactor: fc.Arbitrary<ContributingFactor> = fc.record({
  category: arbFactorCategory,
  description: fc.string({ minLength: 5, maxLength: 80 }),
});

/**
 * Generates a sentence with at most 30 words.
 * Words are 1–12 characters of alphabetic text.
 */
export const arbSentence: fc.Arbitrary<string> = fc
  .array(fc.string({ minLength: 1, maxLength: 12 }), { minLength: 1, maxLength: 30 })
  .map((words) => words.join(" "));

/**
 * Generates a valid Explanation object conforming to all constraints:
 * - text: ≤200 characters total
 * - sentences: each ≤30 words
 * - confidence: 0–100
 * - factors: at least 1 contributing factor with category label
 *
 * Validates Property 19.
 */
export const arbExplanation: fc.Arbitrary<Explanation> = fc
  .record({
    sentences: fc.array(arbSentence, { minLength: 1, maxLength: 4 }),
    confidence: fc.integer({ min: 0, max: 100 }),
    factors: fc.array(arbContributingFactor, { minLength: 1, maxLength: 5 }),
  })
  .map((rec) => {
    // Build text from sentences, ensuring ≤200 chars
    let text = rec.sentences.join(". ");
    if (text.length > 200) {
      text = text.slice(0, 200);
    }
    // Also ensure individual sentences fit within the text
    const sentences = rec.sentences.filter((s) => s.length <= 200);
    return {
      text,
      sentences: sentences.length > 0 ? sentences : [rec.sentences[0]!.slice(0, 50)],
      confidence: rec.confidence,
      factors: rec.factors,
    };
  });

/**
 * Generates an explanation with text that may exceed 200 characters (edge case testing).
 * Useful for testing validation logic.
 */
export const arbExplanationAnyLength: fc.Arbitrary<Explanation> = fc.record({
  text: fc.string({ minLength: 0, maxLength: 500 }),
  sentences: fc.array(
    fc.array(fc.string({ minLength: 1, maxLength: 12 }), { minLength: 1, maxLength: 50 }).map(
      (words) => words.join(" "),
    ),
    { minLength: 1, maxLength: 8 },
  ),
  confidence: fc.integer({ min: -10, max: 110 }),
  factors: fc.array(arbContributingFactor, { minLength: 0, maxLength: 8 }),
});

/**
 * Generates a confidence score in the valid range [0, 100].
 */
export const arbConfidence: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100 });

/**
 * Generates a confidence score that may be outside valid range (edge case testing).
 */
export const arbConfidenceAnyRange: fc.Arbitrary<number> = fc.integer({ min: -100, max: 200 });
