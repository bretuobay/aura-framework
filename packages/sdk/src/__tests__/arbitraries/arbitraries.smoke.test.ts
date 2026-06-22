/**
 * Smoke test to verify all custom arbitraries produce values
 * that pass their respective @aura/protocol schema validations.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  CapabilityManifestSchema,
  ConsentProfileSchema,
  ContextModelSchema,
  AuraEventSchema,
  UIPrescriptionSchema,
} from "@aura/protocol";
import {
  arbCapabilityManifest,
  arbCapabilityManifestWithVersion,
  arbCapabilityManifestWithoutVersion,
} from "./manifest.arbitrary.js";
import { arbContextModel } from "./context.arbitrary.js";
import { arbAuraEvent } from "./aura-event.arbitrary.js";
import {
  arbValidUIPrescription,
  arbAdmissiblePrescription,
  arbExpiredUIPrescription,
} from "./prescription.arbitrary.js";
import {
  arbConsentProfile,
  arbNonEmptyConsentProfile,
  arbFullConsentProfile,
  arbConsentRevocationPatch,
} from "./consent.arbitrary.js";
import { arbValidAuraClientConfig } from "./config.arbitrary.js";

describe("Arbitraries Smoke Tests", () => {
  it("arbCapabilityManifest produces valid CapabilityManifest values", () => {
    fc.assert(
      fc.property(arbCapabilityManifest, (manifest) => {
        const result = CapabilityManifestSchema.safeParse(manifest);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbCapabilityManifestWithVersion produces manifests with version", () => {
    fc.assert(
      fc.property(arbCapabilityManifestWithVersion, (manifest) => {
        expect(manifest.version).toBeDefined();
        expect(manifest.version!.length).toBeGreaterThan(0);
        const result = CapabilityManifestSchema.safeParse(manifest);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbCapabilityManifestWithoutVersion produces manifests without version", () => {
    fc.assert(
      fc.property(arbCapabilityManifestWithoutVersion, (manifest) => {
        expect(manifest.version).toBeUndefined();
        const result = CapabilityManifestSchema.safeParse(manifest);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbContextModel produces valid ContextModel values", () => {
    fc.assert(
      fc.property(arbContextModel, (ctx) => {
        const result = ContextModelSchema.safeParse(ctx);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbAuraEvent produces valid AuraEvent values", () => {
    fc.assert(
      fc.property(arbAuraEvent, (event) => {
        const result = AuraEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbValidUIPrescription produces valid UIPrescription values", () => {
    fc.assert(
      fc.property(arbValidUIPrescription, (prescription) => {
        const result = UIPrescriptionSchema.safeParse(prescription);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbAdmissiblePrescription produces valid prescriptions with pinned fields", () => {
    fc.assert(
      fc.property(arbAdmissiblePrescription(5, "v1.0"), (prescription) => {
        const result = UIPrescriptionSchema.safeParse(prescription);
        expect(result.success).toBe(true);
        expect(prescription.contextLock.sequenceId).toBe(5);
        expect(prescription.manifestVersion).toBe("v1.0");
      }),
      { numRuns: 50 }
    );
  });

  it("arbExpiredUIPrescription produces prescriptions with past expiresAt", () => {
    fc.assert(
      fc.property(arbExpiredUIPrescription, (prescription) => {
        const result = UIPrescriptionSchema.safeParse(prescription);
        expect(result.success).toBe(true);
        const expiresAt = new Date(prescription.constraints.expiresAt).getTime();
        expect(expiresAt).toBeLessThan(Date.now());
      }),
      { numRuns: 50 }
    );
  });

  it("arbConsentProfile produces valid ConsentProfile values", () => {
    fc.assert(
      fc.property(arbConsentProfile, (profile) => {
        const result = ConsentProfileSchema.safeParse(profile);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbNonEmptyConsentProfile produces non-empty profiles", () => {
    fc.assert(
      fc.property(arbNonEmptyConsentProfile, (profile) => {
        expect(Object.keys(profile).length).toBeGreaterThan(0);
        const result = ConsentProfileSchema.safeParse(profile);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbFullConsentProfile produces profiles with all true values", () => {
    fc.assert(
      fc.property(arbFullConsentProfile, (profile) => {
        expect(Object.keys(profile).length).toBeGreaterThan(0);
        Object.values(profile).forEach((v) => expect(v).toBe(true));
        const result = ConsentProfileSchema.safeParse(profile);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbConsentRevocationPatch produces patches with all false values", () => {
    fc.assert(
      fc.property(arbConsentRevocationPatch, (patch) => {
        expect(Object.keys(patch).length).toBeGreaterThan(0);
        Object.values(patch).forEach((v) => expect(v).toBe(false));
        const result = ConsentProfileSchema.safeParse(patch);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("arbValidAuraClientConfig produces configs with all valid sub-objects", () => {
    fc.assert(
      fc.property(arbValidAuraClientConfig, (config) => {
        expect(config.endpoint.length).toBeGreaterThan(0);
        expect(config.userId.length).toBeGreaterThan(0);
        const manifestResult = CapabilityManifestSchema.safeParse(config.manifest);
        expect(manifestResult.success).toBe(true);
        const consentResult = ConsentProfileSchema.safeParse(config.consentProfile);
        expect(consentResult.success).toBe(true);
        const contextResult = ContextModelSchema.safeParse(config.context);
        expect(contextResult.success).toBe(true);
      }),
      { numRuns: 50 }
    );
  });
});
