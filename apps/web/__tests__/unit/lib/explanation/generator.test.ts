/**
 * Unit tests for the explanation generator.
 * Validates explanation generation, validation, and flag-controlled behavior.
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateExplanation,
  validateExplanation,
  getFallbackExplanation,
  isExplanationsEnabled,
  getExplanationConfig,
  generateScenarioExplanation,
  FALLBACK_MESSAGE,
  SCENARIO_EXPLANATIONS,
  type ExplanationContext,
} from "@/lib/explanation/generator";
import type { Explanation } from "@/lib/types/explanation";

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

import { getFlags } from "@/lib/config/flags";
const mockGetFlags = vi.mocked(getFlags);

describe("generateExplanation", () => {
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

  it("returns null when ENABLE_EXPLANATIONS is false", () => {
    mockGetFlags.mockReturnValue({
      USE_REAL_LLM: false,
      USE_REAL_SLM: false,
      SIMULATE_ADAPTATIONS: false,
      SHOW_DEVTOOLS: false,
      ENABLE_EXPLANATIONS: false,
      ENABLE_CONSENT: true,
    });

    const context: ExplanationContext = {
      decisionDescription: "Products reordered based on your search intent.",
      factors: [
        { category: "search intent", description: "Travel-related keywords detected" },
      ],
      confidence: 85,
    };

    expect(generateExplanation(context)).toBeNull();
  });

  it("generates a valid explanation with all fields", () => {
    const context: ExplanationContext = {
      decisionDescription: "Products reordered based on your search intent.",
      factors: [
        { category: "search intent", description: "Travel-related keywords detected" },
      ],
      confidence: 85,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.text.length).toBeLessThanOrEqual(200);
    expect(result!.confidence).toBe(85);
    expect(result!.factors).toHaveLength(1);
    expect(result!.factors[0].category).toBe("search intent");
    expect(result!.sentences.length).toBeGreaterThanOrEqual(1);
  });

  it("truncates text to 200 characters when too long", () => {
    const longDescription =
      "This is a very long explanation that describes in excessive detail exactly why the interface adapted to show you different products. " +
      "It includes multiple factors and a detailed analysis of your browsing behavior patterns.";

    const context: ExplanationContext = {
      decisionDescription: longDescription,
      factors: [
        { category: "user behavior", description: "Extended browsing detected" },
      ],
      confidence: 72,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.text.length).toBeLessThanOrEqual(200);
  });

  it("truncates sentences exceeding 30 words", () => {
    const longSentence =
      "This is a very long sentence that contains way more than thirty words and should be truncated by the generator to ensure it meets the constraint of no more than thirty words per individual sentence in the explanation.";

    const context: ExplanationContext = {
      decisionDescription: longSentence,
      factors: [
        { category: "device context", description: "Mobile viewport detected" },
      ],
      confidence: 60,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    for (const sentence of result!.sentences) {
      const wordCount = sentence.split(/\s+/).filter((w) => w.length > 0).length;
      expect(wordCount).toBeLessThanOrEqual(30);
    }
  });

  it("clamps confidence to [0, 100] when above 100", () => {
    const context: ExplanationContext = {
      decisionDescription: "Adaptation applied.",
      factors: [
        { category: "user behavior", description: "Clicks detected" },
      ],
      confidence: 150,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(100);
  });

  it("clamps confidence to [0, 100] when below 0", () => {
    const context: ExplanationContext = {
      decisionDescription: "Adaptation applied.",
      factors: [
        { category: "user behavior", description: "Clicks detected" },
      ],
      confidence: -20,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0);
  });

  it("provides a default factor when none are supplied", () => {
    const context: ExplanationContext = {
      decisionDescription: "Adaptation applied based on context.",
      factors: [],
      confidence: 50,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.factors.length).toBeGreaterThanOrEqual(1);
    expect(result!.factors[0].category).toBe("user behavior");
  });

  it("includes additional sentences in the output", () => {
    const context: ExplanationContext = {
      decisionDescription: "Products reordered.",
      factors: [
        { category: "browsing history", description: "Previous visits recorded" },
      ],
      confidence: 90,
      additionalSentences: ["Based on your browsing history."],
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.sentences.length).toBeGreaterThanOrEqual(2);
  });

  it("rounds fractional confidence values", () => {
    const context: ExplanationContext = {
      decisionDescription: "Adaptation applied.",
      factors: [
        { category: "stated preference", description: "User preference" },
      ],
      confidence: 73.7,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(74);
    expect(Number.isInteger(result!.confidence)).toBe(true);
  });

  it("handles empty description gracefully", () => {
    const context: ExplanationContext = {
      decisionDescription: "",
      factors: [
        { category: "accessibility needs", description: "High contrast mode" },
      ],
      confidence: 95,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(result!.sentences.length).toBeGreaterThanOrEqual(1);
    expect(result!.text.length).toBeGreaterThan(0);
  });
});

describe("validateExplanation", () => {
  it("returns true for a valid explanation", () => {
    const explanation: Explanation = {
      text: "Products reordered based on your search intent.",
      sentences: ["Products reordered based on your search intent."],
      confidence: 85,
      factors: [
        { category: "search intent", description: "Travel keywords detected" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(true);
  });

  it("returns false when text exceeds 200 characters", () => {
    const explanation: Explanation = {
      text: "x".repeat(201),
      sentences: ["Short sentence."],
      confidence: 50,
      factors: [
        { category: "user behavior", description: "Clicks detected" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns false when a sentence exceeds 30 words", () => {
    const longSentence = Array(31).fill("word").join(" ") + ".";
    const explanation: Explanation = {
      text: "Short text.",
      sentences: [longSentence],
      confidence: 50,
      factors: [
        { category: "user behavior", description: "Clicks detected" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns false when confidence is above 100", () => {
    const explanation: Explanation = {
      text: "Valid text.",
      sentences: ["Valid text."],
      confidence: 101,
      factors: [
        { category: "user behavior", description: "Clicks detected" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns false when confidence is below 0", () => {
    const explanation: Explanation = {
      text: "Valid text.",
      sentences: ["Valid text."],
      confidence: -1,
      factors: [
        { category: "user behavior", description: "Clicks detected" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns false when confidence is NaN", () => {
    const explanation: Explanation = {
      text: "Valid text.",
      sentences: ["Valid text."],
      confidence: NaN,
      factors: [
        { category: "user behavior", description: "Clicks detected" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns false when factors array is empty", () => {
    const explanation: Explanation = {
      text: "Valid text.",
      sentences: ["Valid text."],
      confidence: 50,
      factors: [],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns false when factor has invalid category", () => {
    const explanation: Explanation = {
      text: "Valid text.",
      sentences: ["Valid text."],
      confidence: 50,
      factors: [
        { category: "invalid category" as any, description: "Something" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns false when factor has empty description", () => {
    const explanation: Explanation = {
      text: "Valid text.",
      sentences: ["Valid text."],
      confidence: 50,
      factors: [
        { category: "user behavior", description: "" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(false);
  });

  it("returns true for exactly 200 characters text", () => {
    const explanation: Explanation = {
      text: "x".repeat(200),
      sentences: ["Short sentence."],
      confidence: 50,
      factors: [
        { category: "device context", description: "Desktop viewport" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(true);
  });

  it("returns true for exactly 30 words in a sentence", () => {
    const exactSentence = Array(30).fill("word").join(" ") + ".";
    const explanation: Explanation = {
      text: "Short text.",
      sentences: [exactSentence],
      confidence: 50,
      factors: [
        { category: "browsing history", description: "Previous visits" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(true);
  });

  it("returns true for confidence at boundary values (0 and 100)", () => {
    const base: Explanation = {
      text: "Valid text.",
      sentences: ["Valid text."],
      factors: [
        { category: "user behavior", description: "Activity detected" },
      ],
      confidence: 0,
    };

    expect(validateExplanation({ ...base, confidence: 0 })).toBe(true);
    expect(validateExplanation({ ...base, confidence: 100 })).toBe(true);
  });

  it("validates all valid factor categories", () => {
    const categories = [
      "user behavior",
      "device context",
      "stated preference",
      "browsing history",
      "search intent",
      "accessibility needs",
    ] as const;

    for (const category of categories) {
      const explanation: Explanation = {
        text: "Valid text.",
        sentences: ["Valid text."],
        confidence: 50,
        factors: [{ category, description: "Valid description" }],
      };
      expect(validateExplanation(explanation)).toBe(true);
    }
  });

  it("validates explanation with multiple factors", () => {
    const explanation: Explanation = {
      text: "Adapted interface.",
      sentences: ["Adapted interface."],
      confidence: 75,
      factors: [
        { category: "user behavior", description: "Clicks detected" },
        { category: "device context", description: "Mobile device" },
        { category: "search intent", description: "Travel keywords" },
      ],
    };

    expect(validateExplanation(explanation)).toBe(true);
  });
});

describe("FALLBACK_MESSAGE", () => {
  it("is a non-empty string", () => {
    expect(FALLBACK_MESSAGE).toBeTruthy();
    expect(typeof FALLBACK_MESSAGE).toBe("string");
    expect(FALLBACK_MESSAGE.length).toBeGreaterThan(0);
  });

  it("is within 200 characters", () => {
    expect(FALLBACK_MESSAGE.length).toBeLessThanOrEqual(200);
  });
});

describe("generateExplanation produces valid output", () => {
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

  it("output always passes validateExplanation", () => {
    const context: ExplanationContext = {
      decisionDescription: "Products reordered for relevance. Based on your search history.",
      factors: [
        { category: "search intent", description: "Travel keywords found" },
        { category: "browsing history", description: "Previous laptop browsing" },
      ],
      confidence: 82,
    };

    const result = generateExplanation(context);
    expect(result).not.toBeNull();
    expect(validateExplanation(result!)).toBe(true);
  });
});

describe("getFallbackExplanation", () => {
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

  it("returns a valid explanation with fallback message when enabled", () => {
    const result = getFallbackExplanation();
    expect(result).not.toBeNull();
    expect(result!.text).toBe(FALLBACK_MESSAGE);
    expect(result!.confidence).toBe(0);
    expect(result!.factors.length).toBeGreaterThanOrEqual(1);
    expect(result!.sentences).toContain(FALLBACK_MESSAGE);
  });

  it("returns null when ENABLE_EXPLANATIONS is false", () => {
    mockGetFlags.mockReturnValue({
      USE_REAL_LLM: false,
      USE_REAL_SLM: false,
      SIMULATE_ADAPTATIONS: false,
      SHOW_DEVTOOLS: false,
      ENABLE_EXPLANATIONS: false,
      ENABLE_CONSENT: true,
    });

    expect(getFallbackExplanation()).toBeNull();
  });

  it("fallback explanation passes validateExplanation", () => {
    const result = getFallbackExplanation();
    expect(result).not.toBeNull();
    expect(validateExplanation(result!)).toBe(true);
  });
});

describe("isExplanationsEnabled", () => {
  it("returns true when ENABLE_EXPLANATIONS is true", () => {
    mockGetFlags.mockReturnValue({
      USE_REAL_LLM: false,
      USE_REAL_SLM: false,
      SIMULATE_ADAPTATIONS: false,
      SHOW_DEVTOOLS: false,
      ENABLE_EXPLANATIONS: true,
      ENABLE_CONSENT: true,
    });

    expect(isExplanationsEnabled()).toBe(true);
  });

  it("returns false when ENABLE_EXPLANATIONS is false", () => {
    mockGetFlags.mockReturnValue({
      USE_REAL_LLM: false,
      USE_REAL_SLM: false,
      SIMULATE_ADAPTATIONS: false,
      SHOW_DEVTOOLS: false,
      ENABLE_EXPLANATIONS: false,
      ENABLE_CONSENT: true,
    });

    expect(isExplanationsEnabled()).toBe(false);
  });
});

describe("getExplanationConfig", () => {
  it("returns enabled: true and fallback message when explanations are enabled", () => {
    mockGetFlags.mockReturnValue({
      USE_REAL_LLM: false,
      USE_REAL_SLM: false,
      SIMULATE_ADAPTATIONS: false,
      SHOW_DEVTOOLS: false,
      ENABLE_EXPLANATIONS: true,
      ENABLE_CONSENT: true,
    });

    const config = getExplanationConfig();
    expect(config.enabled).toBe(true);
    expect(config.fallbackMessage).toBe(FALLBACK_MESSAGE);
  });

  it("returns enabled: false when explanations are disabled", () => {
    mockGetFlags.mockReturnValue({
      USE_REAL_LLM: false,
      USE_REAL_SLM: false,
      SIMULATE_ADAPTATIONS: false,
      SHOW_DEVTOOLS: false,
      ENABLE_EXPLANATIONS: false,
      ENABLE_CONSENT: true,
    });

    const config = getExplanationConfig();
    expect(config.enabled).toBe(false);
    expect(config.fallbackMessage).toBe(FALLBACK_MESSAGE);
  });
});

describe("generateScenarioExplanation", () => {
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

  it("generates valid explanation for search-intent-detection scenario", () => {
    const result = generateScenarioExplanation("search-intent-detection");
    expect(result).not.toBeNull();
    expect(result!.text.length).toBeLessThanOrEqual(200);
    expect(result!.confidence).toBe(88);
    expect(result!.factors[0].category).toBe("search intent");
    expect(validateExplanation(result!)).toBe(true);
  });

  it("generates valid explanation for price-sensitive-user scenario", () => {
    const result = generateScenarioExplanation("price-sensitive-user");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(82);
    expect(result!.factors[0].category).toBe("user behavior");
    expect(validateExplanation(result!)).toBe(true);
  });

  it("generates valid explanation for brand-preference scenario", () => {
    const result = generateScenarioExplanation("brand-preference");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(90);
    expect(result!.factors[0].category).toBe("browsing history");
    expect(validateExplanation(result!)).toBe(true);
  });

  it("generates valid explanation for cold-start scenario", () => {
    const result = generateScenarioExplanation("cold-start");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(60);
    expect(result!.factors[0].category).toBe("user behavior");
    expect(validateExplanation(result!)).toBe(true);
  });

  it("generates valid explanation for mobile-context scenario", () => {
    const result = generateScenarioExplanation("mobile-context");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(95);
    expect(result!.factors[0].category).toBe("device context");
    expect(validateExplanation(result!)).toBe(true);
  });

  it("generates valid explanation for accessibility-preference scenario", () => {
    const result = generateScenarioExplanation("accessibility-preference");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(98);
    expect(result!.factors.length).toBeGreaterThanOrEqual(2);
    expect(result!.factors[0].category).toBe("accessibility needs");
    expect(validateExplanation(result!)).toBe(true);
  });

  it("returns fallback for unknown scenario ID", () => {
    const result = generateScenarioExplanation("unknown-scenario");
    expect(result).not.toBeNull();
    expect(result!.text).toBe(FALLBACK_MESSAGE);
    expect(result!.confidence).toBe(0);
  });

  it("returns null when explanations are disabled", () => {
    mockGetFlags.mockReturnValue({
      USE_REAL_LLM: false,
      USE_REAL_SLM: false,
      SIMULATE_ADAPTATIONS: false,
      SHOW_DEVTOOLS: false,
      ENABLE_EXPLANATIONS: false,
      ENABLE_CONSENT: true,
    });

    const result = generateScenarioExplanation("search-intent-detection");
    expect(result).toBeNull();
  });

  it("all scenario explanations pass validation", () => {
    for (const scenarioId of Object.keys(SCENARIO_EXPLANATIONS)) {
      const result = generateScenarioExplanation(scenarioId);
      expect(result).not.toBeNull();
      expect(validateExplanation(result!)).toBe(true);
    }
  });
});
