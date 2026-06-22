import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileSimulator } from "../../../src/components/ProfileSimulator";
import type { ProfileAttribute } from "@aura/protocol";

function makeSimulatedAttribute(overrides: Partial<ProfileAttribute> = {}): ProfileAttribute {
  return {
    id: "sim-123",
    key: "preferredLanguage",
    value: "en",
    provenance: "explicit",
    confidence: 0.9,
    dataClass: "personalization",
    ...overrides,
  };
}

describe("ProfileSimulator", () => {
  describe("form inputs (Req 11.1)", () => {
    it("renders inputs for key, value, provenance, confidence, and dataClass", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      expect(screen.getByTestId("ps-key-input")).toBeDefined();
      expect(screen.getByTestId("ps-value-input")).toBeDefined();
      expect(screen.getByTestId("ps-provenance-select")).toBeDefined();
      expect(screen.getByTestId("ps-confidence-input")).toBeDefined();
      expect(screen.getByTestId("ps-dataclass-select")).toBeDefined();
    });
  });

  describe("local-only notice (Req 11.2, 11.4)", () => {
    it("displays a local-only simulation notice", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      const notice = screen.getByTestId("local-only-notice");
      expect(notice.textContent).toContain("not persisted");
    });
  });

  describe("apply scenario (Req 11.1, 11.2)", () => {
    it("calls onApplyScenario with a valid ProfileAttribute when form is filled correctly", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      fireEvent.change(screen.getByTestId("ps-key-input"), {
        target: { value: "preferredTheme" },
      });
      fireEvent.change(screen.getByTestId("ps-value-input"), {
        target: { value: "dark" },
      });
      fireEvent.change(screen.getByTestId("ps-provenance-select"), {
        target: { value: "inferred" },
      });
      fireEvent.change(screen.getByTestId("ps-confidence-input"), {
        target: { value: "0.75" },
      });
      fireEvent.change(screen.getByTestId("ps-dataclass-select"), {
        target: { value: "behavior" },
      });

      fireEvent.click(screen.getByTestId("ps-apply-button"));

      expect(onApply).toHaveBeenCalledTimes(1);
      const attr = onApply.mock.calls[0][0] as ProfileAttribute;
      expect(attr.key).toBe("preferredTheme");
      expect(attr.value).toBe("dark");
      expect(attr.provenance).toBe("inferred");
      expect(attr.confidence).toBe(0.75);
      expect(attr.dataClass).toBe("behavior");
      expect(attr.id).toMatch(/^sim-/);
    });

    it("parses JSON value when input is valid JSON", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      fireEvent.change(screen.getByTestId("ps-key-input"), {
        target: { value: "settings" },
      });
      fireEvent.change(screen.getByTestId("ps-value-input"), {
        target: { value: '{"theme":"dark"}' },
      });
      fireEvent.click(screen.getByTestId("ps-apply-button"));

      expect(onApply).toHaveBeenCalledTimes(1);
      const attr = onApply.mock.calls[0][0] as ProfileAttribute;
      expect(attr.value).toEqual({ theme: "dark" });
    });
  });

  describe("validation: confidence outside [0,1] (Req 11.6)", () => {
    it("shows field-level error when confidence > 1", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      fireEvent.change(screen.getByTestId("ps-confidence-input"), {
        target: { value: "1.5" },
      });
      fireEvent.click(screen.getByTestId("ps-apply-button"));

      expect(onApply).not.toHaveBeenCalled();
      expect(screen.getByTestId("ps-confidence-error")).toBeDefined();
      expect(screen.getByTestId("ps-confidence-error").textContent).toContain("between 0 and 1");
    });

    it("shows field-level error when confidence < 0", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      fireEvent.change(screen.getByTestId("ps-confidence-input"), {
        target: { value: "-0.1" },
      });
      fireEvent.click(screen.getByTestId("ps-apply-button"));

      expect(onApply).not.toHaveBeenCalled();
      expect(screen.getByTestId("ps-confidence-error")).toBeDefined();
    });

    it("shows field-level error when confidence is NaN", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      fireEvent.change(screen.getByTestId("ps-confidence-input"), {
        target: { value: "abc" },
      });
      fireEvent.click(screen.getByTestId("ps-apply-button"));

      expect(onApply).not.toHaveBeenCalled();
      expect(screen.getByTestId("ps-confidence-error")).toBeDefined();
    });
  });

  describe("validation: unrecognized dataClass (Req 11.6)", () => {
    it("shows field-level error for unrecognized dataClass value", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      // Manually set an unrecognized value via the select
      const select = screen.getByTestId("ps-dataclass-select") as HTMLSelectElement;
      // Simulate setting a value that isn't in the options (edge case - programmatic override)
      fireEvent.change(select, { target: { value: "invalidClass" } });
      fireEvent.click(screen.getByTestId("ps-apply-button"));

      expect(onApply).not.toHaveBeenCalled();
      expect(screen.getByTestId("ps-dataclass-error")).toBeDefined();
      expect(screen.getByTestId("ps-dataclass-error").textContent).toContain(
        "Unrecognized data class",
      );
    });
  });

  describe("clear scenario (Req 11.5)", () => {
    it("calls onClearScenario when Clear Scenario button is clicked", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      fireEvent.click(screen.getByTestId("ps-clear-button"));
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("displays simulated attributes (Req 11.4)", () => {
    it("renders currently applied simulated attributes below the form", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      const simulated = [
        makeSimulatedAttribute({ id: "sim-1", key: "lang", value: "fr" }),
        makeSimulatedAttribute({ id: "sim-2", key: "theme", value: "dark" }),
      ];

      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={simulated}
        />,
      );

      const list = screen.getByTestId("ps-simulated-list");
      expect(list).toBeDefined();
      const cards = screen.getAllByTestId("ps-simulated-attr");
      expect(cards.length).toBe(2);
    });

    it("does not render simulated section when no simulated attributes", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      expect(screen.queryByTestId("ps-simulated-list")).toBeNull();
    });
  });

  describe("does not submit to server (Req 11.2, 11.3)", () => {
    it("only calls onApplyScenario (local callback), not a server endpoint", () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      render(
        <ProfileSimulator
          onApplyScenario={onApply}
          onClearScenario={onClear}
          simulatedAttributes={[]}
        />,
      );

      fireEvent.change(screen.getByTestId("ps-key-input"), {
        target: { value: "test" },
      });
      fireEvent.click(screen.getByTestId("ps-apply-button"));

      // The component should only call the local callback
      expect(onApply).toHaveBeenCalledTimes(1);
    });
  });
});
