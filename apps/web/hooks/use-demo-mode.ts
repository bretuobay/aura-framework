"use client";

/**
 * Demo mode hook for the AURA E-Commerce Demo.
 *
 * Manages demo mode state (5 modes), provides scenario triggering,
 * and profile reset functionality. Emits AURA events for mode changes
 * and scenario triggers.
 *
 * @see Requirements 7.1, 7.7
 */

import { useState, useCallback } from "react";
import type { DemoMode } from "@/lib/types";
import { DEMO_MODE_CONFIGS } from "@/lib/types";
import { useAuraEmit } from "@aura/react";

export interface UseDemoMode {
  /** Currently active demo mode */
  mode: DemoMode;
  /** Switch to a different demo mode */
  setMode: (m: DemoMode) => void;
  /** Trigger a predefined adaptation scenario by ID */
  triggerScenario: (scenarioId: string) => void;
  /** Reset the user profile to its initial state */
  resetProfile: () => void;
}

/** Default demo mode on initial load (Requirement 7.8) */
const DEFAULT_MODE: DemoMode = "rules-only";

/**
 * Hook that manages demo mode state and provides scenario triggering.
 *
 * - Supports 5 demo modes: rules-only, slm-enabled, llm-enabled, demo-simulation, developer
 * - Defaults to "rules-only" mode on initial load (Requirement 7.8)
 * - Mode changes apply within 500ms without page reload (Requirement 7.7)
 * - Triggers predefined adaptation scenarios for conference demonstrations
 * - Emits AURA events for mode changes and scenario triggers
 *
 * @see Requirements 7.1, 7.7
 */
export function useDemoMode(): UseDemoMode {
  const [mode, setModeState] = useState<DemoMode>(DEFAULT_MODE);
  const emit = useAuraEmit();

  /**
   * Switch to a different demo mode.
   * Validates the mode against DEMO_MODE_CONFIGS before applying.
   * Emits a context.changed event for the mode switch.
   *
   * @see Requirement 7.7
   */
  const setMode = useCallback(
    (m: DemoMode) => {
      // Validate the mode exists in configuration
      if (!(m in DEMO_MODE_CONFIGS)) {
        return;
      }

      setModeState(m);

      // Emit context.changed event for the mode switch
      void emit({
        type: "context.changed",
        surfaceId: "demo.controls",
        timestamp: new Date().toISOString(),
        payload: {
          property: "demo.mode",
          value: m,
        },
      });
    },
    [emit],
  );

  /**
   * Trigger a predefined adaptation scenario.
   * Emits an interaction.clicked event to signal the scenario trigger,
   * which the AURA middleware processes to generate prescriptions.
   *
   * @param scenarioId - Identifier of the scenario to trigger
   * @see Requirements 12.1–12.8
   */
  const triggerScenario = useCallback(
    (scenarioId: string) => {
      // Emit interaction event to trigger the scenario in the AURA middleware
      void emit({
        type: "interaction.clicked",
        surfaceId: "demo.controls",
        timestamp: new Date().toISOString(),
        payload: {
          elementType: "product",
          elementId: `scenario:${scenarioId}`,
        },
      });
    },
    [emit],
  );

  /**
   * Reset the user profile to its initial state.
   * Clears any accumulated user model data and reverts
   * all adaptations to defaults.
   */
  const resetProfile = useCallback(() => {
    // Emit context.changed event to signal profile reset
    void emit({
      type: "context.changed",
      surfaceId: "demo.controls",
      timestamp: new Date().toISOString(),
      payload: {
        property: "user.profile",
        value: "reset",
      },
    });
  }, [emit]);

  return {
    mode,
    setMode,
    triggerScenario,
    resetProfile,
  };
}
