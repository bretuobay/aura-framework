/**
 * Custom fast-check generators for valid UIPrescription values.
 * Produces values conforming to @aura/protocol UIPrescriptionSchema with
 * configurable expiry, contextLock, adaptations, and constraints.
 *
 * Validates: Requirements 12.4, 12.5
 */
import fc from "fast-check";
import type { UIPrescription, Adaptation, AdaptationGroup } from "@aura/protocol";

// =============================================================================
// Shared helpers
// =============================================================================

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 30 });

const arbISOTimestamp: fc.Arbitrary<string> = fc
  .date({
    min: new Date("2020-01-01T00:00:00.000Z"),
    max: new Date("2030-12-31T23:59:59.999Z"),
  })
  .map((d) => d.toISOString());

/** Future timestamp — ensures prescriptions are not expired */
const arbFutureISOTimestamp: fc.Arbitrary<string> = fc
  .integer({ min: 3600_000, max: 86_400_000 }) // 1 hour to 1 day in the future
  .map((offset) => new Date(Date.now() + offset).toISOString());

// =============================================================================
// Enums (matching @aura/protocol)
// =============================================================================

const PRESCRIPTION_MODES = ["recommend", "autoApply", "askUser", "observeOnly"] as const;

const LATENCY_CLASSES = ["immediate", "fast", "deliberate"] as const;

const LAYOUT_TYPES = ["compact", "expanded", "step-by-step", "accessible"] as const;

const ACCESSIBILITY_SETTINGS = ["fontScale", "contrast", "motion", "inputMode"] as const;

const DATA_CLASSES = [
  "behavior",
  "personalization",
  "accessibility",
  "approximateLocation",
  "health",
  "education",
  "demographics",
  "emotion",
  "sensitiveInference",
  "cloudModelUse",
  "aggregation",
  "retention",
] as const;

// =============================================================================
// ContextLock
// =============================================================================

export const arbContextLock = fc
  .tuple(
    fc.integer({ min: 0, max: 10_000 }), // sequenceId: non-negative integer
    arbISOTimestamp, // capturedAt: valid ISO timestamp
  )
  .map(([sequenceId, capturedAt]) => ({ sequenceId, capturedAt }));

// =============================================================================
// Adaptation generators (discriminated union by `type` field)
// =============================================================================

const arbRankAdaptation: fc.Arbitrary<Adaptation> = fc
  .tuple(fc.array(arbNonEmptyString, { minLength: 1, maxLength: 5 }), arbNonEmptyString)
  .map(([orderedIds, reasonCode]) => ({
    type: "rank" as const,
    orderedIds: orderedIds as [string, ...string[]],
    reasonCode,
  }));

const arbComponentVariantAdaptation: fc.Arbitrary<Adaptation> = fc
  .tuple(arbNonEmptyString, arbNonEmptyString, arbNonEmptyString, arbNonEmptyString)
  .map(([slotId, componentId, variant, reasonCode]) => ({
    type: "componentVariant" as const,
    slotId,
    componentId,
    variant,
    reasonCode,
  }));

const arbLayoutAdaptation: fc.Arbitrary<Adaptation> = fc
  .tuple(fc.constantFrom(...LAYOUT_TYPES), arbNonEmptyString)
  .map(([layout, reasonCode]) => ({
    type: "layout" as const,
    layout,
    reasonCode,
  }));

const arbContentAdaptation: fc.Arbitrary<Adaptation> = fc
  .tuple(arbNonEmptyString, arbNonEmptyString, arbNonEmptyString, arbNonEmptyString)
  .map(([target, contentKey, content, reasonCode]) => ({
    type: "content" as const,
    target,
    contentKey,
    content,
    reasonCode,
  }));

const arbAccessibilityAdaptation: fc.Arbitrary<Adaptation> = fc
  .tuple(
    fc.constantFrom(...ACCESSIBILITY_SETTINGS),
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.integer({ min: 1, max: 200 }),
      fc.boolean(),
    ),
    arbNonEmptyString,
  )
  .map(([setting, value, reasonCode]) => ({
    type: "accessibility" as const,
    setting,
    value,
    reasonCode,
  }));

const arbFilterAdaptation: fc.Arbitrary<Adaptation> = fc
  .tuple(
    arbNonEmptyString,
    fc.array(arbNonEmptyString, { minLength: 1, maxLength: 5 }),
    arbNonEmptyString,
  )
  .map(([target, visibleFilters, reasonCode]) => ({
    type: "filter" as const,
    target,
    visibleFilters: visibleFilters as [string, ...string[]],
    reasonCode,
  }));

/** Generates any valid Adaptation (uniformly distributed across types) */
export const arbAdaptation: fc.Arbitrary<Adaptation> = fc.oneof(
  arbRankAdaptation,
  arbComponentVariantAdaptation,
  arbLayoutAdaptation,
  arbContentAdaptation,
  arbAccessibilityAdaptation,
  arbFilterAdaptation,
);

// =============================================================================
// AdaptationGroup
// =============================================================================

