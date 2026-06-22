import fc from "fast-check";
import type { ContextModel, ContextRequest } from "@aura/protocol";

const networkQualities = ["offline", "slow", "moderate", "fast"] as const;

/**
 * Arbitrary for a valid viewport object.
 */
const arbViewport = fc.record({
  width: fc.integer({ min: 1, max: 32767 }),
  height: fc.integer({ min: 1, max: 32767 }),
});

/**
 * Arbitrary for a valid ContextModel matching ContextModelSchema.
 */
export const arbContextModel: fc.Arbitrary<ContextModel> = fc.record({
  device: fc.string({ minLength: 1, maxLength: 30 }),
  locale: fc.string({ minLength: 1, maxLength: 35 }),
  viewport: fc.option(arbViewport, { nil: undefined }),
  networkQuality: fc.option(fc.constantFrom(...networkQualities), { nil: undefined }),
  sequenceId: fc.option(fc.nat(), { nil: undefined }),
  taskState: fc.option(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ maxLength: 20 })),
    { nil: undefined }
  ),
  domain: fc.option(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ maxLength: 20 })),
    { nil: undefined }
  ),
});

/**
 * Arbitrary for an invalid ContextModel that violates at least one constraint.
 */
export const arbInvalidContextModel = fc.oneof(
  // Empty device (violates NonEmptyString)
  fc.record({
    device: fc.constant(""),
    locale: fc.string({ minLength: 1, maxLength: 35 }),
    viewport: fc.constant(undefined),
    networkQuality: fc.constant(undefined),
    sequenceId: fc.constant(undefined),
    taskState: fc.constant(undefined),
    domain: fc.constant(undefined),
  }),
  // Empty locale (violates min(1))
  fc.record({
    device: fc.string({ minLength: 1, maxLength: 30 }),
    locale: fc.constant(""),
    viewport: fc.constant(undefined),
    networkQuality: fc.constant(undefined),
    sequenceId: fc.constant(undefined),
    taskState: fc.constant(undefined),
    domain: fc.constant(undefined),
  }),
  // Locale too long (>35 chars)
  fc.record({
    device: fc.string({ minLength: 1, maxLength: 30 }),
    locale: fc.string({ minLength: 36, maxLength: 50 }),
    viewport: fc.constant(undefined),
    networkQuality: fc.constant(undefined),
    sequenceId: fc.constant(undefined),
    taskState: fc.constant(undefined),
    domain: fc.constant(undefined),
  }),
  // Invalid viewport dimensions (0 or negative)
  fc.record({
    device: fc.string({ minLength: 1, maxLength: 30 }),
    locale: fc.string({ minLength: 1, maxLength: 35 }),
    viewport: fc.record({
      width: fc.integer({ min: -100, max: 0 }),
      height: fc.integer({ min: 1, max: 32767 }),
    }),
    networkQuality: fc.constant(undefined),
    sequenceId: fc.constant(undefined),
    taskState: fc.constant(undefined),
    domain: fc.constant(undefined),
  }),
  // Viewport exceeding max
  fc.record({
    device: fc.string({ minLength: 1, maxLength: 30 }),
    locale: fc.string({ minLength: 1, maxLength: 35 }),
    viewport: fc.record({
      width: fc.integer({ min: 32768, max: 65000 }),
      height: fc.integer({ min: 1, max: 32767 }),
    }),
    networkQuality: fc.constant(undefined),
    sequenceId: fc.constant(undefined),
    taskState: fc.constant(undefined),
    domain: fc.constant(undefined),
  })
);

/**
 * Arbitrary for a valid ContextRequest matching ContextRequestSchema.
 */
export const arbContextRequest: fc.Arbitrary<ContextRequest> = fc.record({
  sessionId: fc.string({ minLength: 1, maxLength: 36 }),
  contextPatch: fc.record({
    device: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    locale: fc.option(fc.string({ minLength: 1, maxLength: 35 }), { nil: undefined }),
    viewport: fc.option(arbViewport, { nil: undefined }),
    networkQuality: fc.option(fc.constantFrom(...networkQualities), { nil: undefined }),
    sequenceId: fc.option(fc.nat(), { nil: undefined }),
    taskState: fc.option(
      fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ maxLength: 20 })),
      { nil: undefined }
    ),
    domain: fc.option(
      fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ maxLength: 20 })),
      { nil: undefined }
    ),
  }),
  contextSequenceId: fc.nat(),
});

/**
 * Arbitrary for an invalid ContextRequest.
 */
export const arbInvalidContextRequest = fc.oneof(
  // Empty sessionId
  fc.record({
    sessionId: fc.constant(""),
    contextPatch: fc.constant({}),
    contextSequenceId: fc.nat(),
  }),
  // Negative contextSequenceId
  fc.record({
    sessionId: fc.string({ minLength: 1, maxLength: 36 }),
    contextPatch: fc.constant({}),
    contextSequenceId: fc.integer({ min: -1000, max: -1 }),
  })
);
