/**
 * Custom fast-check generators for valid/invalid UIPrescription values.
 * Produces values conforming to @aura/protocol UIPrescriptionSchema with
 * configurable expiry, contextLock, and manifestVersion.
 */
import fc from "fast-check";
import type {
  UIPrescription,
  ContextLock,
  Adaptation,
  AdaptationGroup,
  PrescriptionMode,
  LatencyClass,
  DataClass,
} from "@aura/protocol";
import { DATA_CLASSES, arbNonEmptyString } from "./manifest.arbitrary.js";
import {
  arbFutureISOTimestamp,
  arbPastISOTimestamp,
  arbISOTimestamp,
} from "./aura-event.arbitrary.js";

// =============================================================================
// Enums
// =============================================================================

const PRESCRIPTION_MODES: PrescriptionMode[] = ["recommend", "autoApply", "askUser", "observeOnly"];
const LATENCY_CLASSES: LatencyClass[] = ["immediate", "fast", "deliberate"];
const LAYOUT_TYPES = ["compact", "expanded", "step-by-step", "accessible"] as const;
const ACCESSIBILITY_SETTINGS = ["fontScale", "contrast", "motion", "inputMode"] as const;

// =============================================================================
// ContextLock
// =============================================================================

export const arbContextLock = (sequenceId?: number): fc.Arbitrary<ContextLock> =>
  fc
    .tuple(
      sequenceId !== undefined ? fc.constant(sequenceId) : fc.integer({ min: 0, max: 10000 }),
      arbISOTimestamp,
    )
    .map(([seqId, capturedAt]) => ({
      sequenceId: seqId,
      capturedAt,
    }));

// =============================================================================
// Adaptation generators (discriminated union)
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
// UIPrescription — configurable generator
// =============================================================================

export interface PrescriptionArbOptions {
  /** Fix the contextLock.sequenceId to this value */
  sequenceId?: number;
  /** Fix the manifestVersion to this value */
  manifestVersion?: string;
  /** Fix the surfaceId to this value */
  surfaceId?: string;
  /** Use a past expiresAt (generates expired prescriptions) */
  expired?: boolean;
  /** Specific data classes to use in the audit field */
  dataClassesUsed?: DataClass[];
}

export const arbUIPrescription = (
  options: PrescriptionArbOptions = {},
): fc.Arbitrary<UIPrescription> => {
  const { sequenceId, manifestVersion, surfaceId, expired = false, dataClassesUsed } = options;

  return fc
    .tuple(
      arbNonEmptyString, // id
      surfaceId !== undefined ? fc.constant(surfaceId) : arbNonEmptyString, // surfaceId
      fc.constantFrom(...PRESCRIPTION_MODES), // mode
      fc.constantFrom(...LATENCY_CLASSES), // latencyClass
      arbContextLock(sequenceId), // contextLock
      fc.array(arbAdaptation, { minLength: 1, maxLength: 4 }), // adaptations
      expired ? arbPastISOTimestamp : arbFutureISOTimestamp, // expiresAt
      manifestVersion !== undefined ? fc.constant(manifestVersion) : arbNonEmptyString, // manifestVersion
      dataClassesUsed !== undefined
        ? fc.constant(dataClassesUsed)
        : fc.option(
            fc.array(fc.constantFrom(...DATA_CLASSES), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ), // audit.dataClassesUsed
      fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: undefined }), // explanation.confidence
      fc.option(fc.array(arbAdaptationGroup, { minLength: 1, maxLength: 3 }), {
        nil: undefined,
      }), // adaptationGroups
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
        prescManifestVersion,
        auditDataClasses,
        confidence,
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
          manifestVersion: prescManifestVersion,
          audit: {},
        };

        if (auditDataClasses !== undefined) {
          prescription.audit.dataClassesUsed = auditDataClasses;
        }

        if (confidence !== undefined) {
          prescription.explanation = { confidence };
        }

        if (adaptationGroups !== undefined) {
          prescription.adaptationGroups = adaptationGroups;
        }

        return prescription;
      },
    );
};

/** Default valid prescription (non-expired, no pinned options) */
export const arbValidUIPrescription: fc.Arbitrary<UIPrescription> = arbUIPrescription();

/** Expired prescription (expiresAt in the past) */
export const arbExpiredUIPrescription: fc.Arbitrary<UIPrescription> = arbUIPrescription({
  expired: true,
});

/** Prescription with a specific contextLock sequenceId */
export const arbPrescriptionWithSequenceId = (seqId: number): fc.Arbitrary<UIPrescription> =>
  arbUIPrescription({ sequenceId: seqId });

/** Prescription with a specific manifestVersion */
export const arbPrescriptionWithManifestVersion = (version: string): fc.Arbitrary<UIPrescription> =>
  arbUIPrescription({ manifestVersion: version });

/** Prescription for a specific surfaceId */
export const arbPrescriptionForSurface = (surfaceId: string): fc.Arbitrary<UIPrescription> =>
  arbUIPrescription({ surfaceId });

/** Prescription with specific data classes in audit (for consent revocation tests) */
export const arbPrescriptionWithDataClasses = (
  dataClasses: DataClass[],
): fc.Arbitrary<UIPrescription> => arbUIPrescription({ dataClassesUsed: dataClasses });

/**
 * A fully admissible prescription that would pass PrescriptionStore admission:
 * - non-expired
 * - contextLock matches given sequenceId
 * - manifestVersion matches given version
 */
export const arbAdmissiblePrescription = (
  sequenceId: number,
  manifestVersion: string,
  surfaceId?: string,
): fc.Arbitrary<UIPrescription> =>
  arbUIPrescription({
    sequenceId,
    manifestVersion,
    surfaceId,
    expired: false,
  });
