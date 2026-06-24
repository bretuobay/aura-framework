import { describe, it, expect } from "vitest";
import { validateManifest, validateManifestSafe } from "@/lib/manifest/validator";

const validManifest = {
  version: "1.0.0",
  surfaces: [
    {
      surfaceId: "search.results",
      components: [
        {
          componentId: "product-card",
          variants: ["standard", "compact", "comparison", "image-lead"],
          riskClass: "low",
          adaptableProps: {
            variant: "enum:standard,compact,comparison,image-lead",
            showPrice: "boolean",
          },
          constraints: {
            requiresConsent: ["personalization"],
            reversible: true,
          },
        },
      ],
      layoutStability: {
        strategy: "reserve-space",
        maxDecisionWaitMs: 150,
      },
    },
  ],
};

describe("validateManifest", () => {
  it("should return the validated manifest when input is valid", () => {
    const result = validateManifest(validManifest);
    expect(result.version).toBe("1.0.0");
    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].surfaceId).toBe("search.results");
  });

  it("should throw when manifest is null", () => {
    expect(() => validateManifest(null)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when manifest is undefined", () => {
    expect(() => validateManifest(undefined)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when surfaces array is missing", () => {
    expect(() => validateManifest({ version: "1.0.0" })).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when surfaceId is empty", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "low",
            },
          ],
        },
      ],
    };
    expect(() => validateManifest(manifest)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when componentId is missing", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              variants: ["default"],
              riskClass: "low",
            },
          ],
        },
      ],
    };
    expect(() => validateManifest(manifest)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when variants array is empty", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: [],
              riskClass: "low",
            },
          ],
        },
      ],
    };
    expect(() => validateManifest(manifest)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when riskClass has an invalid value", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "unknown",
            },
          ],
        },
      ],
    };
    expect(() => validateManifest(manifest)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when maxDecisionWaitMs is negative", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "low",
            },
          ],
          layoutStability: {
            strategy: "reserve-space",
            maxDecisionWaitMs: -1,
          },
        },
      ],
    };
    expect(() => validateManifest(manifest)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when maxDecisionWaitMs exceeds 5000", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "low",
            },
          ],
          layoutStability: {
            strategy: "reserve-space",
            maxDecisionWaitMs: 6000,
          },
        },
      ],
    };
    expect(() => validateManifest(manifest)).toThrow(
      "AURA manifest validation failed"
    );
  });

  it("should throw when reserve-space strategy lacks maxDecisionWaitMs", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "low",
            },
          ],
          layoutStability: {
            strategy: "reserve-space",
          },
        },
      ],
    };
    expect(() => validateManifest(manifest)).toThrow(
      "AURA manifest validation failed"
    );
  });
});

describe("validateManifestSafe", () => {
  it("should return success with data for valid manifest", () => {
    const result = validateManifestSafe(validManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.surfaces[0].surfaceId).toBe("search.results");
    }
  });

  it("should return failure with errors for invalid manifest", () => {
    const result = validateManifestSafe({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("surfaces");
    }
  });

  it("should return multiple errors for multiple issues", () => {
    const result = validateManifestSafe({
      surfaces: [
        {
          surfaceId: "",
          components: [],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("should include path information in error messages", () => {
    const result = validateManifestSafe({
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "invalid",
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasPath = result.errors.some((e) => e.includes("riskClass"));
      expect(hasPath).toBe(true);
    }
  });

  it("should accept manifest without version (optional field)", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "low",
            },
          ],
        },
      ],
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(true);
  });

  it("should accept manifest with layoutStability strategy none without maxDecisionWaitMs", () => {
    const manifest = {
      surfaces: [
        {
          surfaceId: "test",
          components: [
            {
              componentId: "card",
              variants: ["default"],
              riskClass: "low",
            },
          ],
          layoutStability: {
            strategy: "none",
          },
        },
      ],
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(true);
  });
});
