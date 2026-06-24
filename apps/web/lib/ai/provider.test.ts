/**
 * Unit tests for the AI Integration Layer.
 *
 * Tests the fallback chain, timeout handling, and flag-based behavior
 * without making real HTTP requests.
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.5, 15.6, 11.2, 11.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  requestAdaptation,
  getAIConfig,
  isLLMAvailable,
  isSLMAvailable,
  AI_TIMEOUTS,
  type AdaptationContext,
  type AdaptationDecision,
} from "./provider";

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

// Get mocked getFlags for per-test control
import { getFlags } from "@/lib/config/flags";
const mockGetFlags = vi.mocked(getFlags);

describe("AI Integration Layer", () => {
  const baseContext: AdaptationContext = {
    surfaceId: "search.results",
    query: "laptop",
    sessionId: "session-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_BASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAIConfig", () => {
    it("returns config with flags and env vars", () => {
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: true,
        USE_REAL_SLM: false,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });
      process.env.OPENROUTER_API_KEY = "test-key";
      process.env.OPENROUTER_MODEL = "test-model";
      process.env.OPENROUTER_BASE_URL = "https://custom.api/v1";

      const config = getAIConfig();

      expect(config.llmEnabled).toBe(true);
      expect(config.slmEnabled).toBe(false);
      expect(config.apiKey).toBe("test-key");
      expect(config.model).toBe("test-model");
      expect(config.baseUrl).toBe("https://custom.api/v1");
    });

    it("uses default values when env vars are not set", () => {
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: false,
        USE_REAL_SLM: false,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });

      const config = getAIConfig();

      expect(config.apiKey).toBe("");
      expect(config.model).toBe("openai/gpt-4o");
      expect(config.baseUrl).toBe("https://openrouter.ai/api/v1");
    });
  });

  describe("isLLMAvailable", () => {
    it("returns true when LLM is enabled and API key is configured", () => {
      expect(
        isLLMAvailable({ llmEnabled: true, slmEnabled: false, apiKey: "key", model: "", baseUrl: "" })
      ).toBe(true);
    });

    it("returns false when LLM is enabled but API key is empty", () => {
      expect(
        isLLMAvailable({ llmEnabled: true, slmEnabled: false, apiKey: "", model: "", baseUrl: "" })
      ).toBe(false);
    });

    it("returns false when LLM is disabled", () => {
      expect(
        isLLMAvailable({ llmEnabled: false, slmEnabled: false, apiKey: "key", model: "", baseUrl: "" })
      ).toBe(false);
    });
  });

  describe("isSLMAvailable", () => {
    it("returns true when SLM is enabled and model is configured", () => {
      expect(
        isSLMAvailable({ llmEnabled: false, slmEnabled: true, apiKey: "", model: "model", baseUrl: "" })
      ).toBe(true);
    });

    it("returns false when SLM is enabled but model is empty", () => {
      expect(
        isSLMAvailable({ llmEnabled: false, slmEnabled: true, apiKey: "", model: "", baseUrl: "" })
      ).toBe(false);
    });

    it("returns false when SLM is disabled", () => {
      expect(
        isSLMAvailable({ llmEnabled: false, slmEnabled: false, apiKey: "", model: "model", baseUrl: "" })
      ).toBe(false);
    });
  });

  describe("AI_TIMEOUTS", () => {
    it("LLM timeout is 10 seconds", () => {
      expect(AI_TIMEOUTS.LLM).toBe(10_000);
    });

    it("SLM timeout is 3 seconds", () => {
      expect(AI_TIMEOUTS.SLM).toBe(3_000);
    });

    it("Fallback delivery is 2 seconds", () => {
      expect(AI_TIMEOUTS.FALLBACK_DELIVERY).toBe(2_000);
    });
  });

  describe("requestAdaptation — Rules Only (both flags false)", () => {
    beforeEach(() => {
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: false,
        USE_REAL_SLM: false,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });
    });

    it("returns rules-based decision when both flags are false", async () => {
      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("rules");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.reasoning).toBeDefined();
    });

    it("does not issue any HTTP requests when flags are false", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await requestAdaptation(baseContext);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("detects comparison intent in query", async () => {
      const result = await requestAdaptation({
        ...baseContext,
        query: "laptop vs desktop comparison",
      });

      expect(result.decisionSource).toBe("rules");
      expect(result.variant).toBe("comparison");
    });

    it("detects price-sensitive intent in query", async () => {
      const result = await requestAdaptation({
        ...baseContext,
        query: "cheap budget laptop",
      });

      expect(result.decisionSource).toBe("rules");
      expect(result.highlightedFilters).toContain("price");
    });

    it("detects mobile context and applies compact layout", async () => {
      const result = await requestAdaptation({
        ...baseContext,
        contextModel: { deviceType: "mobile" },
      });

      expect(result.decisionSource).toBe("rules");
      expect(result.variant).toBe("compact");
      expect(result.layoutDensity).toBe("compact");
    });

    it("detects travel intent and suggests comparison with relevant filters", async () => {
      const result = await requestAdaptation({
        ...baseContext,
        query: "lightweight laptop for travel",
      });

      expect(result.decisionSource).toBe("rules");
      expect(result.variant).toBe("comparison");
      expect(result.highlightedFilters).toContain("weight");
      expect(result.highlightedFilters).toContain("battery");
    });
  });

  describe("requestAdaptation — LLM enabled but unavailable", () => {
    beforeEach(() => {
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: true,
        USE_REAL_SLM: false,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });
    });

    it("falls back to rules when API key is missing", async () => {
      // API key not set (empty string)
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("rules");
      expect(result.error).toContain("not configured");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("falls back to rules when LLM request fails", async () => {
      process.env.OPENROUTER_API_KEY = "test-key";

      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Network error")
      );

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("rules");
      expect(result.fallbackFrom).toBe("llm");
      expect(result.error).toContain("Network error");
    });

    it("falls back to rules when LLM returns HTTP error", async () => {
      process.env.OPENROUTER_API_KEY = "test-key";

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Unauthorized", { status: 401 })
      );

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("rules");
      expect(result.fallbackFrom).toBe("llm");
      expect(result.error).toContain("401");
    });
  });

  describe("requestAdaptation — LLM enabled and available", () => {
    beforeEach(() => {
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: true,
        USE_REAL_SLM: false,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });
      process.env.OPENROUTER_API_KEY = "test-key";
      process.env.OPENROUTER_MODEL = "openai/gpt-4o";
    });

    it("returns LLM decision on successful response", async () => {
      const llmResponse = {
        id: "chatcmpl-123",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                variant: "comparison",
                layoutDensity: "standard",
                confidence: 85,
                reasoning: "User is comparing products.",
              }),
            },
            finish_reason: "stop",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(llmResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("llm");
      expect(result.variant).toBe("comparison");
      expect(result.confidence).toBe(85);
      expect(result.reasoning).toBe("User is comparing products.");
      expect(result.prompt).toBeDefined();
      expect(result.rawResponse).toBeDefined();
    });

    it("handles malformed LLM JSON response gracefully", async () => {
      const llmResponse = {
        id: "chatcmpl-123",
        choices: [
          {
            message: {
              role: "assistant",
              content: "not valid json at all",
            },
            finish_reason: "stop",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(llmResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("llm");
      expect(result.confidence).toBe(50);
      expect(result.reasoning).toContain("could not be parsed");
    });

    it("clamps confidence to [0, 100] range", async () => {
      const llmResponse = {
        id: "chatcmpl-123",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                variant: "standard",
                confidence: 150,
                reasoning: "Very confident",
              }),
            },
            finish_reason: "stop",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(llmResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await requestAdaptation(baseContext);

      expect(result.confidence).toBe(100);
    });

    it("truncates highlighted filters to max 3", async () => {
      const llmResponse = {
        id: "chatcmpl-123",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                variant: "standard",
                highlightedFilters: ["a", "b", "c", "d", "e"],
                confidence: 70,
                reasoning: "Multiple filters suggested.",
              }),
            },
            finish_reason: "stop",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(llmResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await requestAdaptation(baseContext);

      expect(result.highlightedFilters).toHaveLength(3);
    });
  });

  describe("requestAdaptation — SLM enabled fallback", () => {
    beforeEach(() => {
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: true,
        USE_REAL_SLM: true,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });
      process.env.OPENROUTER_API_KEY = "test-key";
      process.env.OPENROUTER_MODEL = "slm-model";
    });

    it("falls back to SLM when LLM fails", async () => {
      const slmResponse = {
        id: "chatcmpl-456",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                variant: "compact",
                layoutDensity: "compact",
                confidence: 65,
                reasoning: "SLM classification result.",
              }),
            },
            finish_reason: "stop",
          },
        ],
      };

      // First call (LLM) fails, second call (SLM) succeeds
      vi.spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("LLM timeout"))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(slmResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("slm");
      expect(result.fallbackFrom).toBe("llm");
      expect(result.variant).toBe("compact");
      expect(result.confidence).toBe(65);
    });

    it("falls back to rules when both LLM and SLM fail", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("LLM timeout"))
        .mockRejectedValueOnce(new Error("SLM error"));

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("rules");
      expect(result.fallbackFrom).toBe("slm");
      expect(result.error).toContain("LLM timeout");
      expect(result.error).toContain("SLM");
    });
  });

  describe("requestAdaptation — SLM only (LLM disabled)", () => {
    beforeEach(() => {
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: false,
        USE_REAL_SLM: true,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });
      process.env.OPENROUTER_API_KEY = "test-key";
      process.env.OPENROUTER_MODEL = "slm-model";
    });

    it("uses SLM directly when LLM is disabled", async () => {
      const slmResponse = {
        id: "chatcmpl-789",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                variant: "standard",
                layoutDensity: "standard",
                confidence: 72,
                reasoning: "Standard layout for desktop.",
              }),
            },
            finish_reason: "stop",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(slmResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("slm");
      expect(result.fallbackFrom).toBeUndefined();
    });

    it("falls back to rules when SLM fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("SLM connection refused")
      );

      const result = await requestAdaptation(baseContext);

      expect(result.decisionSource).toBe("rules");
      expect(result.fallbackFrom).toBe("slm");
      expect(result.error).toContain("SLM connection refused");
    });
  });

  describe("requestAdaptation — timeout handling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockGetFlags.mockReturnValue({
        USE_REAL_LLM: true,
        USE_REAL_SLM: false,
        SIMULATE_ADAPTATIONS: false,
        SHOW_DEVTOOLS: false,
        ENABLE_EXPLANATIONS: true,
        ENABLE_CONSENT: true,
      });
      process.env.OPENROUTER_API_KEY = "test-key";
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("aborts LLM request after 10 seconds", async () => {
      let abortSignal: AbortSignal | undefined;

      vi.spyOn(globalThis, "fetch").mockImplementation(
        (_url, options) => {
          abortSignal = options?.signal as AbortSignal | undefined;
          return new Promise((_resolve, reject) => {
            if (abortSignal) {
              abortSignal.addEventListener("abort", () => {
                reject(new DOMException("The operation was aborted.", "AbortError"));
              });
            }
          });
        }
      );

      const promise = requestAdaptation(baseContext);

      // Advance past LLM timeout
      await vi.advanceTimersByTimeAsync(10_001);

      const result = await promise;

      expect(result.decisionSource).toBe("rules");
      expect(result.fallbackFrom).toBe("llm");
    });
  });
});
