import * as fc from "fast-check";
import type { FeedbackEvent } from "../../feedback.js";
import { arbNonEmptyString, arbISOTimestamp, arbContextSequenceId } from "./primitives.arb.js";

const FeedbackActions = ["accept", "dismiss", "override", "undo", "reject", "error"] as const;

/**
 * Generates a valid FeedbackEvent with required fields and optional reason/contextSequenceId.
 */
export function arbFeedbackEvent(): fc.Arbitrary<FeedbackEvent> {
  return fc
    .record({
      prescriptionId: arbNonEmptyString(),
      action: fc.constantFrom(...FeedbackActions),
      timestamp: arbISOTimestamp(),
      reason: fc.option(arbNonEmptyString(), { nil: undefined }),
      contextSequenceId: fc.option(arbContextSequenceId(), { nil: undefined }),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        prescriptionId: obj.prescriptionId,
        action: obj.action,
        timestamp: obj.timestamp,
      };
      if (obj.reason !== undefined) result.reason = obj.reason;
      if (obj.contextSequenceId !== undefined) result.contextSequenceId = obj.contextSequenceId;
      return result as FeedbackEvent;
    });
}
