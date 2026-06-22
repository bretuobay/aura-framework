import {
  CapabilityManifestSchema,
  ConsentProfileSchema,
  ContextModelSchema,
} from "@aura/protocol";
import { AuraConfigError } from "./errors.js";
import type { AuraClientConfig } from "./types.js";

/**
 * Validates the provided AuraClientConfig synchronously.
 * Throws AuraConfigError if any field is invalid.
 *
 * Called from `createAuraClient` before constructing the client instance.
 */
export function validateConfig(config: AuraClientConfig): void {
  // 1. endpoint: must be a non-empty string
  if (typeof config.endpoint !== "string" || config.endpoint.trim() === "") {
    throw new AuraConfigError(
      "endpoint must be a non-empty string",
      "endpoint",
    );
  }

  // 2. userId: must be a non-empty string
  if (typeof config.userId !== "string" || config.userId.trim() === "") {
    throw new AuraConfigError(
      "userId must be a non-empty string",
      "userId",
    );
  }

  // 3. manifest: validate against CapabilityManifestSchema
  const manifestResult = CapabilityManifestSchema.safeParse(config.manifest);
  if (!manifestResult.success) {
    throw new AuraConfigError(
      `Invalid manifest: ${manifestResult.error.message}`,
      "manifest",
    );
  }

  // 4. consentProfile: validate against ConsentProfileSchema
  const consentResult = ConsentProfileSchema.safeParse(config.consentProfile);
  if (!consentResult.success) {
    throw new AuraConfigError(
      `Invalid consentProfile: ${consentResult.error.message}`,
      "consentProfile",
    );
  }

  // 5. context: validate against ContextModelSchema
  const contextResult = ContextModelSchema.safeParse(config.context);
  if (!contextResult.success) {
    throw new AuraConfigError(
      `Invalid context: ${contextResult.error.message}`,
      "context",
    );
  }
}