export const arbAdaptationGroup: fc.Arbitrary<AdaptationGroup> = fc
  .tuple(
    arbNonEmptyString,
    fc.array(arbNonEmptyString, { minLength: 1, maxLength: 4 }),
    fc.boolean(),
  )
  .map(([groupId, adaptationIds, atomic]) => ({
    groupId,
    adaptationIds: adaptationIds as [string, ...string[]],
    atomic,
  }));

// =============================================================================
// Constraints
// =============================================================================

/** Generates constraints with a future expiresAt so prescriptions aren't expired */
export const arbConstraints = arbFutureISOTimestamp.map((expiresAt) => ({
  expiresAt,
}));

// =============================================================================
// Audit
// =============================================================================

export const arbAudit = fc
  .tuple(
    fc.option(fc.array(fc.constantFrom(...DATA_CLASSES), { minLength: 1, maxLength: 3 }), {
      nil: undefined,
    }),
    fc.option(arbNonEmptyString, { nil: undefined }),
    fc.option(arbNonEmptyString, { nil: undefined }),
  )
  .map(([dataClassesUsed, policyVersion, decisionSource]) => {
    const audit: Record<string, unknown> = {};
    if (dataClassesUsed !== undefined) audit.dataClassesUsed = dataClassesUsed;
    if (policyVersion !== undefined) audit.policyVersion = policyVersion;
    if (decisionSource !== undefined) audit.decisionSource = decisionSource;
    return audit as UIPrescription["audit"];
  });

// =============================================================================
// Explanation (optional)
// =============================================================================

export const arbExplanation = fc
  .tuple(
    fc.double({ min: 0, max: 1, noNaN: true }), // confidence: 0-1
    fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  )
  .map(([confidence, summary]) => {
    const explanation: { confidence: number; summary?: string } = { confidence };
    if (summary !== undefined) explanation.summary = summary;
    return explanation;
  });

// =============================================================================
// UIPrescription — main generator
// =============================================================================

export interface PrescriptionArbOptions {
  /** Pin the surfaceId to this value */
  surfaceId?: string;
  /** Use a past expiresAt to generate expired prescriptions */
  expired?: boolean;
}

/**
 * Generates a valid UIPrescription with:
 * - non-empty id and surfaceId
 * - valid mode and latencyClass
 * - contextLock with non-negative sequenceId and ISO timestamp
 * - at least 1 adaptation (nonempty array)
 * - future expiresAt in constraints (unless `expired: true`)
 * - non-empty manifestVersion
 * - valid audit, optional explanation, optional adaptationGroups
 */
export const arbUIPrescription = (
  options: PrescriptionArbOptions = {},
): fc.Arbitrary<UIPrescription> => {
  const { surfaceId, expired = false } = options;

  const expiresAtArb = expired
    ? fc
        .integer({ min: 1000, max: 86_400_000 })
        .map((offset) => new Date(Date.now() - offset).toISOString())
    : arbFutureISOTimestamp;

  return fc
    .tuple(
      arbNonEmptyString, // id
      surfaceId !== undefined ? fc.constant(surfaceId) : arbNonEmptyString, // surfaceId
      fc.constantFrom(...PRESCRIPTION_MODES), // mode
      fc.constantFrom(...LATENCY_CLASSES), // latencyClass
      arbContextLock, // contextLock
      fc.array(arbAdaptation, { minLength: 1, maxLength: 4 }), // adaptations (nonempty)
      expiresAtArb, // constraints.expiresAt
      arbNonEmptyString, // manifestVersion
      arbAudit, // audit
      fc.option(arbExplanation, { nil: undefined }), // explanation (optional)
      fc.option(fc.array(arbAdaptationGroup, { minLength: 1, maxLength: 3 }), {
        nil: undefined,
      }), // adaptationGroups (optional)
    )
    .map(
      ([
        id,
        prescSurfaceId,
        mode,
        latencyClass,
        contextLock,
        adaptations,
        expiresAt,
        manifestVersion,
        audit,
        explanation,
        adaptationGroups,
      ]) => {
        const prescription: UIPrescription = {
          id,
          surfaceId: prescSurfaceId,
          mode,
          latencyClass,
          contextLock,
          adaptations: adaptations as [Adaptation, ...Adaptation[]],
          constraints: { expiresAt },
          manifestVersion,
          audit,
        };

        if (explanation !== undefined) {
          prescription.explanation = explanation;
        }

        if (adaptationGroups !== undefined) {
          prescription.adaptationGroups = adaptationGroups;
        }

        return prescription;
      },
    );
};

/** Default valid prescription (non-expired, random surfaceId) */
export const arbValidUIPrescription: fc.Arbitrary<UIPrescription> = arbUIPrescription();

/** Expired prescription (expiresAt in the past) */
export const arbExpiredUIPrescription: fc.Arbitrary<UIPrescription> = arbUIPrescription({
  expired: true,
});

/** Prescription pinned to a specific surfaceId */
export const arbPrescriptionForSurface = (surfaceId: string): fc.Arbitrary<UIPrescription> =>
  arbUIPrescription({ surfaceId });
