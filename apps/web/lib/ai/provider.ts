/**
 * AI Integration Layer for the AURA E-Commerce Demo.
 *
 * Provides OpenRouter/OpenAI-compatible API integration with a graceful
 * fallback chain: LLM → SLM → Rules.
 *
 * Timeout handling:
 * - LLM requests: 10 seconds
 * - SLM requests: 3 seconds
 * - Fallback delivery: within 2 seconds of failure detection
 *
 * Respects simulation flags:
 * - USE_REAL_LLM: enables LLM tier via OpenRouter
 * - USE_REAL_SLM: enables SLM tier for classification
 * - When both are false: uses rules only, no HTTP requests
 *
 * Configuration via environment variables:
 * - OPENROUTER_API_KEY: API key for the LLM provider
 * - OPENROUTER_MODEL: Model identifier (e.g., "openai/gpt-4o")
 * - OPENROUTER_BASE_URL: Provider base URL (default: OpenRouter)
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.5, 15.6, 11.2, 11.6
 */

import { getFlags } from "@/lib/config/flags";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** LLM request timeout in milliseconds (10 seconds) */
const LLM_TIMEOUT_MS = 10_000;

/** SLM request timeout in milliseconds (3 seconds) */
const SLM_TIMEOUT_MS = 3_000;

/** Maximum time to deliver fallback result after failure detection (2 seconds) */
const FALLBACK_DELIVERY_MS = 2_000;

/** Default base URL for OpenRouter API */
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

/** Default model identifier */
const DEFAULT_MODEL = "openai/gpt-4o";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Source of the adaptation decision, indicating which tier produced it.
 */
export type DecisionSource = "llm" | "slm" | "rules";

/**
 * Context provided to the AI provider for adaptation reasoning.
 */
export interface AdaptationContext {
  /** The user's current search query, if any */
  query?: string;
  /** Current user model attributes */
  userModel?: Record<string, unknown>;
  /** Current context model (device, viewport, etc.) */
  contextModel?: Record<string, unknown>;
  /** The surface requesting adaptation */
  surfaceId: string;
  /** Available components and their variants from the manifest */
  availableAdaptations?: string[];
  /** Session identifier */
  sessionId?: string;
}

/**
 * Structured adaptation decision returned by the AI provider.
 */
export interface AdaptationDecision {
  /** Which tier produced this decision */
  decisionSource: DecisionSource;
  /** Suggested variant for product cards */
  variant?: string;
  /** Suggested product ranking order (list of product IDs) */
  ranking?: string[];
  /** Suggested filter IDs to highlight */
  highlightedFilters?: string[];
  /** Suggested layout density */
  layoutDensity?: "compact" | "standard" | "expanded";
  /** Confidence score (0–100) */
  confidence: number;
  /** Reasoning/explanation text from the AI */
  reasoning?: string;
  /** The raw prompt sent to the AI (for devtools display) */
  prompt?: string;
  /** The raw response from the AI (for devtools display) */
  rawResponse?: string;
  /** Whether a fallback was used (and from which tier) */
  fallbackFrom?: DecisionSource;
  /** Error message if the primary tier failed */
  error?: string;
}

/**
 * Configuration for the AI provider, resolved from environment variables.
 */
export interface AIProviderConfig {
  /** Whether LLM tier is enabled */
  llmEnabled: boolean;
  /** Whether SLM tier is enabled */
  slmEnabled: boolean;
  /** API key for the LLM provider */
  apiKey: string;
  /** Model identifier */
  model: string;
  /** Provider base URL */
  baseUrl: string;
}

/**
 * Raw response shape from OpenAI-compatible chat completion endpoints.
 */
interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Resolves AI provider configuration from environment variables and simulation flags.
 */
export function getAIConfig(): AIProviderConfig {
  const flags = getFlags();

  return {
    llmEnabled: flags.USE_REAL_LLM,
    slmEnabled: flags.USE_REAL_SLM,
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
    baseUrl: process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL,
  };
}

/**
 * Checks whether the LLM tier is available (enabled + API key configured).
 */
export function isLLMAvailable(config?: AIProviderConfig): boolean {
  const cfg = config ?? getAIConfig();
  return cfg.llmEnabled && cfg.apiKey.length > 0;
}

/**
 * Checks whether the SLM tier is available (enabled + model configured).
 */
export function isSLMAvailable(config?: AIProviderConfig): boolean {
  const cfg = config ?? getAIConfig();
  return cfg.slmEnabled && cfg.model.length > 0;
}

