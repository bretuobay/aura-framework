/**
 * Explanation generation and validation for AURA prescriptions.
 *
 * Produces plain-language explanations describing why an adaptation was applied.
 * Enforces constraints:
 * - Total text length ≤ 200 characters
 * - Each sentence ≤ 30 words
 * - Confidence score in [0, 100]
 * - At least 1 contributing factor with category label
 *
 * Respects the ENABLE_EXPLANATIONS flag and provides a fallback message
 * when explanation generation is unavailable.
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import type {
  Explanation,
  ExplanationDisplayConfig,
  ContributingFactor,
  FactorCategory,
} from "@/lib/types/explanation";
import { getFlags } from "@/lib/config/flags";

/**
 * Fallback message displayed when an explanation cannot be generated.
 *
 * @see Requirements 10.6
 */
export const FALLBACK_MESSAGE = "Explanation unavailable";

/**
 * Extended fallback message providing additional context.
 */
export const FALLBACK_MESSAGE_EXTENDED =
  "Explanation unavailable. This adaptation was applied based on available context signals.";

/**
 * Maximum total character length for explanation text.
 */
const MAX_TEXT_LENGTH = 200;

/**
 * Maximum number of words allowed in a single sentence.
 */
const MAX_WORDS_PER_SENTENCE = 30;

/**
 * Context provided to the explanation generator describing the decision
 * that led to an adaptation.
 */
export interface ExplanationContext {
  /** Human-readable description of the adaptation decision */
  decisionDescription: string;
  /** Contributing factors that influenced the decision */
  factors: ContributingFactor[];
  /** Confidence score for the decision (0–100) */
  confidence: number;
  /** Optional additional sentences to include in the explanation */
  additionalSentences?: string[];
}

/**
 * Truncates text to the specified maximum character length.
 * If truncation occurs, appends an ellipsis within the limit.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  // Leave room for ellipsis "…" (1 char)
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Truncates a sentence to at most maxWords words.
 * If truncation occurs, the sentence is cut and ellipsis appended.
 */
function truncateSentence(sentence: string, maxWords: number): string {
  const words = sentence.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= maxWords) {
    return sentence.trim();
  }
  return words.slice(0, maxWords).join(" ") + "…";
}

/**
 * Clamps a numeric value to the range [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Splits text into sentences using common sentence delimiters.
 * Returns at least one sentence if text is non-empty.
 */
function splitIntoSentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If splitting produced nothing (no sentence-ending punctuation), treat the whole text as one sentence
  if (sentences.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }

  return sentences;
}

/**
 * Default contributing factor used when none are provided.
 */
const DEFAULT_FACTOR: ContributingFactor = {
  category: "user behavior" as FactorCategory,
  description: "Based on observed interaction patterns.",
};

/**
 * Generates a plain-language explanation for an adaptation decision.
 *
 * Returns `null` when the ENABLE_EXPLANATIONS flag is false, indicating
 * explanations should not be shown in the UI.
 *
 * Enforces all constraints:
 * - Text ≤ 200 characters (truncated if necessary)
 * - Each sentence ≤ 30 words (truncated if necessary)
 * - Confidence clamped to [0, 100]
 * - At least 1 contributing factor (uses default if none provided)
 *
 * @param context - The decision context to generate an explanation from
 * @returns An Explanation object, or null if explanations are disabled
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export function generateExplanation(
  context: ExplanationContext
): Explanation | null {
  const flags = getFlags();

  // When explanations are disabled, return null
  if (!flags.ENABLE_EXPLANATIONS) {
    return null;
  }

  // Ensure at least 1 contributing factor
  const factors: ContributingFactor[] =
    context.factors.length > 0 ? [...context.factors] : [DEFAULT_FACTOR];

  // Clamp confidence to [0, 100]
  const confidence = clamp(Math.round(context.confidence), 0, 100);

  // Build sentences from the decision description and additional sentences
  const rawSentences = [
    ...splitIntoSentences(context.decisionDescription),
    ...(context.additionalSentences ?? []),
  ];

  // Truncate each sentence to ≤30 words
  const sentences = rawSentences.map((s) =>
    truncateSentence(s, MAX_WORDS_PER_SENTENCE)
  );

  // If we somehow have no sentences, create one from the fallback
  if (sentences.length === 0) {
    sentences.push("Adaptation applied based on context signals.");
  }

  // Build the full text from sentences
  const fullText = sentences.join(" ");

  // Truncate total text to ≤200 characters
  const text = truncateText(fullText, MAX_TEXT_LENGTH);

  return {
    text,
    sentences,
    confidence,
    factors,
  };
}

/**
 * Returns a fallback explanation when the system cannot generate a proper one.
 *
 * Returns `null` when the ENABLE_EXPLANATIONS flag is false (explanations hidden).
 * Otherwise returns an Explanation with the FALLBACK_MESSAGE text, zero confidence,
 * and a default contributing factor.
 *
 * @returns A fallback Explanation, or null if explanations are disabled
 *
 * @see Requirements 10.5, 10.6
 */
