/**
 * Demo Mode System for the AURA E-Commerce Demo.
 *
 * Framework-agnostic implementation managing 5 demo modes that control
 * which decision tiers (rules, SLM, LLM) and behaviors are active.
 * React hooks wrap this module for component integration.
 *
 * Features:
 * - Tracks current mode (default: "rules-only")
 * - Instant mode switching without page reload (<500ms, state-based)
 * - Checks AI availability via simulation flags and API key presence
 * - Falls back to "rules-only" with notification when AI is unavailable
 * - Provides current config and available modes with availability status
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8, 7.9
 */

import type { DemoMode, DemoModeConfig } from "@/lib/types/demo";
import { DEMO_MODE_CONFIGS } from "@/lib/types/demo";
import { getFlags } from "@/lib/config/flags";
import { isLLMAvailable, isSLMAvailable } from "@/lib/ai/provider";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default demo mode on initial load (Requirement 7.8) */
export const DEFAULT_MODE: DemoMode = "rules-only";

/** All valid demo modes in display order */
export const ALL_MODES: DemoMode[] = [
  "rules-only",
  "slm-enabled",
  "llm-enabled",
  "demo-simulation",
  "developer",
];

/** Human-readable labels for each demo mode */
export const MODE_LABELS: Record<DemoMode, string> = {
  "rules-only": "Rules Only",
  "slm-enabled": "SLM Enabled",
  "llm-enabled": "LLM Enabled",
  "demo-simulation": "Demo Simulation",
  developer: "Developer",
};