// ---------------------------------------------------------------------------
// Prompt Construction
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt for adaptation reasoning.
 */
function buildSystemPrompt(): string {
  return `You are an adaptive UI reasoning engine for an e-commerce product discovery experience.
Your role is to analyze user context and suggest UI adaptations.

Respond with a JSON object containing:
- "variant": one of "standard", "compact", "comparison", "image-lead"
- "ranking": optional array of product IDs to prioritize
- "highlightedFilters": optional array of filter IDs to highlight (max 3)
- "layoutDensity": one of "compact", "standard", "expanded"
- "confidence": number 0-100
- "reasoning": brief explanation of your decision (max 200 chars)

Respond ONLY with valid JSON. No markdown, no code blocks.`;
}

/**
 * Builds the user prompt from the adaptation context.
 */
function buildUserPrompt(context: AdaptationContext): string {
  const parts: string[] = [];

  parts.push(`Surface: ${context.surfaceId}`);

  if (context.query) {
    parts.push(`Search query: "${context.query}"`);
  }

  if (context.userModel && Object.keys(context.userModel).length > 0) {
    parts.push(`User model: ${JSON.stringify(context.userModel)}`);
  }

  if (context.contextModel && Object.keys(context.contextModel).length > 0) {
    parts.push(`Context: ${JSON.stringify(context.contextModel)}`);
  }

  if (context.availableAdaptations && context.availableAdaptations.length > 0) {
    parts.push(`Available adaptations: ${context.availableAdaptations.join(", ")}`);
  }

  parts.push("Suggest the best UI adaptation for this user and context.");

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// HTTP Request with Timeout
// ---------------------------------------------------------------------------

/**
 * Makes a fetch request with AbortController-based timeout.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (headers, body, etc.)
 * @param timeoutMs - Timeout in milliseconds
 * @returns The fetch Response
 * @throws Error if the request times out or fails
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// LLM Tier
// ---------------------------------------------------------------------------

/**
 * Sends an adaptation request to the LLM via OpenRouter/OpenAI-compatible API.
 *
 * @param context - The adaptation context
 * @param config - AI provider configuration
 * @returns The parsed adaptation decision from the LLM
 * @throws Error on timeout (10s), HTTP error, or invalid response
 *
 * @see Requirements 15.1
 */
async function requestLLM(
  context: AdaptationContext,
  config: AIProviderConfig
): Promise<AdaptationDecision> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(context);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const url = `${config.baseUrl}/chat/completions`;

  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": "https://aura-demo.example.com",
        "X-Title": "AURA E-Commerce Demo",
      },
      body,
    },
    LLM_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `LLM request failed with status ${response.status}: ${errorText}`
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "";

  const parsed = parseLLMResponse(content);

  return {
    ...parsed,
    decisionSource: "llm",
    confidence: parsed.confidence ?? 70,
    prompt: fullPrompt,
    rawResponse: content,
  };
}

/**
 * Parses the LLM's JSON response into an AdaptationDecision.
 */
function parseLLMResponse(content: string): Partial<AdaptationDecision> {
  try {
    const json = JSON.parse(content) as Record<string, unknown>;

    return {
      variant: typeof json.variant === "string" ? json.variant : undefined,
      ranking: Array.isArray(json.ranking) ? (json.ranking as string[]) : undefined,
      highlightedFilters: Array.isArray(json.highlightedFilters)
        ? (json.highlightedFilters as string[]).slice(0, 3)
        : undefined,
      layoutDensity: isValidDensity(json.layoutDensity)
        ? json.layoutDensity
        : undefined,
      confidence: typeof json.confidence === "number"
        ? Math.max(0, Math.min(100, json.confidence))
        : 70,
      reasoning: typeof json.reasoning === "string"
        ? json.reasoning.slice(0, 200)
        : undefined,
    };
  } catch {
    // If JSON parsing fails, return minimal decision
    return {
      confidence: 50,
      reasoning: "LLM response could not be parsed as JSON.",
    };
  }
}

/**
 * Type guard for valid layout density values.
 */
function isValidDensity(
  value: unknown
): value is "compact" | "standard" | "expanded" {
  return value === "compact" || value === "standard" || value === "expanded";
}

// ---------------------------------------------------------------------------
// SLM Tier
// ---------------------------------------------------------------------------

/**
 * Uses the SLM (small language model) for classification tasks.
 * In this implementation, SLM provides simpler classification (e.g., user intent)
 * rather than full reasoning.
 *
 * @param context - The adaptation context
 * @param config - AI provider configuration
 * @returns A classification-based adaptation decision
 * @throws Error on timeout (3s), HTTP error, or invalid response
 *
 * @see Requirements 15.2
 */
