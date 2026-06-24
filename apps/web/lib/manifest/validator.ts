/**
 * AURA Manifest Validator
 *
 * Validates the AURA capability manifest at startup using Zod schemas
 * from @aura/protocol. Fails fast with descriptive errors if the manifest
 * is missing required fields or contains invalid values.
 *
 * @see Requirements 4.7
 */

import {
  CapabilityManifestSchema,
  type CapabilityManifest,
} from "@aura/protocol";

export interface ManifestValidationSuccess {
  success: true;
  data: CapabilityManifest;
}

export interface ManifestValidationFailure {
  success: false;
  errors: string[];
}

export type ManifestValidationResult = ManifestValidationSuccess | ManifestValidationFailure;

/**
 * Validates a manifest object and returns the parsed result or a list of errors.
 *
 * Use this when you want to handle validation errors programmatically
 * without throwing.
 */
export function validateManifestSafe(manifest: unknown): ManifestValidationResult {
  const result = CapabilityManifestSchema.safeParse(manifest);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `[${path}]: ${issue.message}`;
  });

  return { success: false, errors };
}

/**
 * Validates a manifest object and returns the typed manifest on success.
 *
 * Throws a descriptive error on validation failure, suitable for blocking
 * application startup when the manifest is invalid.
 *
 * @throws Error with a message listing all validation failures
 */
export function validateManifest(manifest: unknown): CapabilityManifest {
  const result = validateManifestSafe(manifest);

  if (result.success) {
    return result.data;
  }

  const message = [
    "AURA manifest validation failed — the application cannot start.",
    "",
    ...result.errors.map((err) => `  • ${err}`),
  ].join("\n");

  throw new Error(message);
}
