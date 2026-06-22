/**
 * CapabilityRegistry — per-session manifest validator.
 *
 * Stores the capability manifest registered at session initialization and validates
 * candidate prescriptions against declared surfaces, components, variants, and props.
 */

import type { CapabilityManifest, UIPrescription } from "@aura/protocol";

// ─── Public Types ────────────────────────────────────────────────────────────

export interface ICapabilityRegistry {
  /** Register a manifest for a session (called once at session init) */
  register(sessionId: string, manifest: CapabilityManifest): void;

  /** Validate a prescription candidate against the stored manifest */
  validate(
    sessionId: string,
    prescription: UIPrescription
  ): CapabilityValidationResult;

  /** Get the manifest version for a session */
  getManifestVersion(sessionId: string): string | null;

  /** Remove a session's manifest (cleanup) */
  remove(sessionId: string): void;
}

export interface CapabilityValidationResult {
  valid: boolean;
  errors: CapabilityError[];
}

export interface CapabilityError {
  type:
    | "undeclared-surface"
    | "undeclared-component"
    | "undeclared-variant"
    | "invalid-props"
    | "manifest-version-mismatch";
  prescriptionId: string;
  detail: string;
}

// ─── Internal Storage Entry ──────────────────────────────────────────────────

interface ManifestEntry {
  manifest: CapabilityManifest;
  version: string;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createCapabilityRegistry(): ICapabilityRegistry {
  const store = new Map<string, ManifestEntry>();

  return {
    register(sessionId: string, manifest: CapabilityManifest): void {
      const version = manifest.version ?? "unversioned";
      store.set(sessionId, { manifest, version });
    },

    validate(
      sessionId: string,
      prescription: UIPrescription
    ): CapabilityValidationResult {
      const entry = store.get(sessionId);
      if (!entry) {
        return {
          valid: false,
          errors: [
            {
              type: "undeclared-surface",
              prescriptionId: prescription.id,
              detail: `No manifest registered for session "${sessionId}"`,
            },
          ],
        };
      }

      const errors: CapabilityError[] = [];
      const { manifest, version } = entry;

      // Check 5: manifestVersion must match stored version
      if (prescription.manifestVersion !== version) {
        errors.push({
          type: "manifest-version-mismatch",
          prescriptionId: prescription.id,
          detail: `Prescription manifestVersion "${prescription.manifestVersion}" does not match stored version "${version}"`,
        });
      }

      // Check 2: prescription.surfaceId must match a declared surface
      const targetSurface = manifest.surfaces.find(
        (s) => s.surfaceId === prescription.surfaceId
      );

      if (!targetSurface) {
        errors.push({
          type: "undeclared-surface",
          prescriptionId: prescription.id,
          detail: `Surface "${prescription.surfaceId}" is not declared in the manifest`,
        });
        // Cannot validate components/variants without a valid surface
        return { valid: errors.length === 0, errors };
      }

      // Validate each adaptation
      for (const adaptation of prescription.adaptations) {
        // Check 3 & 4: componentVariant adaptations
        if (adaptation.type === "componentVariant") {
          const component = targetSurface.components.find(
            (c) => c.componentId === adaptation.componentId
          );

          if (!component) {
            errors.push({
              type: "undeclared-component",
              prescriptionId: prescription.id,
              detail: `Component "${adaptation.componentId}" is not declared in surface "${prescription.surfaceId}"`,
            });
            continue;
          }

          if (!component.variants.includes(adaptation.variant)) {
            errors.push({
              type: "undeclared-variant",
              prescriptionId: prescription.id,
              detail: `Variant "${adaptation.variant}" is not declared for component "${adaptation.componentId}" in surface "${prescription.surfaceId}"`,
            });
          }
        }
      }

      return { valid: errors.length === 0, errors };
    },

    getManifestVersion(sessionId: string): string | null {
      const entry = store.get(sessionId);
      return entry ? entry.version : null;
    },

    remove(sessionId: string): void {
      store.delete(sessionId);
    },
  };
}