async function requestSLM(
  context: AdaptationContext,
  config: AIProviderConfig
): Promise<AdaptationDecision> {
  const classificationPrompt = buildClassificationPrompt(context);

  const url = `${config.baseUrl}/chat/completions`;

  const body = JSON.stringify({
    model: config.model,
    messages: [
      {
        role: "user",
        content: classificationPrompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": "https://aura-demo.example.com",
        "X-Title": "AURA E-Commerce Demo",
      },
      body,
    },
    SLM_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `SLM request failed with status ${response.status}: ${errorText}`
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "";

  const parsed = parseSLMResponse(content);

  return {
    ...parsed,
    decisionSource: "slm",
    confidence: parsed.confidence ?? 60,
    prompt: classificationPrompt,
    rawResponse: content,
  };
}

/**
 * Builds a classification-focused prompt for the SLM tier.
 */
function buildClassificationPrompt(context: AdaptationContext): string {
  const parts: string[] = [
    "Classify the user intent and suggest a UI adaptation.",
    "Respond with JSON: { \"variant\": string, \"layoutDensity\": string, \"confidence\": number, \"reasoning\": string }",
    "",
    `Surface: ${context.surfaceId}`,
  ];

  if (context.query) {
    parts.push(`Query: "${context.query}"`);
  }

  if (context.contextModel) {
    parts.push(`Context: ${JSON.stringify(context.contextModel)}`);
  }

  return parts.join("\n");
}

/**
 * Parses the SLM's classification response.
 */
function parseSLMResponse(content: string): Partial<AdaptationDecision> {
  try {
    const json = JSON.parse(content) as Record<string, unknown>;

    return {
      variant: typeof json.variant === "string" ? json.variant : "standard",
      layoutDensity: isValidDensity(json.layoutDensity)
        ? json.layoutDensity
        : "standard",
      confidence: typeof json.confidence === "number"
        ? Math.max(0, Math.min(100, json.confidence))
        : 60,
      reasoning: typeof json.reasoning === "string"
        ? json.reasoning.slice(0, 200)
        : undefined,
    };
  } catch {
    return {
      variant: "standard",
      layoutDensity: "standard",
      confidence: 40,
      reasoning: "SLM response could not be parsed.",
    };
  }
}

// ---------------------------------------------------------------------------
// Rules Tier (Always Available)
// ---------------------------------------------------------------------------

/**
 * Produces a rule-based adaptation decision.
 * This tier is always available and serves as the final fallback.
 * Uses deterministic heuristics based on context signals.
 */
function requestRules(context: AdaptationContext): AdaptationDecision {
  let variant: string = "standard";
  let layoutDensity: "compact" | "standard" | "expanded" = "standard";
  let highlightedFilters: string[] | undefined;
  let confidence = 75;
  let reasoning = "Rule-based adaptation applied using context signals.";

  // Mobile context → compact layout
  if (context.contextModel) {
    const device = context.contextModel.deviceType;
    if (device === "mobile") {
      variant = "compact";
      layoutDensity = "compact";
      confidence = 90;
      reasoning = "Compact layout applied for mobile device.";
    } else if (device === "tablet") {
      layoutDensity = "standard";
      confidence = 85;
      reasoning = "Standard layout applied for tablet device.";
    }

    // Accessibility preferences
    const accessibility = context.contextModel.accessibility;
    if (
      accessibility &&
      typeof accessibility === "object" &&
      (accessibility as Record<string, unknown>).highContrast === true
    ) {
      confidence = 95;
      reasoning = "Accessibility adaptations applied based on user preferences.";
    }
  }

  // Search intent detection (simple heuristic)
  if (context.query) {
    const lowerQuery = context.query.toLowerCase();

    if (
      lowerQuery.includes("compare") ||
      lowerQuery.includes("vs") ||
      lowerQuery.includes("comparison")
    ) {
      variant = "comparison";
      confidence = 80;
      reasoning = "Comparison view suggested based on comparison intent in query.";
    } else if (
      lowerQuery.includes("cheap") ||
      lowerQuery.includes("budget") ||
      lowerQuery.includes("deal") ||
      lowerQuery.includes("discount")
    ) {
      highlightedFilters = ["price"];
      confidence = 78;
      reasoning = "Price filter highlighted based on value-seeking intent.";
    } else if (
      lowerQuery.includes("travel") ||
      lowerQuery.includes("portable") ||
      lowerQuery.includes("lightweight")
    ) {
      variant = "comparison";
      highlightedFilters = ["weight", "battery"];
      confidence = 82;
      reasoning = "Travel-focused view with weight and battery filters.";
    }
  }

  return {
    decisionSource: "rules",
    variant,
    layoutDensity,
    highlightedFilters,
    confidence,
    reasoning,
  };
}

// ---------------------------------------------------------------------------
// Fallback Chain
// ---------------------------------------------------------------------------

/**
 * Requests an adaptation decision through the fallback chain: LLM → SLM → Rules.
 *
 * The fallback chain logic:
 * 1. If USE_REAL_LLM is true and API key is configured → try LLM (10s timeout)
 * 2. If LLM fails/unavailable and USE_REAL_SLM is true → try SLM (3s timeout)
 * 3. If SLM fails/unavailable → use Rules (always available)
 *
 * When both flags are false, uses rules directly with no HTTP requests.
 * Fallback results are delivered within 2 seconds of failure detection.
 *
 * @param context - The adaptation context describing the current user/session state
 * @returns A type-safe AdaptationDecision with decisionSource indicating the tier
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.5, 15.6, 11.2, 11.6
 */
export async function requestAdaptation(
  context: AdaptationContext
): Promise<AdaptationDecision> {
  const config = getAIConfig();

  // When both AI flags are false, use rules only — no HTTP requests
  if (!config.llmEnabled && !config.slmEnabled) {
    return requestRules(context);
  }

  // Try LLM tier first (if enabled and available)
  if (isLLMAvailable(config)) {
    try {
      const result = await requestLLM(context, config);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown LLM error";

      // LLM failed — try SLM fallback within 2s delivery window
      if (isSLMAvailable(config)) {
        return await fallbackToSLM(context, config, errorMessage);
      }

      // No SLM available — fall back to rules
      return deliverFallback(context, "llm", errorMessage);
    }
  }

  // LLM not available — try SLM directly (if enabled)
  if (isSLMAvailable(config)) {
    try {
      const result = await requestSLM(context, config);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown SLM error";

      // SLM failed — fall back to rules
      return deliverFallback(context, "slm", errorMessage);
    }
  }

  // Neither AI tier is properly configured — fall back to rules
  // This handles the case where flags are true but API key is missing
  const errorMessage = config.llmEnabled
    ? "LLM API key not configured"
    : "SLM model not configured";

  return deliverFallback(context, config.llmEnabled ? "llm" : "slm", errorMessage);
}

/**
 * Attempts SLM as a fallback after LLM failure.
 * Ensures the fallback result is delivered within 2 seconds.
 */
async function fallbackToSLM(
  context: AdaptationContext,
  config: AIProviderConfig,
  llmError: string
): Promise<AdaptationDecision> {
  try {
    // Race SLM against the 2s fallback delivery deadline
    const result = await Promise.race([
      requestSLM(context, config),
      createFallbackTimeout(),
    ]);

    if (result === null) {
      // Timeout — deliver rules-based fallback
      return {
        ...requestRules(context),
        fallbackFrom: "llm",
        error: `${llmError}; SLM fallback timed out`,
      };
    }

    return {
      ...result,
      fallbackFrom: "llm",
      error: llmError,
    };
  } catch (error) {
    const slmError =
      error instanceof Error ? error.message : "Unknown SLM error";

    return {
      ...requestRules(context),
      fallbackFrom: "slm",
      error: `${llmError}; SLM also failed: ${slmError}`,
    };
  }
}

/**
 * Creates a promise that resolves to null after the fallback delivery deadline.
 * Used to ensure fallback results are delivered within 2 seconds of failure.
 */
function createFallbackTimeout(): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), FALLBACK_DELIVERY_MS);
  });
}

/**
 * Delivers a rules-based fallback result, annotating it with the failure source.
 * Guaranteed to return synchronously (rules are deterministic, no I/O).
 */
function deliverFallback(
  context: AdaptationContext,
  failedTier: DecisionSource,
  errorMessage: string
): AdaptationDecision {
  return {
    ...requestRules(context),
    fallbackFrom: failedTier,
    error: errorMessage,
  };
}

// ---------------------------------------------------------------------------
// Exported Constants (for testing and devtools)
// ---------------------------------------------------------------------------

export const AI_TIMEOUTS = {
  LLM: LLM_TIMEOUT_MS,
  SLM: SLM_TIMEOUT_MS,
  FALLBACK_DELIVERY: FALLBACK_DELIVERY_MS,
} as const;
