/**
 * Demo mode and simulation types for the AURA E-Commerce Demo.
 * Controls which decision tiers and behaviors are active.
 */

/**
 * The 5 demo modes controlling the application's behavior.
 *
 * - "rules-only": Deterministic rules only, no AI
 * - "slm-enabled": Rules + small language model for classification
 * - "llm-enabled": Rules + SLM + full LLM for reasoning/explanations
 * - "demo-simulation": Preset scenarios regardless of AI availability
 * - "developer": Rules with devtools overlay visible
 */
export type DemoMode =
  | "rules-only"
  | "slm-enabled"
  | "llm-enabled"
  | "demo-simulation"
  | "developer";

/**
 * Configuration for a demo mode, determining which tiers are active.
 */
export interface DemoModeConfig {
  useRules: boolean;
  useSLM: boolean;
  useLLM: boolean;
  simulate: boolean;
  showDevtools: boolean;
}

/**
 * Static mapping of demo modes to their configurations.
 */
export const DEMO_MODE_CONFIGS: Record<DemoMode, DemoModeConfig> = {
  "rules-only": {
    useRules: true,
    useSLM: false,
    useLLM: false,
    simulate: false,
    showDevtools: false,
  },
  "slm-enabled": {
    useRules: true,
    useSLM: true,
    useLLM: false,
    simulate: false,
    showDevtools: false,
  },
  "llm-enabled": {
    useRules: true,
    useSLM: true,
    useLLM: true,
    simulate: false,
    showDevtools: false,
  },
  "demo-simulation": {
    useRules: true,
    useSLM: false,
    useLLM: false,
    simulate: true,
    showDevtools: false,
  },
  developer: {
    useRules: true,
    useSLM: false,
    useLLM: false,
    simulate: false,
    showDevtools: true,
  },
};

/**
 * Environment-driven simulation flags controlling AI and demo behavior.
 * Read from environment variables at runtime.
 *
 * @see Requirements 11.1
 */
export interface SimulationFlags {
  USE_REAL_LLM: boolean;
  USE_REAL_SLM: boolean;
  SIMULATE_ADAPTATIONS: boolean;
  SHOW_DEVTOOLS: boolean;
  ENABLE_EXPLANATIONS: boolean;
  ENABLE_CONSENT: boolean;
}
