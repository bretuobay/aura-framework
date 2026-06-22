import fc from "fast-check";
import type { SessionRequest } from "@aura/protocol";
import { arbCapabilityManifest, arbInvalidManifest } from "./manifest.gen.js";
import { arbConsentProfile, arbInvalidConsentProfile } from "./consent.gen.js";
import { arbContextModel, arbInvalidContextModel } from "./context.gen.js";

/**
 * Arbitrary for a valid SessionRequest matching SessionRequestSchema.
 */
export const arbSessionRequest: fc.Arbitrary<SessionRequest> = fc.record({
  sessionId: fc.string({ minLength: 1, maxLength: 36 }),
  userId: fc.string({ minLength: 1, maxLength: 64 }),
  manifest: arbCapabilityManifest,
  consentProfile: arbConsentProfile,
  context: arbContextModel,
  contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
});

/**
 * Arbitrary for an invalid SessionRequest that violates at least one schema constraint.
 * Uses empty strings for sessionId/userId which violates NonEmptyString.
 */
export const arbInvalidSessionRequest = fc.oneof(
  // Empty sessionId
  fc.record({
    sessionId: fc.constant(""),
    userId: fc.string({ minLength: 1, maxLength: 64 }),
    manifest: arbCapabilityManifest,
    consentProfile: arbConsentProfile,
    context: arbContextModel,
    contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
  }),
  // Empty userId
  fc.record({
    sessionId: fc.string({ minLength: 1, maxLength: 36 }),
    userId: fc.constant(""),
    manifest: arbCapabilityManifest,
    consentProfile: arbConsentProfile,
    context: arbContextModel,
    contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
  }),
  // Invalid manifest
  fc.record({
    sessionId: fc.string({ minLength: 1, maxLength: 36 }),
    userId: fc.string({ minLength: 1, maxLength: 64 }),
    manifest: arbInvalidManifest,
    consentProfile: arbConsentProfile,
    context: arbContextModel,
    contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
  }),
  // Invalid context
  fc.record({
    sessionId: fc.string({ minLength: 1, maxLength: 36 }),
    userId: fc.string({ minLength: 1, maxLength: 64 }),
    manifest: arbCapabilityManifest,
    consentProfile: arbConsentProfile,
    context: arbInvalidContextModel,
    contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
  }),
  // Negative contextSequenceId
  fc.record({
    sessionId: fc.string({ minLength: 1, maxLength: 36 }),
    userId: fc.string({ minLength: 1, maxLength: 64 }),
    manifest: arbCapabilityManifest,
    consentProfile: arbConsentProfile,
    context: arbContextModel,
    contextSequenceId: fc.integer({ min: -1000, max: -1 }),
  })
);
