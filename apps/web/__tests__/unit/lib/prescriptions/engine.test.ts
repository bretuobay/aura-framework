/**
 * Unit tests for the Prescription Application Engine.
 * Validates ranking, variant, filter-highlight, layout-density, accessibility
 * prescriptions, sequential application, manifest rejection, and undo support.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { describe, it, expect, vi } from "vitest";
import {
  PrescriptionEngine,
  createDefaultUIState,
  type PrescriptionLogger,
} from "@/lib/prescriptions/engine";
import type { UIPrescription, CapabilityManifest } from "@aura/protocol";

// ---------------------------------------------------------------------------
// Test Manifest
// ---------------------------------------------------------------------------

const testManifest: CapabilityManifest = {
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
            showRating: "boolean",
            badgeLabel: "string:max24",
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
    {
      surfaceId: "filter.panel",
      components: [
        {
          componentId: "filter-panel",
          variants: ["default"],
          riskClass: "medium",
          adaptableProps: {
            highlightedFilterIds: "array:string:max3",
            collapsed: "boolean",
          },
          constraints: {
            reversible: true,
          },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helper: create a prescription
// ---------------------------------------------------------------------------

function createPrescription(
  overrides: Partial<UIPrescription> & { adaptations: UIPrescription["adaptations"] },
): UIPrescription {
  return {
    id: overrides.id ?? "rx-001",
    surfaceId: overrides.surfaceId ?? "search.results",
    mode: overrides.mode ?? "autoApply",
    latencyClass: overrides.latencyClass ?? "fast",
    contextLock: overrides.contextLock ?? {
      sequenceId: 1,
      capturedAt: "2024-01-01T00:00:00Z",
    },
    adaptations: overrides.adaptations,
    constraints: overrides.constraints ?? {
      expiresAt: "2025-01-01T00:00:00Z",
    },
    manifestVersion: overrides.manifestVersion ?? "1.0.0",
    audit: overrides.audit ?? {},
  };
}

// ---------------------------------------------------------------------------
// Quiet logger for tests
// ---------------------------------------------------------------------------

function createQuietLogger(): PrescriptionLogger {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PrescriptionEngine - Ranking", () => {
  it("reorders products according to prescribed order, preserving non-referenced order", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });
    engine.setProductOrder(["p1", "p2", "p3", "p4", "p5"]);

    const prescription = createPrescription({
      adaptations: [
        { type: "rank", orderedIds: ["p4", "p2"], reasonCode: "intent-match" },
      ],
    });

    const errors = engine.applyPrescriptions([prescription]);
    expect(errors).toHaveLength(0);

    const state = engine.getUIState();
    // Prescribed: p4, p2 first; then non-referenced: p1, p3, p5 in original order
    expect(state.searchResults.productOrder).toEqual(["p4", "p2", "p1", "p3", "p5"]);
  });

  it("preserves all products (no products lost or duplicated)", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });
    engine.setProductOrder(["a", "b", "c", "d"]);

    const prescription = createPrescription({
      adaptations: [
        { type: "rank", orderedIds: ["c", "a"], reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    const result = engine.getUIState().searchResults.productOrder;
    expect(result.sort()).toEqual(["a", "b", "c", "d"].sort());
  });

  it("ignores IDs in ranking that are not in the current product list", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });
    engine.setProductOrder(["p1", "p2", "p3"]);

    const prescription = createPrescription({
      adaptations: [
        { type: "rank", orderedIds: ["p99", "p2", "p1"], reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    const result = engine.getUIState().searchResults.productOrder;
    // p99 doesn't exist, so only p2, p1 from prescribed; then p3 non-referenced
    expect(result).toEqual(["p2", "p1", "p3"]);
  });
});

describe("PrescriptionEngine - Component Variant", () => {
  it("changes Product_Card variant for the surface", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      adaptations: [
        {
          type: "componentVariant",
          slotId: "card-slot",
          componentId: "product-card",
          variant: "compact",
          reasonCode: "mobile-context",
        },
      ],
    });

    const errors = engine.applyPrescriptions([prescription]);
    expect(errors).toHaveLength(0);
    expect(engine.getUIState().searchResults.variant).toBe("compact");
  });
});

describe("PrescriptionEngine - Filter Highlight", () => {
  it("highlights specified filters (max 3)", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      surfaceId: "filter.panel",
      adaptations: [
        {
          type: "filter",
          target: "filter-panel",
          visibleFilters: ["category", "price", "brand"],
          reasonCode: "intent-match",
        },
      ],
    });

    const errors = engine.applyPrescriptions([prescription]);
    expect(errors).toHaveLength(0);
    expect(engine.getUIState().filterPanel.highlightedFilterIds).toEqual([
      "category",
      "price",
      "brand",
    ]);
  });

  it("caps highlighted filters at 3 even if more are provided", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      surfaceId: "filter.panel",
      adaptations: [
        {
          type: "filter",
          target: "filter-panel",
          visibleFilters: ["a", "b", "c", "d", "e"],
          reasonCode: "test",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().filterPanel.highlightedFilterIds).toHaveLength(3);
  });
});

describe("PrescriptionEngine - Layout Density", () => {
  it("sets compact layout density", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      adaptations: [
        { type: "layout", layout: "compact", reasonCode: "density" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().searchResults.layoutDensity).toBe("compact");
  });

  it("sets expanded layout density", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      adaptations: [
        { type: "layout", layout: "expanded", reasonCode: "density" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().searchResults.layoutDensity).toBe("expanded");
  });

  it("defaults to standard for unknown layout types", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      adaptations: [
        { type: "layout", layout: "step-by-step", reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().searchResults.layoutDensity).toBe("standard");
  });
});

describe("PrescriptionEngine - Accessibility", () => {
  it("applies font scale", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      adaptations: [
        {
          type: "accessibility",
          setting: "fontScale",
          value: 1.5,
          reasonCode: "a11y",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().accessibility.fontScale).toBe(1.5);
  });

  it("applies high contrast", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      adaptations: [
        {
          type: "accessibility",
          setting: "contrast",
          value: "high",
          reasonCode: "a11y",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().accessibility.contrast).toBe("high");
  });

  it("applies reduced motion", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      adaptations: [
        {
          type: "accessibility",
          setting: "motion",
          value: "reduced",
          reasonCode: "a11y",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().accessibility.motionReduced).toBe(true);
  });
});

describe("PrescriptionEngine - Sequential Application", () => {
  it("applies prescriptions in ascending sequence ID order", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    // Two prescriptions: seq 5 changes to compact, seq 2 changes to comparison
    // Applied in order: seq 2 first (comparison), then seq 5 (compact)
    // Final state should be "compact"
    const rxA = createPrescription({
      id: "rx-a",
      contextLock: { sequenceId: 5, capturedAt: "2024-01-01T00:00:00Z" },
      adaptations: [
        {
          type: "componentVariant",
          slotId: "card-slot",
          componentId: "product-card",
          variant: "compact",
          reasonCode: "test",
        },
      ],
    });

    const rxB = createPrescription({
      id: "rx-b",
      contextLock: { sequenceId: 2, capturedAt: "2024-01-01T00:00:00Z" },
      adaptations: [
        {
          type: "componentVariant",
          slotId: "card-slot",
          componentId: "product-card",
          variant: "comparison",
          reasonCode: "test",
        },
      ],
    });

    // Pass them in reverse order — engine should sort by sequenceId
    const errors = engine.applyPrescriptions([rxA, rxB]);
    expect(errors).toHaveLength(0);

    // rxB (seq 2 → comparison) applied first, then rxA (seq 5 → compact)
    expect(engine.getUIState().searchResults.variant).toBe("compact");
  });

  it("records history in sequence order", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const rxA = createPrescription({
      id: "rx-a",
      contextLock: { sequenceId: 10, capturedAt: "2024-01-01T00:00:00Z" },
      adaptations: [
        { type: "layout", layout: "compact", reasonCode: "test" },
      ],
    });

    const rxB = createPrescription({
      id: "rx-b",
      contextLock: { sequenceId: 3, capturedAt: "2024-01-01T00:00:00Z" },
      adaptations: [
        { type: "layout", layout: "expanded", reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([rxA, rxB]);

    const history = engine.getPrescriptionState().history;
    expect(history[0].prescriptionId).toBe("rx-b"); // seq 3 first
    expect(history[1].prescriptionId).toBe("rx-a"); // seq 10 second
  });
});

describe("PrescriptionEngine - Rejection", () => {
  it("rejects prescription referencing undeclared surface", () => {
    const logger = createQuietLogger();
    const engine = new PrescriptionEngine(testManifest, { logger });

    const prescription = createPrescription({
      surfaceId: "unknown.surface",
      adaptations: [
        {
          type: "componentVariant",
          slotId: "slot",
          componentId: "product-card",
          variant: "compact",
          reasonCode: "test",
        },
      ],
    });

    const errors = engine.applyPrescriptions([prescription]);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toContain("unknown.surface");
    expect(logger.error).toHaveBeenCalled();
  });

  it("rejects prescription referencing undeclared component", () => {
    const logger = createQuietLogger();
    const engine = new PrescriptionEngine(testManifest, { logger });

    const prescription = createPrescription({
      surfaceId: "search.results",
      adaptations: [
        {
          type: "componentVariant",
          slotId: "slot",
          componentId: "nonexistent-component",
          variant: "compact",
          reasonCode: "test",
        },
      ],
    });

    const errors = engine.applyPrescriptions([prescription]);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toContain("nonexistent-component");
    expect(errors[0].componentId).toBe("nonexistent-component");
    expect(logger.error).toHaveBeenCalled();
  });

  it("rejects prescription referencing undeclared variant", () => {
    const logger = createQuietLogger();
    const engine = new PrescriptionEngine(testManifest, { logger });

    const prescription = createPrescription({
      surfaceId: "search.results",
      adaptations: [
        {
          type: "componentVariant",
          slotId: "slot",
          componentId: "product-card",
          variant: "nonexistent-variant",
          reasonCode: "test",
        },
      ],
    });

    const errors = engine.applyPrescriptions([prescription]);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toContain("nonexistent-variant");
    expect(errors[0].variant).toBe("nonexistent-variant");
    expect(logger.error).toHaveBeenCalled();
  });

  it("rejects prescription referencing undeclared filter target", () => {
    const logger = createQuietLogger();
    const engine = new PrescriptionEngine(testManifest, { logger });

    const prescription = createPrescription({
      surfaceId: "filter.panel",
      adaptations: [
        {
          type: "filter",
          target: "nonexistent-panel",
          visibleFilters: ["a", "b"],
          reasonCode: "test",
        },
      ],
    });

    const errors = engine.applyPrescriptions([prescription]);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toContain("nonexistent-panel");
    expect(logger.error).toHaveBeenCalled();
  });

  it("records rejected prescriptions in history", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      id: "rx-bad",
      surfaceId: "unknown.surface",
      adaptations: [
        {
          type: "componentVariant",
          slotId: "slot",
          componentId: "x",
          variant: "y",
          reasonCode: "test",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);

    const history = engine.getPrescriptionState().history;
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("rejected");
    expect(history[0].prescriptionId).toBe("rx-bad");
  });

  it("does not modify UI state when prescription is rejected", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const stateBefore = JSON.stringify(engine.getUIState());

    const prescription = createPrescription({
      surfaceId: "unknown.surface",
      adaptations: [
        {
          type: "componentVariant",
          slotId: "slot",
          componentId: "x",
          variant: "y",
          reasonCode: "test",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(JSON.stringify(engine.getUIState())).toBe(stateBefore);
  });
});

describe("PrescriptionEngine - Undo", () => {
  it("restores previous state on undo", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });
    engine.setProductOrder(["p1", "p2", "p3"]);

    const prescription = createPrescription({
      id: "rx-rank",
      adaptations: [
        { type: "rank", orderedIds: ["p3", "p1"], reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    // After ranking: p3, p1, p2
    expect(engine.getUIState().searchResults.productOrder).toEqual(["p3", "p1", "p2"]);

    // Undo
    const result = engine.undo("rx-rank");
    expect(result).toBe(true);
    expect(engine.getUIState().searchResults.productOrder).toEqual(["p1", "p2", "p3"]);
  });

  it("restores variant on undo", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    expect(engine.getUIState().searchResults.variant).toBe("standard");

    const prescription = createPrescription({
      id: "rx-variant",
      adaptations: [
        {
          type: "componentVariant",
          slotId: "slot",
          componentId: "product-card",
          variant: "image-lead",
          reasonCode: "test",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().searchResults.variant).toBe("image-lead");

    engine.undo("rx-variant");
    expect(engine.getUIState().searchResults.variant).toBe("standard");
  });

  it("restores filter highlight on undo", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      id: "rx-filter",
      surfaceId: "filter.panel",
      adaptations: [
        {
          type: "filter",
          target: "filter-panel",
          visibleFilters: ["weight", "battery"],
          reasonCode: "test",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().filterPanel.highlightedFilterIds).toEqual([
      "weight",
      "battery",
    ]);

    engine.undo("rx-filter");
    expect(engine.getUIState().filterPanel.highlightedFilterIds).toEqual([]);
  });

  it("restores accessibility settings on undo", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      id: "rx-a11y",
      adaptations: [
        {
          type: "accessibility",
          setting: "fontScale",
          value: 2.0,
          reasonCode: "a11y",
        },
      ],
    });

    engine.applyPrescriptions([prescription]);
    expect(engine.getUIState().accessibility.fontScale).toBe(2.0);

    engine.undo("rx-a11y");
    expect(engine.getUIState().accessibility.fontScale).toBe(1.0);
  });

  it("returns false for non-existent prescription ID", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    expect(engine.undo("nonexistent")).toBe(false);
  });

  it("returns false for already-undone prescription", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      id: "rx-once",
      adaptations: [
        { type: "layout", layout: "compact", reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    engine.undo("rx-once");
    expect(engine.undo("rx-once")).toBe(false);
  });

  it("marks prescription status as undone", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      id: "rx-status",
      adaptations: [
        { type: "layout", layout: "expanded", reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    engine.undo("rx-status");

    const applied = engine.getPrescriptionState().activePrescriptions.get("rx-status");
    expect(applied?.status).toBe("undone");
  });
});

describe("PrescriptionEngine - Expire", () => {
  it("marks prescription as expired", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const prescription = createPrescription({
      id: "rx-exp",
      adaptations: [
        { type: "layout", layout: "compact", reasonCode: "test" },
      ],
    });

    engine.applyPrescriptions([prescription]);
    const result = engine.expire("rx-exp");
    expect(result).toBe(true);

    const applied = engine.getPrescriptionState().activePrescriptions.get("rx-exp");
    expect(applied?.status).toBe("expired");
  });

  it("returns false for non-existent prescription", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });
    expect(engine.expire("nonexistent")).toBe(false);
  });
});

describe("PrescriptionEngine - Mixed Prescriptions", () => {
  it("applies valid prescriptions and rejects invalid in the same batch", () => {
    const engine = new PrescriptionEngine(testManifest, {
      logger: createQuietLogger(),
    });

    const valid = createPrescription({
      id: "rx-valid",
      contextLock: { sequenceId: 1, capturedAt: "2024-01-01T00:00:00Z" },
      adaptations: [
        { type: "layout", layout: "compact", reasonCode: "test" },
      ],
    });

    const invalid = createPrescription({
      id: "rx-invalid",
      surfaceId: "unknown.surface",
      contextLock: { sequenceId: 2, capturedAt: "2024-01-01T00:00:00Z" },
      adaptations: [
        {
          type: "componentVariant",
          slotId: "slot",
          componentId: "x",
          variant: "y",
          reasonCode: "test",
        },
      ],
    });

    const errors = engine.applyPrescriptions([valid, invalid]);
    expect(errors).toHaveLength(1);
    expect(errors[0].prescriptionId).toBe("rx-invalid");

    // Valid one was applied
    expect(engine.getUIState().searchResults.layoutDensity).toBe("compact");
  });
});
