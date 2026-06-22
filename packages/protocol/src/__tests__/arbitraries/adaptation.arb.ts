import * as fc from "fast-check";
import type { Adaptation } from "../../adaptation.js";
import { arbNonEmptyString } from "./primitives.arb.js";

const AccessibilitySettings = ["fontScale", "contrast", "motion", "inputMode"] as const;

const LayoutTypes = ["compact", "expanded", "step-by-step", "accessible"] as const;

function arbRankAdaptation(): fc.Arbitrary<Adaptation> {
  return fc
    .record({
      type: fc.constant("rank" as const),
      orderedIds: fc
        .array(arbNonEmptyString(), { minLength: 1, maxLength: 5 })
        .map((arr) => arr as [string, ...string[]]),
      reasonCode: arbNonEmptyString(),
    })
    .map((v) => v as Adaptation);
}

function arbComponentVariantAdaptation(): fc.Arbitrary<Adaptation> {
  return fc
    .record({
      type: fc.constant("componentVariant" as const),
      slotId: arbNonEmptyString(),
      componentId: arbNonEmptyString(),
      variant: arbNonEmptyString(),
      reasonCode: arbNonEmptyString(),
    })
    .map((v) => v as Adaptation);
}

function arbLayoutAdaptation(): fc.Arbitrary<Adaptation> {
  return fc
    .record({
      type: fc.constant("layout" as const),
      layout: fc.constantFrom(...LayoutTypes),
      reasonCode: arbNonEmptyString(),
    })
    .map((v) => v as Adaptation);
}

function arbContentAdaptation(): fc.Arbitrary<Adaptation> {
  return fc
    .record({
      type: fc.constant("content" as const),
      target: arbNonEmptyString(),
      contentKey: arbNonEmptyString(),
      content: arbNonEmptyString(),
      reasonCode: arbNonEmptyString(),
    })
    .map((v) => v as Adaptation);
}

function arbAccessibilityAdaptation(): fc.Arbitrary<Adaptation> {
  return fc
    .record({
      type: fc.constant("accessibility" as const),
      setting: fc.constantFrom(...AccessibilitySettings),
      value: fc.oneof(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.double({ noNaN: true, min: -1000, max: 1000 }),
        fc.boolean(),
      ),
      reasonCode: arbNonEmptyString(),
    })
    .map((v) => v as Adaptation);
}

function arbFilterAdaptation(): fc.Arbitrary<Adaptation> {
  return fc
    .record({
      type: fc.constant("filter" as const),
      target: arbNonEmptyString(),
      visibleFilters: fc
        .array(arbNonEmptyString(), { minLength: 1, maxLength: 5 })
        .map((arr) => arr as [string, ...string[]]),
      reasonCode: arbNonEmptyString(),
    })
    .map((v) => v as Adaptation);
}

/**
 * Generates a valid Adaptation covering all 6 discriminated union members.
 */
export function arbAdaptation(): fc.Arbitrary<Adaptation> {
  return fc.oneof(
    arbRankAdaptation(),
    arbComponentVariantAdaptation(),
    arbLayoutAdaptation(),
    arbContentAdaptation(),
    arbAccessibilityAdaptation(),
    arbFilterAdaptation(),
  );
}
