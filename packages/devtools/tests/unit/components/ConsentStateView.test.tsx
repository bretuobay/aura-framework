import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ConsentStateView } from "../../../src/components/ConsentStateView";
import type { ConsentProfile } from "@aura/protocol";

const ALL_DATA_CLASSES = [
  "behavior",
  "personalization",
  "accessibility",
  "approximateLocation",
  "health",
  "education",
  "demographics",
  "emotion",
  "sensitiveInference",
  "cloudModelUse",
  "aggregation",
  "retention",
] as const;

describe("ConsentStateView", () => {
  describe("displays all standard DataClass keys (Req 6.1)", () => {
    it("renders all 12 standard DataClass keys", () => {
      const consentProfile: ConsentProfile = {};
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      const items = container.querySelectorAll("li");
      expect(items.length).toBe(12);

      for (const dc of ALL_DATA_CLASSES) {
        expect(container.textContent).toContain(dc);
      }
    });
  });

  describe("on/off indicator (Req 6.2)", () => {
    it("shows checkmark for enabled data classes", () => {
      const consentProfile: ConsentProfile = {
        behavior: true,
        personalization: true,
      };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      const behaviorItem = container.querySelector(
        '[data-testid="consent-behavior"]'
      ) as HTMLElement;
      expect(behaviorItem).not.toBeNull();
      expect(behaviorItem.textContent).toContain("✓");
    });

    it("shows X for disabled data classes", () => {
      const consentProfile: ConsentProfile = {
        behavior: false,
      };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      const behaviorItem = container.querySelector(
        '[data-testid="consent-behavior"]'
      ) as HTMLElement;
      expect(behaviorItem).not.toBeNull();
      expect(behaviorItem.textContent).toContain("✗");
    });
  });

  describe("visually highlights disabled classes (Req 6.3)", () => {
    it("uses red/disabled styling for false values", () => {
      const consentProfile: ConsentProfile = {
        health: false,
      };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      const healthItem = container.querySelector(
        '[data-testid="consent-health"]'
      ) as HTMLElement;
      expect(healthItem).not.toBeNull();
      expect(healthItem.style.backgroundColor).toBe("rgb(252, 232, 230)");
      expect(healthItem.style.borderColor).toBe("rgb(245, 198, 203)");
    });

    it("uses green/enabled styling for true values", () => {
      const consentProfile: ConsentProfile = {
        health: true,
      };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      const healthItem = container.querySelector(
        '[data-testid="consent-health"]'
      ) as HTMLElement;
      expect(healthItem).not.toBeNull();
      expect(healthItem.style.backgroundColor).toBe("rgb(230, 244, 234)");
      expect(healthItem.style.borderColor).toBe("rgb(168, 218, 181)");
    });
  });

  describe("consent display accuracy (Req 6.4)", () => {
    it("renders correct on/off state matching the consentProfile input", () => {
      const consentProfile: ConsentProfile = {
        behavior: true,
        personalization: false,
        accessibility: true,
        health: false,
      };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      // Check enabled classes show checkmark
      const behaviorItem = container.querySelector(
        '[data-testid="consent-behavior"]'
      ) as HTMLElement;
      expect(behaviorItem.textContent).toContain("✓");

      const accessibilityItem = container.querySelector(
        '[data-testid="consent-accessibility"]'
      ) as HTMLElement;
      expect(accessibilityItem.textContent).toContain("✓");

      // Check disabled classes show X
      const personalizationItem = container.querySelector(
        '[data-testid="consent-personalization"]'
      ) as HTMLElement;
      expect(personalizationItem.textContent).toContain("✗");

      const healthItem = container.querySelector(
        '[data-testid="consent-health"]'
      ) as HTMLElement;
      expect(healthItem.textContent).toContain("✗");
    });
  });

  describe("missing keys treated as false (Req 6.5)", () => {
    it("treats missing DataClass keys as disabled (false)", () => {
      const consentProfile: ConsentProfile = {
        behavior: true,
      };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      // behavior should be enabled
      const behaviorItem = container.querySelector(
        '[data-testid="consent-behavior"]'
      ) as HTMLElement;
      expect(behaviorItem.textContent).toContain("✓");

      // All other keys should be disabled since they're missing
      const healthItem = container.querySelector(
        '[data-testid="consent-health"]'
      ) as HTMLElement;
      expect(healthItem.textContent).toContain("✗");

      const educationItem = container.querySelector(
        '[data-testid="consent-education"]'
      ) as HTMLElement;
      expect(educationItem.textContent).toContain("✗");
    });

    it("shows all keys as disabled when consentProfile is empty", () => {
      const consentProfile: ConsentProfile = {};
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      const items = container.querySelectorAll("li");
      for (const item of Array.from(items)) {
        expect(item.textContent).toContain("✗");
      }
    });
  });

  describe("accessibility", () => {
    it("uses semantic HTML with section and list elements", () => {
      const consentProfile: ConsentProfile = { behavior: true };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      expect(container.querySelector("section")).not.toBeNull();
      expect(container.querySelector("ul")).not.toBeNull();
      expect(container.querySelectorAll("li").length).toBe(12);
    });

    it("has an aria-label on the section", () => {
      const consentProfile: ConsentProfile = {};
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );
      const section = container.querySelector(
        'section[aria-label="Consent state"]'
      );
      expect(section).not.toBeNull();
    });

    it("each list item has an aria-label indicating the consent state", () => {
      const consentProfile: ConsentProfile = {
        behavior: true,
        health: false,
      };
      const { container } = render(
        <ConsentStateView consentProfile={consentProfile} />
      );

      const behaviorItem = container.querySelector(
        '[data-testid="consent-behavior"]'
      ) as HTMLElement;
      expect(behaviorItem.getAttribute("aria-label")).toBe(
        "behavior: enabled"
      );

      const healthItem = container.querySelector(
        '[data-testid="consent-health"]'
      ) as HTMLElement;
      expect(healthItem.getAttribute("aria-label")).toBe("health: disabled");
    });
  });
});
