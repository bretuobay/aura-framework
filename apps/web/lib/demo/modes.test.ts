/**
 * Unit tests for the DemoModeManager.
 *
 * Tests cover:
 * - Default mode initialization
 * - Mode switching without page reload
 * - AI unavailability fallback with notification
 * - getAvailableModes listing
 * - Subscriber notification
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8, 7.9
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DemoModeManager,
  DEFAULT_MODE,
  ALL_MODES,
  MODE_LABELS,
  isValidMode,
} from "./modes";
import { DEMO_MODE_CONFIGS } from "@/lib/types/demo";

// Mock the AI provider availability checks
vi.mock("@/lib/ai/provider", () => ({
  isLLMAvailable: vi.fn(() => false),
  isSLMAvailable: vi.fn(() => false),
}));

// Mock the flags module
vi.mock("@/lib/config/flags", () => ({
  getFlags: vi.fn(() => ({
    USE_REAL_LLM: false,
    USE_REAL_SLM: false,
    SIMULATE_ADAPTATIONS: false,
    SHOW_DEVTOOLS: false,
    ENABLE_EXPLANATIONS: true,
    ENABLE_CONSENT: true,
  })),
}));

import { isLLMAvailable, isSLMAvailable } from "@/lib/ai/provider";

const mockIsLLMAvailable = vi.mocked(isLLMAvailable);
const mockIsSLMAvailable = vi.mocked(isSLMAvailable);

describe("DemoModeManager", () => {
  let manager: DemoModeManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLLMAvailable.mockReturnValue(false);
    mockIsSLMAvailable.mockReturnValue(false);
    manager = new DemoModeManager();
  });

  describe("initialization", () => {
    it("defaults to 'rules-only' mode (Requirement 7.8)", () => {
      expect(manager.getCurrentMode()).toBe("rules-only");
    });

    it("returns the correct default config", () => {
      expect(manager.getCurrentConfig()).toEqual(
        DEMO_MODE_CONFIGS["rules-only"]
      );
    });

    it("accepts a custom initial mode", () => {
      const custom = new DemoModeManager("developer");
      expect(custom.getCurrentMode()).toBe("developer");
    });
  });

  describe("switchMode", () => {
    it("switches to 'rules-only' successfully", () => {
      const result = manager.switchMode("rules-only");
      expect(result.success).toBe(true);
      expect(result.activeMode).toBe("rules-only");
      expect(result.didFallback).toBe(false);
      expect(result.notification).toBeUndefined();
    });

    it("switches to 'demo-simulation' without AI requirement", () => {
      const result = manager.switchMode("demo-simulation");
      expect(result.success).toBe(true);
      expect(result.activeMode).toBe("demo-simulation");
      expect(result.config.simulate).toBe(true);
      expect(result.didFallback).toBe(false);
    });

    it("switches to 'developer' without AI requirement", () => {
      const result = manager.switchMode("developer");
      expect(result.success).toBe(true);
      expect(result.activeMode).toBe("developer");
      expect(result.config.showDevtools).toBe(true);
      expect(result.didFallback).toBe(false);
    });

    it("falls back to 'rules-only' when SLM is unavailable (Requirement 7.9)", () => {
      mockIsSLMAvailable.mockReturnValue(false);

      const result = manager.switchMode("slm-enabled");
      expect(result.success).toBe(true);
      expect(result.activeMode).toBe("rules-only");
      expect(result.didFallback).toBe(true);
      expect(result.notification).toContain("SLM is unavailable");
      expect(result.notification).toContain("Rules Only");
    });

    it("falls back to 'rules-only' when LLM is unavailable (Requirement 7.9)", () => {
      mockIsSLMAvailable.mockReturnValue(true); // SLM available but LLM not
      mockIsLLMAvailable.mockReturnValue(false);

      const result = manager.switchMode("llm-enabled");
      expect(result.success).toBe(true);
      expect(result.activeMode).toBe("rules-only");
      expect(result.didFallback).toBe(true);
      expect(result.notification).toContain("LLM is unavailable");
    });

    it("switches to 'slm-enabled' when SLM is available", () => {
      mockIsSLMAvailable.mockReturnValue(true);

      const result = manager.switchMode("slm-enabled");
      expect(result.success).toBe(true);
      expect(result.activeMode).toBe("slm-enabled");
      expect(result.didFallback).toBe(false);
      expect(result.config.useSLM).toBe(true);
    });

    it("switches to 'llm-enabled' when both SLM and LLM are available", () => {
      mockIsSLMAvailable.mockReturnValue(true);
      mockIsLLMAvailable.mockReturnValue(true);

      const result = manager.switchMode("llm-enabled");
      expect(result.success).toBe(true);
      expect(result.activeMode).toBe("llm-enabled");
      expect(result.didFallback).toBe(false);
      expect(result.config.useSLM).toBe(true);
      expect(result.config.useLLM).toBe(true);
    });

    it("rejects an invalid mode string", () => {
      const result = manager.switchMode("invalid-mode" as any);
      expect(result.success).toBe(false);
      expect(result.activeMode).toBe("rules-only"); // stays at current
      expect(result.notification).toContain("Unknown mode");
    });

    it("updates getCurrentMode after successful switch", () => {
      manager.switchMode("developer");
      expect(manager.getCurrentMode()).toBe("developer");
    });

    it("updates getCurrentConfig after successful switch", () => {
      manager.switchMode("demo-simulation");
      expect(manager.getCurrentConfig()).toEqual(
        DEMO_MODE_CONFIGS["demo-simulation"]
      );
    });
  });

  describe("getAvailableModes", () => {
    it("returns all 5 modes", () => {
      const modes = manager.getAvailableModes();
      expect(modes).toHaveLength(5);
    });

    it("marks rules-only, demo-simulation, and developer as always available", () => {
      const modes = manager.getAvailableModes();
      const alwaysAvailable = modes.filter(
        (m) =>
          m.mode === "rules-only" ||
          m.mode === "demo-simulation" ||
          m.mode === "developer"
      );
      expect(alwaysAvailable.every((m) => m.available)).toBe(true);
    });

    it("marks slm-enabled as unavailable when SLM is not configured", () => {
      mockIsSLMAvailable.mockReturnValue(false);
      const modes = manager.getAvailableModes();
      const slmMode = modes.find((m) => m.mode === "slm-enabled");
      expect(slmMode?.available).toBe(false);
      expect(slmMode?.unavailableReason).toBeDefined();
    });

    it("marks llm-enabled as unavailable when LLM is not configured", () => {
      mockIsLLMAvailable.mockReturnValue(false);
      const modes = manager.getAvailableModes();
      const llmMode = modes.find((m) => m.mode === "llm-enabled");
      expect(llmMode?.available).toBe(false);
      expect(llmMode?.unavailableReason).toBeDefined();
    });

    it("marks slm-enabled as available when SLM is configured", () => {
      mockIsSLMAvailable.mockReturnValue(true);
      const modes = manager.getAvailableModes();
      const slmMode = modes.find((m) => m.mode === "slm-enabled");
      expect(slmMode?.available).toBe(true);
    });

    it("includes labels and descriptions for all modes", () => {
      const modes = manager.getAvailableModes();
      for (const m of modes) {
        expect(m.label).toBeTruthy();
        expect(m.description).toBeTruthy();
      }
    });
  });

  describe("reset", () => {
    it("returns to default mode", () => {
      manager.switchMode("developer");
      const result = manager.reset();
      expect(result.activeMode).toBe(DEFAULT_MODE);
      expect(manager.getCurrentMode()).toBe(DEFAULT_MODE);
    });
  });

  describe("subscribe", () => {
    it("notifies listeners on mode change", () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.switchMode("developer");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          activeMode: "developer",
          success: true,
        })
      );
    });

    it("unsubscribe stops notifications", () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();
      manager.switchMode("developer");

      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      manager.subscribe(listener1);
      manager.subscribe(listener2);

      manager.switchMode("developer");

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("isValidMode", () => {
    it("returns true for all valid modes", () => {
      for (const mode of ALL_MODES) {
        expect(isValidMode(mode)).toBe(true);
      }
    });

    it("returns false for invalid strings", () => {
      expect(isValidMode("invalid")).toBe(false);
      expect(isValidMode("")).toBe(false);
      expect(isValidMode("RULES-ONLY")).toBe(false);
    });
  });

  describe("constants", () => {
    it("DEFAULT_MODE is 'rules-only'", () => {
      expect(DEFAULT_MODE).toBe("rules-only");
    });

    it("ALL_MODES contains exactly 5 modes", () => {
      expect(ALL_MODES).toHaveLength(5);
    });

    it("MODE_LABELS has entries for all modes", () => {
      for (const mode of ALL_MODES) {
        expect(MODE_LABELS[mode]).toBeTruthy();
      }
    });
  });
});
