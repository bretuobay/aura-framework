import * as fc from "fast-check";
import type { ContextModel } from "../../context.js";
import { arbNonEmptyString, arbContextSequenceId } from "./primitives.arb.js";

const NetworkQualities = ["offline", "slow", "moderate", "fast"] as const;

/**
 * Generates a valid ContextModel with required fields and optional fields.
 */
export function arbContextModel(): fc.Arbitrary<ContextModel> {
  return fc
    .record({
      device: arbNonEmptyString(),
      locale: fc.string({ minLength: 1, maxLength: 35 }),
      viewport: fc.option(
        fc.record({
          width: fc.integer({ min: 1, max: 32767 }),
          height: fc.integer({ min: 1, max: 32767 }),
        }),
        { nil: undefined },
      ),
      networkQuality: fc.option(fc.constantFrom(...NetworkQualities), {
        nil: undefined,
      }),
      sequenceId: fc.option(arbContextSequenceId(), { nil: undefined }),
      taskState: fc.option(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.jsonValue()),
        { nil: undefined },
      ),
      domain: fc.option(fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.jsonValue()), {
        nil: undefined,
      }),
    })
    .map((obj) => {
      // Remove undefined optional fields for cleaner generation
      const result: Record<string, unknown> = {
        device: obj.device,
        locale: obj.locale,
      };
      if (obj.viewport !== undefined) result.viewport = obj.viewport;
      if (obj.networkQuality !== undefined) result.networkQuality = obj.networkQuality;
      if (obj.sequenceId !== undefined) result.sequenceId = obj.sequenceId;
      if (obj.taskState !== undefined) result.taskState = obj.taskState;
      if (obj.domain !== undefined) result.domain = obj.domain;
      return result as ContextModel;
    });
}
