/**
 * Shared fast-check arbitrary generators for Prescription-related types.
 * Used by property-based tests validating Properties 4, 5, 7, 13–18.
 */
import fc from "fast-check";
import type { UIPrescription, Adaptation } from "@aura/protocol";

// ─── Product Card Variants ──────────────────────────────────────────────────────

/** The 4 valid product card variants */
export const VALID_VARIANTS = ["standard", "compact", "comparison", "image-lead"] as const;
export type ProductCardVariant = (typeof VALID_VARIANTS)[number];

/** Generates a valid product card variant */
export const arbValidVariant: fc.Arbitrary<ProductCardVariant> = fc.constantFrom(...VALID_VARIANTS);

/**
 * Generates an arbitrary string that may or may not be a valid variant.
 * Useful for testing fallback behavior (Property 4).
 */
export const arbVariant: fc.Arbitrary<string> = fc.oneof(
  { weight: 4, arbitrary: fc.constantFrom(...VALID_VARIANTS) },
  { weight: 1, arbitrary: fc.string({ minLength: 1, maxLength: 30 }) },
);

/**
 * Generates only invalid variant strings (not in VALID_VARIANTS).
 * Useful for specifically testing unrecognized variant fallback.
 */
export const arbInvalidVariant: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => !(VALID_VARIANTS as readonly string[]).includes(s));

// ─── Badge Labels ───────────────────────────────────────────────────────────────

/**
 * Generates a badge label string of 1–24 characters (valid).
 * Validates Property 5: badge text ≤ 24 characters.
 */
export const arbBadgeLabel: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 24 });

/**
 * Generates badge labels of any length (0–100 chars) for edge case testing.
 * Includes strings that exceed the 24-char limit.
 */
export const arbBadgeLabelAnyLength: fc.Arbitrary<string> = fc.string({ minLength: 0, maxLength: 100 });

// ─── Ranking Prescriptions ──────────────────────────────────────────────────────

/**
 * Generates a ranking prescription: an ordered array of product IDs.
 * Takes an available pool of IDs and produces a subset in a specific order.
 * Validates Property 13: ranking preserves non-referenced order.
 */
export const arbRankingPrescription = (
  availableIds: string[],
): fc.Arbitrary<string[]> => {
  if (availableIds.length === 0) {
    return fc.constant([]);
  }
  return fc
    .subarray(availableIds, { minLength: 1, maxLength: Math.min(availableIds.length, 20) })
    .chain((subset) => fc.shuffledSubarray(subset, { minLength: subset.length, maxLength: subset.length }));
};

/**
 * Generates a standalone ranking prescription (ordered IDs) without needing an existing catalog.
 * Generates 1–20 unique product IDs in a specific order.
 */
export const arbRankingPrescriptionStandalone: fc.Arbitrary<string[]> = fc
  .integer({ min: 1, max: 20 })
  .chain((size) =>
    fc.array(
      fc.string({ minLength: 3, maxLength: 10 }).map((s) => `prod_${s}`),
      { minLength: size, maxLength: size },
    ),
  )
  .map((ids) => [...new Set(ids)]) // ensure uniqueness
  .filter((ids) => ids.length >= 1);

// ─── Full UIPrescription ────────────────────────────────────────────────────────

/** Generates a valid ISO 8601 timestamp */
const arbISOTimestamp: fc.Arbitrary<string> = fc
  .date({ min: new Date("2024-01-01"), max: new Date("2030-12-31") })
  .map((d) => d.toISOString());

/** Generates a future ISO 8601 timestamp (for expiresAt) */
const arbFutureTimestamp: fc.Arbitrary<string> = fc
  .date({ min: new Date("2030-01-01"), max: new Date("2040-12-31") })
  .map((d) => d.toISOString());

/** Generates a non-empty string suitable for IDs */
const arbNonEmptyId: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 });

/** Valid prescription modes */
const arbPrescriptionMode = fc.constantFrom(
  "recommend" as const,
  "autoApply" as const,
  "askUser" as const,
  "observeOnly" as const,
);

/** Valid latency classes */
const arbLatencyClass = fc.constantFrom(
  "immediate" as const,
  "fast" as const,
  "deliberate" as const,
);

/** Generates a rank adaptation */
const arbRankAdaptation: fc.Arbitrary<Adaptation> = fc
  .array(arbNonEmptyId, { minLength: 1, maxLength: 10 })
  .map((orderedIds) => ({
    type: "rank" as const,
    orderedIds: orderedIds as [string, ...string[]],
    reasonCode: "test-reason",
  }));

/** Generates a componentVariant adaptation */
const arbComponentVariantAdaptation: fc.Arbitrary<Adaptation> = fc
  .tuple(arbNonEmptyId, arbNonEmptyId, arbValidVariant)
  .map(([slotId, componentId, variant]) => ({
    type: "componentVariant" as const,
    slotId,
    componentId,
    variant,
    reasonCode: "test-reason",
  }));

/** Generates a valid Adaptation (rank or componentVariant) */
const arbAdaptation: fc.Arbitrary<Adaptation> = fc.oneof(
  arbRankAdaptation,
  arbComponentVariantAdaptation,
);

/**
 * Generates a valid UIPrescription conforming to @aura/protocol schema.
 * Useful for testing prescription application logic.
 */
export const arbPrescription: fc.Arbitrary<UIPrescription> = fc
  .record({
    id: arbNonEmptyId,
    surfaceId: fc.constantFrom("search.results", "filter.panel"),
    mode: arbPrescriptionMode,
    latencyClass: arbLatencyClass,
    contextLock: fc.record({
      sequenceId: fc.nat({ max: 1000 }),
      capturedAt: arbISOTimestamp,
    }),
    adaptations: fc
      .array(arbAdaptation, { minLength: 1, maxLength: 5 })
      .map((arr) => arr as [Adaptation, ...Adaptation[]]),
    constraints: fc.record({
      expiresAt: arbFutureTimestamp,
    }),
    manifestVersion: fc.constant("1.0.0"),
    audit: fc.record({
      dataClassesUsed: fc.constant(undefined),
      policyVersion: fc.constant(undefined),
      decisionSource: fc.constantFrom("rules", "slm", "llm", undefined),
    }),
    explanation: fc.option(
      fc.record({
        confidence: fc.double({ min: 0, max: 1, noNaN: true }),
        summary: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      }),
      { nil: undefined },
    ),
    adaptationGroups: fc.constant(undefined),
  })
  .map((rec) => {
    const result: UIPrescription = {
      id: rec.id,
      surfaceId: rec.surfaceId,
      mode: rec.mode,
      latencyClass: rec.latencyClass,
      contextLock: rec.contextLock,
      adaptations: rec.adaptations,
      constraints: rec.constraints,
      manifestVersion: rec.manifestVersion,
      audit: {},
    };
    if (rec.audit.decisionSource) {
      result.audit.decisionSource = rec.audit.decisionSource;
    }
    if (rec.explanation) {
      result.explanation = rec.explanation;
    }
    return result;
  });

/**
 * Generates a prescription with a specific surfaceId.
 */
export const arbPrescriptionForSurface = (
  surfaceId: string,
): fc.Arbitrary<UIPrescription> =>
  arbPrescription.map((p) => ({ ...p, surfaceId }));

/**
 * Generates a prescription with a sequence ID for ordering tests (Property 15).
 */
export const arbPrescriptionWithSequence = (
  sequenceId: number,
): fc.Arbitrary<UIPrescription> =>
  arbPrescription.map((p) => ({
    ...p,
    contextLock: { ...p.contextLock, sequenceId },
  }));
