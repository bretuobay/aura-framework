import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileAttributesView } from "../../../src/components/ProfileAttributesView";
import type { ProfileAttribute } from "@aura/protocol";

function makeAttribute(overrides: Partial<ProfileAttribute> = {}): ProfileAttribute {
  return {
    id: "attr-1",
    key: "preferredTheme",
    value: "dark",
    provenance: "explicit",
    confidence: 0.9,
    dataClass: "behavioral",
    ...overrides,
  };
}

describe("ProfileAttributesView", () => {
  describe("empty state (Req 7.6)", () => {
    it("renders empty state when no attributes", () => {
      const { container } = render(<ProfileAttributesView attributes={[]} />);
      expect(container.textContent).toContain("No profile attributes recorded");
    });

    it("renders empty state when both arrays are empty", () => {
      const { container } = render(
        <ProfileAttributesView attributes={[]} simulatedAttributes={[]} />,
      );
      expect(container.textContent).toContain("No profile attributes recorded");
    });
  });

  describe("displays attribute fields (Req 7.1)", () => {
    it("displays key, value, confidence, dataClass for each attribute", () => {
      const attr = makeAttribute({
        key: "language",
        value: "en-US",
        confidence: 0.85,
        dataClass: "demographic",
      });
      const { container } = render(<ProfileAttributesView attributes={[attr]} />);
      expect(container.textContent).toContain("language");
      expect(container.textContent).toContain("en-US");
      expect(container.textContent).toContain("85%");
      expect(container.textContent).toContain("demographic");
    });

    it("displays expiresAt field when present", () => {
      const futureDate = "2030-01-01T00:00:00.000Z";
      const attr = makeAttribute({ expiresAt: futureDate });
      const { container } = render(<ProfileAttributesView attributes={[attr]} />);
      expect(container.textContent).toContain("Expires At");
      expect(container.textContent).toContain(futureDate);
    });

    it("handles object values by JSON stringifying them", () => {
      const attr = makeAttribute({ value: { nested: true } });
      const { container } = render(<ProfileAttributesView attributes={[attr]} />);
      expect(container.textContent).toContain('{"nested":true}');
    });
  });

  describe("provenance indicators (Req 7.2)", () => {
    it("shows ✓ Explicit badge for explicit provenance", () => {
      const attr = makeAttribute({ provenance: "explicit" });
      render(<ProfileAttributesView attributes={[attr]} />);
      const badge = screen.getByTestId("provenance-badge");
      expect(badge.textContent).toContain("Explicit");
      expect(badge.textContent).toContain("✓");
    });

    it("shows 🔮 Inferred badge for inferred provenance", () => {
      const attr = makeAttribute({ provenance: "inferred" });
      render(<ProfileAttributesView attributes={[attr]} />);
      const badge = screen.getByTestId("provenance-badge");
      expect(badge.textContent).toContain("Inferred");
      expect(badge.textContent).toContain("🔮");
    });

    it("shows 📥 Imported badge for imported provenance", () => {
      const attr = makeAttribute({ provenance: "imported" });
      render(<ProfileAttributesView attributes={[attr]} />);
      const badge = screen.getByTestId("provenance-badge");
      expect(badge.textContent).toContain("Imported");
      expect(badge.textContent).toContain("📥");
    });
  });

  describe("low confidence indicator (Req 7.3)", () => {
    it("shows low confidence indicator when confidence < 0.5", () => {
      const attr = makeAttribute({ confidence: 0.3 });
      render(<ProfileAttributesView attributes={[attr]} />);
      const badge = screen.getByTestId("low-confidence-badge");
      expect(badge.textContent).toContain("Low confidence");
      expect(badge.textContent).toContain("⚠️");
    });

    it("does not show low confidence indicator when confidence >= 0.5", () => {
      const attr = makeAttribute({ confidence: 0.5 });
      render(<ProfileAttributesView attributes={[attr]} />);
      expect(screen.queryByTestId("low-confidence-badge")).toBeNull();
    });

    it("does not show low confidence indicator when confidence is exactly 0.5", () => {
      const attr = makeAttribute({ confidence: 0.5 });
      render(<ProfileAttributesView attributes={[attr]} />);
      expect(screen.queryByTestId("low-confidence-badge")).toBeNull();
    });
  });

  describe("expired indicator (Req 7.4)", () => {
    it("shows expired indicator when expiresAt is in the past", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const attr = makeAttribute({ expiresAt: pastDate });
      render(<ProfileAttributesView attributes={[attr]} />);
      const badge = screen.getByTestId("expired-badge");
      expect(badge.textContent).toContain("Expired");
      expect(badge.textContent).toContain("⏰");
    });

    it("does not show expired indicator when expiresAt is in the future", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const attr = makeAttribute({ expiresAt: futureDate });
      render(<ProfileAttributesView attributes={[attr]} />);
      expect(screen.queryByTestId("expired-badge")).toBeNull();
    });

    it("does not show expired indicator when expiresAt is not set", () => {
      const attr = makeAttribute({ expiresAt: undefined });
      render(<ProfileAttributesView attributes={[attr]} />);
      expect(screen.queryByTestId("expired-badge")).toBeNull();
    });
  });

  describe("simulated attributes (Req 7.5)", () => {
    it("renders simulated attributes with simulation badge", () => {
      const simAttr = makeAttribute({ id: "sim-1", key: "simKey" });
      render(<ProfileAttributesView attributes={[]} simulatedAttributes={[simAttr]} />);
      const badge = screen.getByTestId("simulated-badge");
      expect(badge.textContent).toContain("Simulated");
      expect(badge.textContent).toContain("🧪");
    });

    it("renders both real and simulated attributes separately", () => {
      const realAttr = makeAttribute({ id: "real-1", key: "realKey" });
      const simAttr = makeAttribute({ id: "sim-1", key: "simKey" });
      const { container } = render(
        <ProfileAttributesView attributes={[realAttr]} simulatedAttributes={[simAttr]} />,
      );
      expect(container.textContent).toContain("Profile Attributes (1)");
      expect(container.textContent).toContain("Simulated Attributes (1)");
      expect(container.textContent).toContain("realKey");
      expect(container.textContent).toContain("simKey");
    });

    it("simulated attributes do not have simulated badge in real attributes section", () => {
      const realAttr = makeAttribute({ id: "real-1", key: "realKey" });
      render(<ProfileAttributesView attributes={[realAttr]} simulatedAttributes={[]} />);
      expect(screen.queryByTestId("simulated-badge")).toBeNull();
    });
  });
});
