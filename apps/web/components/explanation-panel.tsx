"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFlags } from "@/lib/config/flags";
import type { Explanation } from "@/lib/types/explanation";

export interface ExplanationPanelProps {
  explanation?: Explanation | null;
  onUndo?: () => void;
  className?: string;
}

export function ExplanationPanel({
  explanation,
  onUndo,
  className,
}: ExplanationPanelProps) {
  const flags = getFlags();
  if (!flags.ENABLE_EXPLANATIONS) return null;

  const text =
    explanation?.text ??
    "No adaptation is active. Trigger a demo scenario to inspect the reason.";

  return (
    <section
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      aria-label="Adaptation explanation"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Explanation</h2>
        </div>
        {explanation && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {Math.round(explanation.confidence)}%
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      {explanation && explanation.factors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {explanation.factors.map((factor) => (
            <span
              key={`${factor.category}-${factor.description}`}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {factor.category}
            </span>
          ))}
        </div>
      )}
      {explanation && onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="mt-3 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Undo adaptation
        </button>
      )}
    </section>
  );
}