export function getFallbackExplanation(): Explanation | null {
  const flags = getFlags();

  if (!flags.ENABLE_EXPLANATIONS) {
    return null;
  }

  return {
    text: FALLBACK_MESSAGE,
    sentences: [FALLBACK_MESSAGE],
    confidence: 0,
    factors: [DEFAULT_FACTOR],
  };
}

/**
 * Checks whether explanations are currently enabled based on the
 * ENABLE_EXPLANATIONS simulation flag.
 *
 * @returns true if explanations should be displayed in the UI
 *
 * @see Requirements 10.5, 11.7
 */
export function isExplanationsEnabled(): boolean {
  return getFlags().ENABLE_EXPLANATIONS;
}

/**
 * Returns the current explanation display configuration based on the
 * ENABLE_EXPLANATIONS simulation flag.
 *
 * @returns Configuration object indicating whether explanations are enabled
 *          and the fallback message to display when unavailable
 *
 * @see Requirements 10.5, 10.6
 */
export function getExplanationConfig(): ExplanationDisplayConfig {
  const flags = getFlags();
  return {
    enabled: flags.ENABLE_EXPLANATIONS,
    fallbackMessage: FALLBACK_MESSAGE,
  };
}

/**
 * Pre-built explanation templates for the 6 demo scenarios.
 * Each provides a ready-to-use ExplanationContext for scenario-triggered adaptations.
 *
 * @see Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
export const SCENARIO_EXPLANATIONS: Record<string, ExplanationContext> = {
  "search-intent-detection": {
    decisionDescription:
      "Results reordered for your travel intent. Lightweight laptops prioritized.",
    factors: [
      { category: "search intent", description: "Travel-related keywords detected in query" },
    ],
    confidence: 88,
  },
  "price-sensitive-user": {
    decisionDescription:
      "Discounted products highlighted. Best deals shown first.",
    factors: [
      { category: "user behavior", description: "Value-seeking browsing pattern detected" },
    ],
    confidence: 82,
  },
  "brand-preference": {
    decisionDescription:
      "Preferred brand products placed at the top. Based on past interactions.",
    factors: [
      { category: "browsing history", description: "Repeated engagement with brand products" },
    ],
    confidence: 90,
  },
  "cold-start": {
    decisionDescription:
      "Showing diverse categories for exploration. Welcome, new visitor.",
    factors: [
      { category: "user behavior", description: "New visitor with no prior interaction history" },
    ],
    confidence: 60,
  },
  "mobile-context": {
    decisionDescription:
      "Layout optimized for mobile. Compact cards and collapsed filters applied.",
    factors: [
      { category: "device context", description: "Mobile viewport and touch input detected" },
    ],
    confidence: 95,
  },
  "accessibility-preference": {
    decisionDescription:
      "Accessibility settings applied. Larger text and high contrast enabled.",
    factors: [
      {
        category: "accessibility needs",
        description: "User accessibility preferences detected",
      },
      { category: "stated preference", description: "High contrast or large font setting active" },
    ],
    confidence: 98,
  },
};

/**
 * Generates an explanation for a specific demo scenario.
 *
 * Returns null if explanations are disabled or the scenario ID is not recognized.
 *
 * @param scenarioId - One of the 6 predefined scenario identifiers
 * @returns An Explanation object for the scenario, or null
 *
 * @see Requirements 10.1, 12.1–12.6
 */
export function generateScenarioExplanation(
  scenarioId: string
): Explanation | null {
  const context = SCENARIO_EXPLANATIONS[scenarioId];
  if (!context) {
    return getFallbackExplanation();
  }
  return generateExplanation(context);
}

/**
 * Validates an Explanation object against all required constraints.
 *
 * Checks:
 * - text length ≤ 200 characters
 * - Each sentence ≤ 30 words
 * - confidence is a number in [0, 100]
 * - At least 1 contributing factor with a valid category
 *
 * @param explanation - The explanation to validate
 * @returns true if the explanation satisfies all constraints
 *
 * @see Requirements 10.2, 10.3, 10.4
 */
export function validateExplanation(explanation: Explanation): boolean {
  // Check text length constraint
  if (explanation.text.length > MAX_TEXT_LENGTH) {
    return false;
  }

  // Check each sentence ≤ 30 words
  for (const sentence of explanation.sentences) {
    const wordCount = sentence.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount > MAX_WORDS_PER_SENTENCE) {
      return false;
    }
  }

  // Check confidence is a number in [0, 100]
  if (
    typeof explanation.confidence !== "number" ||
    Number.isNaN(explanation.confidence) ||
    explanation.confidence < 0 ||
    explanation.confidence > 100
  ) {
    return false;
  }

  // Check at least 1 contributing factor
  if (!Array.isArray(explanation.factors) || explanation.factors.length < 1) {
    return false;
  }

  // Validate each factor has a category and description
  const validCategories: FactorCategory[] = [
    "user behavior",
    "device context",
    "stated preference",
    "browsing history",
    "search intent",
    "accessibility needs",
  ];

  for (const factor of explanation.factors) {
    if (!validCategories.includes(factor.category)) {
      return false;
    }
    if (typeof factor.description !== "string" || factor.description.length === 0) {
      return false;
    }
  }

  return true;
}
