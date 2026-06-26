"use client";

import { useCallback } from "react";
import {
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  Accessibility,
  Search,
  Tag,
  Award,
  Sparkles,
  Terminal,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_MODES, MODE_LABELS } from "@/lib/demo/modes";
import { SCENARIO_IDS } from "@/lib/demo/scenarios";
import { getFlags } from "@/lib/config/flags";
import type { DemoMode } from "@/lib/types/demo";

// ─── Constants ───────────────────────────────────────────────────────────────

const SCENARIO_LABELS: Record<string, string> = {
  "search-intent-detection": "Search Intent",
  "price-sensitive-user": "Price-Sensitive",
  "brand-preference": "Brand Preference",
  "cold-start": "Cold Start",
  "mobile-context": "Mobile Context",
  "accessibility-preference": "Accessibility",
};

const SCENARIO_ICONS: Record<string, React.ElementType> = {
  "search-intent-detection": Search,
  "price-sensitive-user": Tag,
  "brand-preference": Award,
  "cold-start": Sparkles,
  "mobile-context": Smartphone,
  "accessibility-preference": Accessibility,
};

const CONTEXT_OPTIONS = [
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "accessibility", label: "A11y", icon: Accessibility },
] as const;

const MODE_COLORS: Record<DemoMode, string> = {
  "rules-only": "bg-slate-400",
  "slm-enabled": "bg-blue-400",
  "llm-enabled": "bg-panel-accent",
  "demo-simulation": "bg-amber-400",
  developer: "bg-emerald-400",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DemoControlsProps {
  currentMode: DemoMode;
  onModeChange: (mode: DemoMode) => void;
  onTriggerScenario: (scenarioId: string) => void;
  onResetProfile: () => void;
  onContextChange?: (context: string) => void;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

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
      className={cn("space-y-4", className)}
      role="region"
      aria-label="Demo Controls"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-panel-accent" aria-hidden="true" />
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-panel-foreground">
            AURA Framework
          </span>
        </div>
        <ModeIndicator mode={currentMode} />
      </div>

      {/* Mode Selector */}
      <div className="space-y-1.5">
        <label
          htmlFor="demo-mode-select"
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-panel-muted"
        >
          <Settings2 className="h-3 w-3" aria-hidden="true" />
          Mode
        </label>
        <select
          id="demo-mode-select"
          value={currentMode}
          onChange={handleModeChange}
          className="w-full rounded-md border border-panel-border bg-panel-border/60 px-3 py-2 text-sm text-panel-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent"
          aria-label="Select demo mode"
        >
          {ALL_MODES.map((mode) => (
            <option key={mode} value={mode} className="bg-panel text-panel-foreground">
              {MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>

      {/* Scenario Triggers */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-panel-muted">
          Scenarios
        </span>
        {flags.SIMULATE_ADAPTATIONS && (
          <p className="text-xs text-amber-400">
            Simulation active — prescriptions override AI
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {SCENARIO_IDS.map((scenarioId) => {
            const Icon = SCENARIO_ICONS[scenarioId] ?? Search;
            return (
              <button
                key={scenarioId}
                type="button"
                onClick={() => handleScenarioTrigger(scenarioId)}
                className="flex items-center gap-1.5 rounded-md border border-panel-border bg-panel-border/40 px-2.5 py-1.5 text-xs font-medium text-panel-foreground transition-colors hover:border-panel-accent/50 hover:bg-panel-accent/10 hover:text-panel-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent"
                aria-label={`Trigger ${SCENARIO_LABELS[scenarioId] ?? scenarioId} scenario`}
              >
                <Icon className="h-3 w-3 shrink-0 text-panel-accent" aria-hidden="true" />
                <span className="truncate">{SCENARIO_LABELS[scenarioId] ?? scenarioId}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Context Switcher */}
      {onContextChange && (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-panel-muted">
            Context
          </span>
          <div className="flex gap-1.5">
            {CONTEXT_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleContextChange(id)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-md border border-panel-border bg-panel-border/40 px-2 py-1.5 text-xs text-panel-foreground transition-colors hover:border-panel-accent/50 hover:bg-panel-accent/10 hover:text-panel-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent"
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
        className="flex w-full items-center justify-center gap-2 rounded-md border border-panel-border bg-panel-border/40 px-3 py-2 text-sm font-medium text-panel-foreground transition-colors hover:border-red-500/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent"
        aria-label="Reset user profile"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reset Profile
      </button>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ModeIndicator({ mode }: { mode: DemoMode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-panel-border px-2.5 py-0.5 text-xs font-medium text-panel-foreground"
      role="status"
      aria-label={`Current mode: ${MODE_LABELS[mode]}`}
    >
      <span className={cn("h-2 w-2 rounded-full", MODE_COLORS[mode])} aria-hidden="true" />
      {MODE_LABELS[mode]}
    </span>
  );
}

export default DemoControls;
