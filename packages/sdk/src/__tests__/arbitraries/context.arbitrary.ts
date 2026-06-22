/**
 * Custom fast-check generators for ContextModel values.
 * Produces values conforming to @aura/protocol context schemas.
 */
import fc from "fast-check";
import type { ContextModel, NetworkQuality } from "@aura/protocol";

// =============================================================================
// Shared enum values (matching @aura/protocol enums)
// =============================================================================

const NETWORK_QUALITIES: NetworkQuality[] = ["offline", "slow", "moderate", "fast"];

// =============================================================================
// Valid ContextModel
// =============================================================================

/**
 * Generates a valid BCP-47 locale string (simplified).
 */
const arbLocale: fc.Arbitrary<string> = fc.constantFrom(
  "en-US",
  "en-GB",
  "fr-FR",
  "de-DE",
  "ja-JP",
  "zh-CN",
  "es-ES",
  "pt-BR",
  "ar-SA",
  "ko-KR",
);

/**
 * Generates a valid device identifier (non-empty string).
 */
const arbDevice: fc.Arbitrary<string> = fc.constantFrom(
  "desktop",
  "mobile",
  "tablet",
  "watch",
  "tv",
  "kiosk",
);

/**
 * Generates a valid viewport object.
 */
const arbViewport: fc.Arbitrary<{ width: number; height: number }> = fc.record({
  width: fc.integer({ min: 1, max: 32767 }),
  height: fc.integer({ min: 1, max: 32767 }),
});

/**
 * Generates a valid ContextModel with required and optional fields.
 */
export const arbContextModel: fc.Arbitrary<ContextModel> = fc
  .tuple(
    arbDevice,
    arbLocale,
    fc.option(arbViewport, { nil: undefined }),
    fc.option(fc.constantFrom(...NETWORK_QUALITIES), { nil: undefined }),
    fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
    fc.option(
      fc.dictionary(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        { minKeys: 0, maxKeys: 3 },
      ),
      { nil: undefined },
    ),
    fc.option(
      fc.dictionary(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        { minKeys: 0, maxKeys: 3 },
      ),
      { nil: undefined },
    ),
  )
  .map(([device, locale, viewport, networkQuality, sequenceId, taskState, domain]) => {
    const context: ContextModel = { device, locale };
    if (viewport !== undefined) context.viewport = viewport;
    if (networkQuality !== undefined) context.networkQuality = networkQuality;
    if (sequenceId !== undefined) context.sequenceId = sequenceId;
    if (taskState !== undefined) context.taskState = taskState;
    if (domain !== undefined) context.domain = domain;
    return context;
  });

/**
 * Generates a ContextModel with a specific sequenceId (useful for context lock tests).
 */
export const arbContextModelWithSequenceId = (seqId: number): fc.Arbitrary<ContextModel> =>
  arbContextModel.map((ctx) => ({ ...ctx, sequenceId: seqId }));
