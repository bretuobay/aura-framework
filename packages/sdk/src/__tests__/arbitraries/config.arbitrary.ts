/**
 * Custom fast-check generators for valid/invalid AuraClientConfig values.
 * Produces values conforming to (or intentionally violating) @aura/protocol schemas.
 */
import fc from "fast-check";
import type {
  AuraClientConfig,
  AuraClientOptions,
} from "../../types.js";
import type {
  CapabilityManifest,
  ConsentProfile,
  ContextModel,
} from "@aura/protocol";
import {
  arbCapabilityManifest,
  arbManifestSurface,
} from "./manifest.arbitrary.js";
import { arbConsentProfile } from "./consent.arbitrary.js";
import { arbContextModel } from "./context.arbitrary.js";

// =============================================================================
// Valid AuraClientOptions
// =============================================================================

export const arbAuraClientOptions: fc.Arbitrary<AuraClientOptions> = fc.record(
  {
    queueCapacity: fc.integer({ min: 1, max: 1000 }),
    queueTTL: fc.integer({ min: 1000, max: 300000 }),
    expiryCheckInterval: fc.integer({ min: 1000, max: 30000 }),
    requestTimeout: fc.integer({ min: 1000, max: 60000 }),
  },
  { requiredKeys: [] }
);

// =============================================================================
// Valid endpoint strings
// =============================================================================

export const arbValidEndpoint: fc.Arbitrary<string> = fc.oneof(
  fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/),
      fc.constantFrom(".example.com", ".aura.io", ".local.dev")
    )
    .map(([sub, domain]) => `https://${sub}${domain}`),
  fc
    .integer({ min: 3000, max: 9999 })
    .map((port) => `http://localhost:${port}`)
);

// =============================================================================
// Valid userId strings
// =============================================================================

export const arbValidUserId: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,64}$/
);

// =============================================================================
// Valid AuraClientConfig
// =============================================================================

export const arbValidAuraClientConfig: fc.Arbitrary<AuraClientConfig> = fc
  .tuple(
    arbValidEndpoint,
    arbCapabilityManifest,
    arbValidUserId,
    arbConsentProfile,
    arbContextModel,
    fc.option(arbAuraClientOptions, { nil: undefined })
  )
  .map(([endpoint, manifest, userId, consentProfile, context, options]) => {
    const config: AuraClientConfig = {
      endpoint,
      manifest,
      userId,
      consentProfile,
      context,
    };
    if (options !== undefined) {
      config.options = options;
    }
    return config;
  });

// =============================================================================
// Invalid AuraClientConfig generators (for error testing)
// =============================================================================

/** Config with empty endpoint */
export const arbConfigWithEmptyEndpoint: fc.Arbitrary<AuraClientConfig> =
  arbValidAuraClientConfig.map((config) => ({
    ...config,
    endpoint: "",
  }));

/** Config with empty userId */
export const arbConfigWithEmptyUserId: fc.Arbitrary<AuraClientConfig> =
  arbValidAuraClientConfig.map((config) => ({
    ...config,
    userId: "",
  }));

/** Config with invalid manifest (empty surfaces array would still validate, so we break componentId) */
export const arbConfigWithInvalidManifest: fc.Arbitrary<Record<string, unknown>> =
  arbValidAuraClientConfig.map((config) => ({
    ...config,
    manifest: { surfaces: [{ surfaceId: "", components: [] }] },
  }));

/** Config with invalid consentProfile (non-boolean values) */
export const arbConfigWithInvalidConsent: fc.Arbitrary<Record<string, unknown>> =
  arbValidAuraClientConfig.map((config) => ({
    ...config,
    consentProfile: { behavior: "yes" as unknown as boolean },
  }));

/** Config with invalid context (missing required device field) */
export const arbConfigWithInvalidContext: fc.Arbitrary<Record<string, unknown>> =
  arbValidAuraClientConfig.map((config) => ({
    ...config,
    context: { locale: "en-US" } as unknown as ContextModel,
  }));
