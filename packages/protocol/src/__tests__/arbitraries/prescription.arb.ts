import * as fc from "fast-check";
import type {
  UIPrescription,
  ContextLock,
  AdaptationGroup,
} from "../../prescription.js";
import {
  arbNonEmptyString,
  arbISOTimestamp,
  arbConfidence,
  arbContextSequenceId,
} from "./primitives.arb.js";
import { arbAdaptation } from "./adaptation.arb.js";

const PrescriptionModes = [
  "recommend",
  "autoApply",
  "askUser",
  "observeOnly",
] as const;

const LatencyClasses = ["immediate", "fast", "deliberate"] as const;

const DataClassValues = [
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

/**
 * Generates a valid ContextLock with sequenceId and capturedAt.
 */
export function arbContextLock(): fc.Arbitrary<ContextLock> {
  return fc.record({
    sequenceId: arbContextSequenceId(),
    capturedAt: arbISOTimestamp(),
  });
}

/**
 * Generates a valid AdaptationGroup with non-empty groupId, non-empty adaptationIds, and boolean atomic.
 */
export function arbAdaptationGroup(): fc.Arbitrary<AdaptationGroup> {
  return fc.record({
    groupId: arbNonEmptyString(),
    adaptationIds: fc
      .array(arbNonEmptyString(), { minLength: 1, maxLength: 4 })
      .map((arr) => arr as [string, ...string[]]),
    atomic: fc.boolean(),
  });
}

/**
 * Generates a valid UIPrescription with all required fields and optional explanation/adaptationGroups.
 */
export function arbUIPrescription(): fc.Arbitrary<UIPrescription> {
  return fc
    .record({
      id: arbNonEmptyString(),
      surfaceId: arbNonEmptyString(),
      mode: fc.constantFrom(...PrescriptionModes),
      latencyClass: fc.constantFrom(...LatencyClasses),
      contextLock: arbContextLock(),
      adaptations: fc
        .array(arbAdaptation(), { minLength: 1, maxLength: 3 })
        .map((arr) => arr as [any, ...any[]]),
      constraints: fc.record({
        expiresAt: arbISOTimestamp(),
      }),
      manifestVersion: arbNonEmptyString(),
      audit: fc.record({
        dataClassesUsed: fc.option(
          fc.subarray([...DataClassValues], { minLength: 1 }),
          { nil: undefined }
        ),
        policyVersion: fc.option(arbNonEmptyString(), { nil: undefined }),
        decisionSource: fc.option(arbNonEmptyString(), { nil: undefined }),
      }),
      explanation: fc.option(
        fc.record({
          confidence: arbConfidence(),
          summary: fc.option(fc.string({ minLength: 0, maxLength: 100 }), {
            nil: undefined,
          }),
        }),
        { nil: undefined }
      ),
      adaptationGroups: fc.option(
        fc.array(arbAdaptationGroup(), { minLength: 1, maxLength: 3 }),
        { nil: undefined }
      ),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        id: obj.id,
        surfaceId: obj.surfaceId,
        mode: obj.mode,
        latencyClass: obj.latencyClass,
        contextLock: obj.contextLock,
        adaptations: obj.adaptations,
        constraints: obj.constraints,
        manifestVersion: obj.manifestVersion,
      };

      // Build audit object, omitting undefined fields
      const audit: Record<string, unknown> = {};
      if (obj.audit.dataClassesUsed !== undefined)
        audit.dataClassesUsed = obj.audit.dataClassesUsed;
      if (obj.audit.policyVersion !== undefined)
        audit.policyVersion = obj.audit.policyVersion;
      if (obj.audit.decisionSource !== undefined)
        audit.decisionSource = obj.audit.decisionSource;
      result.audit = audit;

      if (obj.explanation !== undefined) {
        const explanation: Record<string, unknown> = {
          confidence: obj.explanation.confidence,
        };
        if (obj.explanation.summary !== undefined)
          explanation.summary = obj.explanation.summary;
        result.explanation = explanation;
      }

      if (obj.adaptationGroups !== undefined)
        result.adaptationGroups = obj.adaptationGroups;

      return result as UIPrescription;
    });
}
