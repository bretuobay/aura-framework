/**
 * Simulation Flags Configuration
 *
 * Reads boolean environment variables controlling AI integration,
 * simulation behavior, devtools visibility, explanation panels,
 * and consent controls.
 *
 * All flags use NEXT_PUBLIC_ prefix for client-side access in Next.js.
 * Values are parsed as booleans: "true" (case-insensitive) → true,
 * everything else → false.
 *
 * @see Requirements 11.1, 11.2, 11.4, 11.5, 11.7
 */

export interface SimulationFlags {
  /** When true, use real LLM via OpenRouter for adaptation reasoning */
  USE_REAL_LLM: boolean;
  /** When true, use real SLM for classification tasks */
  USE_REAL_SLM: boolean;
  /** When true, apply predefined prescriptions regardless of AI availability */
  SIMULATE_ADAPTATIONS: boolean;
  /** When true, display Devtools Overlay on initial page load */
  SHOW_DEVTOOLS: boolean;
  /** When true, display explanation panels alongside adaptations */
  ENABLE_EXPLANATIONS: boolean;
  /** When true, display consent controls in the UI */
  ENABLE_CONSENT: boolean;
}

/**
 * Parses a string environment variable value to a boolean.
 * Only "true" (case-insensitive) is treated as true.
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value.toLowerCase() === "true";
}

/**
 * Reads simulation flags from environment variables.
 *
 * Uses NEXT_PUBLIC_ prefixed env vars for client-side availability.
 * Falls back to non-prefixed vars for server-side usage.
 */
export function getFlags(): SimulationFlags {
  return {
    USE_REAL_LLM: parseBoolean(
      process.env.NEXT_PUBLIC_USE_REAL_LLM ?? process.env.USE_REAL_LLM,
      false
    ),
    USE_REAL_SLM: parseBoolean(
      process.env.NEXT_PUBLIC_USE_REAL_SLM ?? process.env.USE_REAL_SLM,
      false
    ),
    SIMULATE_ADAPTATIONS: parseBoolean(
      process.env.NEXT_PUBLIC_SIMULATE_ADAPTATIONS ?? process.env.SIMULATE_ADAPTATIONS,
      false
    ),
    SHOW_DEVTOOLS: parseBoolean(
      process.env.NEXT_PUBLIC_SHOW_DEVTOOLS ?? process.env.SHOW_DEVTOOLS,
      false
    ),
    ENABLE_EXPLANATIONS: parseBoolean(
      process.env.NEXT_PUBLIC_ENABLE_EXPLANATIONS ?? process.env.ENABLE_EXPLANATIONS,
      true
    ),
    ENABLE_CONSENT: parseBoolean(
      process.env.NEXT_PUBLIC_ENABLE_CONSENT ?? process.env.ENABLE_CONSENT,
      true
    ),
  };
}

/**
 * Pre-resolved flags constant for use in components and hooks.
 * Evaluates once at module load time.
 */
export const flags: SimulationFlags = getFlags();
