import { describe, it, expect, beforeEach } from "vitest";
import {
  createCapabilityRegistry,
  type ICapabilityRegistry,
} from "../../src/services/capability-registry.js";
import type { CapabilityManifest, UIPrescription } from "@aura/protocol";

function makeManifest(overrides?: Partial<CapabilityManifest>): CapabilityManifest {
  return {
    version: "1.0.0",
    surfaces: [
      {
        surfaceId: "dashboard",
        components: [
          {
            componentId: "hero-banner",
            variants: ["default", "compact", "expanded"],
            riskClass: "low",
          },
          {
            componentId: "sidebar",
            variants: ["full", "mini"],
            riskClass: "medium",
          },
        ],
      },
    ],
    ...overrides,
  };
}

function makePrescription(overrides?: Partial<UIPrescription>): UIPrescription {
  return {
    id: "rx-001",
    surfaceId: "dashboard",
    mode: "recommend",
    latencyClass: "fast",
    contextLock: {
      sequenceId: 1,
      capturedAt: "2024-01-15T10:00:00.000Z",
    },
    adaptations: [
      {
        type: "componentVariant",
        slotId: "hero-slot",
        componentId: "hero-banner",
        variant: "compact",
        reasonCode: "user-prefers-compact",
      },
    ],
    constraints: {
      expiresAt: "2024-01-15T11:00:00.000Z",
    },
    manifestVersion: "1.0.0",
    audit: {},
    ...overrides,
  };
}

describe("CapabilityRegistry", () => {
  let registry: ICapabilityRegistry;

  beforeEach(() => {
    registry = createCapabilityRegistry();
  });

  describe("register", () => {
    it("stores the manifest version from manifest.version", () => {
      registry.register("sess-1", makeManifest({ version: "2.0.0" }));
      expect(registry.getManifestVersion("sess-1")).toBe("2.0.0");
    });

    it("stores 'unversioned' when manifest has no version", () => {
      registry.register("sess-1", makeManifest({ version: undefined }));
      expect(registry.getManifestVersion("sess-1")).toBe("unversioned");
    });
  });

  describe("getManifestVersion", () => {
    it("returns null for unknown sessions", () => {
      expect(registry.getManifestVersion("unknown")).toBeNull();
    });
  });

  describe("remove", () => {
    it("removes the stored manifest entry", () => {
      registry.register("sess-1", makeManifest());
      registry.remove("sess-1");
      expect(registry.getManifestVersion("sess-1")).toBeNull();
    });
  });

  describe("validate", () => {
    beforeEach(() => {
      registry.register("sess-1", makeManifest());
    });

    it("returns valid for a well-formed prescription", () => {
      const result = registry.validate("sess-1", makePrescription());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects when no manifest is registered for the session", () => {
      const result = registry.validate("unknown-sess", makePrescription());
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe("undeclared-surface");
    });

    it("rejects prescription with undeclared surfaceId", () => {
      const rx = makePrescription({ surfaceId: "nonexistent-surface" });
      const result = registry.validate("sess-1", rx);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ type: "undeclared-surface" })
      );
    });

    it("rejects prescription with undeclared componentId", () => {
      const rx = makePrescription({
        adaptations: [
          {
            type: "componentVariant",
            slotId: "slot-1",
            componentId: "unknown-component",
            variant: "default",
            reasonCode: "test",
          },
        ],
      });
      const result = registry.validate("sess-1", rx);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ type: "undeclared-component" })
      );
    });

    it("rejects prescription with undeclared variant", () => {
      const rx = makePrescription({
        adaptations: [
          {
            type: "componentVariant",
            slotId: "slot-1",
            componentId: "hero-banner",
            variant: "nonexistent-variant",
            reasonCode: "test",
          },
        ],
      });
      const result = registry.validate("sess-1", rx);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ type: "undeclared-variant" })
      );
    });

    it("rejects prescription with manifest version mismatch", () => {
      const rx = makePrescription({ manifestVersion: "99.0.0" });
      const result = registry.validate("sess-1", rx);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ type: "manifest-version-mismatch" })
      );
    });

    it("accepts non-componentVariant adaptations without component checks", () => {
      const rx = makePrescription({
        adaptations: [
          {
            type: "rank",
            orderedIds: ["a", "b", "c"],
            reasonCode: "test-ranking",
          },
        ],
      });
      const result = registry.validate("sess-1", rx);
      expect(result.valid).toBe(true);
    });

    it("collects multiple errors for a single prescription", () => {
      const rx = makePrescription({
        manifestVersion: "wrong-version",
        adaptations: [
          {
            type: "componentVariant",
            slotId: "slot-1",
            componentId: "unknown-component",
            variant: "unknown-variant",
            reasonCode: "test",
          },
        ],
      });
      const result = registry.validate("sess-1", rx);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it("validates against unversioned manifest correctly", () => {
      registry.register("sess-unv", makeManifest({ version: undefined }));
      const rx = makePrescription({ manifestVersion: "unversioned" });
      const result = registry.validate("sess-unv", rx);
      // Should only fail if surfaceId/component/variant are wrong
      // manifestVersion matches "unversioned"
      expect(
        result.errors.find((e) => e.type === "manifest-version-mismatch")
      ).toBeUndefined();
    });
  });
});
