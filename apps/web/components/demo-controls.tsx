"use client";

/**
 * DemoControls component for the AURA E-Commerce Demo.
 *
 * Presenter-facing controls panel providing:
 * - Mode selector: Dropdown for 5 demo modes
 * - Scenario trigger buttons: 6 predefined scenario triggers
 * - Reset profile button: Resets user model to initial state
 * - Context switcher: Simulate device/accessibility contexts
 * - Mode indicator: Visual badge showing active mode
 *
 * When SIMULATE_ADAPTATIONS is true, predefined prescriptions override AI
 * responses regardless of other flag settings.
 *
 * @see Requirements 7.1, 7.6, 7.7, 11.3, 11.8
 */

import { useCallback } from "react";
import {
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  Accessibility,
  Play,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_MODES, MODE_LABELS } from "@/lib/demo/modes";
import { SCENARIO_IDS } from "@/lib/demo/scenarios";
import { getFlags } from "@/lib/config/flags";
import type { DemoMode } from "@/lib/types/demo";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Human-readable labels for scenario triggers */
const SCENARIO_LABELS: Record<string, string> = {
  "search-intent-detection": "Search Intent",
  "price-sensitive-user": "Price-Sensitive",
  "brand-preference": "Brand Preference",
  "cold-start": "Cold Start",
  "mobile-context": "Mobile Context",
  "accessibility-preference": "Accessibility",
};

/** Context switcher options */
const CONTEXT_OPTIONS = [
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "accessibility", label: "A11y", icon: Accessibility },
] as const;

/** Mode indicator color map */
const MODE_COLORS: Record<DemoMode, string> = {
  "rules-only": "bg-slate-500",
  "slm-enabled": "bg-blue-500",
  "llm-enabled": "bg-purple-500",
  "demo-simulation": "bg-amber-500",
  developer: "bg-emerald-500",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DemoControlsProps {
  /** Currently active demo mode */
  currentMode: DemoMode;
  /** Callback when demo mode is changed */
  onModeChange: (mode: DemoMode) => void;
  /** Callback when a scenario trigger is activated */
  onTriggerScenario: (scenarioId: string) => void;
  /** Callback to reset the user profile to initial state */
  onResetProfile: () => void;
  /** Optional callback for context changes (device/accessibility simulation) */
  onContextChange?: (context: string) => void;
  /** Optional className for the wrapper */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * DemoControls provides presenter-facing controls for managing the AURA demo.
 *
 * When SIMULATE_ADAPTATIONS is true, scenario triggers produce predefined
 * prescriptions that override any AI-generated responses (Requirement 11.3, 11.8).
 */
export function DemoControls({
  currentMode,
  onModeChange,
  onTriggerScenario,
  onResetProfile,
  onContextChange,
  className,
}: DemoControlsProps) {
  const flags = getFlags();

  const handleModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onModeChange(e.target.value as DemoMode);
    },
    [onModeChange]
  );

  const handleScenarioTrigger = useCallback(
    (scenarioId: string) => {
      // When SIMULATE_ADAPTATIONS is true, predefined prescriptions
      // override AI (Requirement 11.3, 11.8)
      onTriggerScenario(scenarioId);
    },
    [onTriggerScenario]
  );

  const handleContextChange = useCallback(
    (context: string) => {
      onContextChange?.(context);
    },
    [onContextChange]
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-4",
        className
      )}
      role="region"
      aria-label="Demo Controls"
    >
      {/* Mode Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">Demo Controls</span>
        </div>
        <ModeIndicator mode={currentMode} />
      </div>

      {/* Mode Selector */}
      <div className="space-y-1.5">
        <label
          htmlFor="demo-mode-select"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Mode
        </label>
        <select
          id="demo-mode-select"
          value={currentMode}
          onChange={handleModeChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Select demo mode"
        >
          {ALL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>

      {/* Scenario Triggers */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Scenarios
        </span>
        {flags.SIMULATE_ADAPTATIONS && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Simulation active — prescriptions override AI
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {SCENARIO_IDS.map((scenarioId) => (
            <button
              key={scenarioId}
              type="button"
              onClick={() => handleScenarioTrigger(scenarioId)}
              className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              aria-label={`Trigger ${SCENARIO_LABELS[scenarioId] ?? scenarioId} scenario`}
            >
              <Play className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {SCENARIO_LABELS[scenarioId] ?? scenarioId}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Context Switcher */}
      {onContextChange && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Context
          </span>
          <div className="flex gap-1.5">
            {CONTEXT_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleContextChange(id)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                aria-label={`Switch to ${label} context`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset Profile */}
      <button
        type="button"
        onClick={onResetProfile}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        aria-label="Reset user profile"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reset Profile
      </button>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * ModeIndicator displays a visual badge showing the currently active demo mode.
 */
function ModeIndicator({ mode }: { mode: DemoMode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground"
      role="status"
      aria-label={`Current mode: ${MODE_LABELS[mode]}`}
    >
      <span
        className={cn("h-2 w-2 rounded-full", MODE_COLORS[mode])}
        aria-hidden="true"
      />
      {MODE_LABELS[mode]}
    </span>
  );
}

export default DemoControls;