/** Descriptions for each mode */
export const MODE_DESCRIPTIONS: Record<DemoMode, string> = {
  "rules-only": "Deterministic rules only, no AI models",
  "slm-enabled": "Rules + small language model for classification",
  "llm-enabled": "Rules + SLM + full LLM for reasoning and explanations",
  "demo-simulation": "Preset scenarios regardless of AI availability",
  developer: "Rules with devtools overlay visible",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Availability status for a demo mode.
 */
export interface ModeAvailability {
  /** The demo mode */
  mode: DemoMode;
  /** Human-readable label */
  label: string;
  /** Description of what this mode does */
  description: string;
  /** Whether this mode is available given current configuration */
  available: boolean;
  /** Reason the mode is unavailable (if not available) */
  unavailableReason?: string;
}

/**
 * Result of a mode switch operation.
 */
export interface ModeSwitchResult {
  /** Whether the switch succeeded */
  success: boolean;
  /** The mode that was actually applied (may differ from requested if fallback occurred) */
  activeMode: DemoMode;
  /** The configuration for the active mode */
  config: DemoModeConfig;
  /** Whether a fallback occurred */
  didFallback: boolean;
  /** Notification message (set when AI unavailability causes a fallback) */
  notification?: string;
}

/**
 * Subscriber callback for mode change events.
 */
export type ModeChangeListener = (result: ModeSwitchResult) => void;

// ---------------------------------------------------------------------------
// DemoModeManager
// ---------------------------------------------------------------------------

/**
 * Manages the demo mode lifecycle for the AURA E-Commerce Demo.
 *
 * This class is framework-agnostic — React hooks (useDemoMode) wrap it
 * for component integration. It handles:
 * - Current mode tracking with a default of "rules-only"
 * - Mode switching without page reload (pure state change, <500ms)
 * - AI availability checks using simulation flags and API key presence
 * - Graceful fallback to "rules-only" with notification when AI unavailable
 *
 * @example
 * ```ts
 * const manager = new DemoModeManager();
 * const result = manager.switchMode("llm-enabled");
 * if (result.didFallback) {
 *   console.warn(result.notification);
 * }
 * ```
 */
export class DemoModeManager {
  private currentMode: DemoMode;
  private listeners: Set<ModeChangeListener>;

  constructor(initialMode: DemoMode = DEFAULT_MODE) {
    this.currentMode = initialMode;
    this.listeners = new Set();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns the currently active demo mode.
   */
  getCurrentMode(): DemoMode {
    return this.currentMode;
  }

  /**
   * Returns the configuration for the currently active mode.
   */
  getCurrentConfig(): DemoModeConfig {
    return DEMO_MODE_CONFIGS[this.currentMode];
  }

  /**
   * Switches to a new demo mode.
   *
   * If the requested mode requires AI (SLM or LLM) and the corresponding
   * service is unavailable, falls back to "rules-only" and returns a
   * notification message explaining the fallback.
   *
   * Mode switching is purely state-based (no page reload, <500ms).
   *
   * @param targetMode - The demo mode to switch to
   * @returns A ModeSwitchResult describing the outcome
   *
   * @see Requirements 7.7, 7.9
   */
  switchMode(targetMode: DemoMode): ModeSwitchResult {
    // Validate the target mode
    if (!isValidMode(targetMode)) {
      return {
        success: false,
        activeMode: this.currentMode,
        config: this.getCurrentConfig(),
        didFallback: false,
        notification: `Unknown mode: "${targetMode}". Keeping current mode.`,
      };
    }

    const targetConfig = DEMO_MODE_CONFIGS[targetMode];

    // Check AI availability for modes that require it
    if (targetConfig.useSLM && !isSLMAvailable()) {
      // SLM required but unavailable → fallback
      this.currentMode = DEFAULT_MODE;
      const result: ModeSwitchResult = {
        success: true,
        activeMode: DEFAULT_MODE,
        config: DEMO_MODE_CONFIGS[DEFAULT_MODE],
        didFallback: true,
        notification: `SLM is unavailable. Falling back to "${MODE_LABELS[DEFAULT_MODE]}" mode.`,
      };
      this.notifyListeners(result);
      return result;
    }

    if (targetConfig.useLLM && !isLLMAvailable()) {
      // LLM required but unavailable → fallback
      this.currentMode = DEFAULT_MODE;
      const result: ModeSwitchResult = {
        success: true,
        activeMode: DEFAULT_MODE,
        config: DEMO_MODE_CONFIGS[DEFAULT_MODE],
        didFallback: true,
        notification: `LLM is unavailable. Falling back to "${MODE_LABELS[DEFAULT_MODE]}" mode.`,
      };
      this.notifyListeners(result);
      return result;
    }

    // Mode is available — apply it
    this.currentMode = targetMode;
    const result: ModeSwitchResult = {
      success: true,
      activeMode: targetMode,
      config: targetConfig,
      didFallback: false,
    };
    this.notifyListeners(result);
    return result;
  }

  /**
   * Returns all modes with their availability status.
   *
   * Checks each mode against current simulation flags and API key
   * configuration to determine whether it can be activated.
   */
  getAvailableModes(): ModeAvailability[] {
    return ALL_MODES.map((mode) => {
      const config = DEMO_MODE_CONFIGS[mode];
      const { available, reason } = checkModeAvailability(config, mode);

      return {
        mode,
        label: MODE_LABELS[mode],
        description: MODE_DESCRIPTIONS[mode],
        available,
        unavailableReason: reason,
      };
    });
  }

  /**
   * Resets the manager to the default mode ("rules-only").
   */
  reset(): ModeSwitchResult {
    return this.switchMode(DEFAULT_MODE);
  }

  /**
   * Subscribe to mode change events.
   * @returns An unsubscribe function
   */
  subscribe(listener: ModeChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private notifyListeners(result: ModeSwitchResult): void {
    for (const listener of this.listeners) {
      listener(result);
    }
  }
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Validates whether a string is a valid DemoMode.
 */
export function isValidMode(mode: string): mode is DemoMode {
  return mode in DEMO_MODE_CONFIGS;
}

/**
 * Checks the availability of a specific mode based on current flags and AI config.
 *
 * @param config - The DemoModeConfig for the mode being checked
 * @param mode - The DemoMode identifier (for descriptive messages)
 * @returns An object with `available` boolean and optional `reason` string
 */
function checkModeAvailability(
  config: DemoModeConfig,
  mode: DemoMode
): { available: boolean; reason?: string } {
  // "rules-only", "demo-simulation", and "developer" are always available
  if (!config.useSLM && !config.useLLM) {
    return { available: true };
  }

  // Check SLM availability
  if (config.useSLM && !isSLMAvailable()) {
    const flags = getFlags();
    if (!flags.USE_REAL_SLM) {
      return {
        available: false,
        reason: "SLM is disabled (USE_REAL_SLM=false)",
      };
    }
    return {
      available: false,
      reason: "SLM model is not configured",
    };
  }

  // Check LLM availability
  if (config.useLLM && !isLLMAvailable()) {
    const flags = getFlags();
    if (!flags.USE_REAL_LLM) {
      return {
        available: false,
        reason: "LLM is disabled (USE_REAL_LLM=false)",
      };
    }
    return {
      available: false,
      reason: "LLM API key is not configured",
    };
  }

  return { available: true };
}

// ---------------------------------------------------------------------------
// Singleton Instance (optional convenience)
// ---------------------------------------------------------------------------

/**
 * Shared DemoModeManager instance for use across the application.
 * React hooks can wrap this or create their own instance.
 */
export const demoModeManager = new DemoModeManager();
