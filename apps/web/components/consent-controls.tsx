"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { consentManager, isConsentEnabled } from "@/lib/governance/consent";
import type { ConsentState } from "@/lib/types/explanation";

export interface ConsentControlsProps {
  onChange?: (state: ConsentState) => void;
  onPersonalizationRevoked?: () => void;
  className?: string;
}

export function ConsentControls({
  onChange,
  onPersonalizationRevoked,
  className,
}: ConsentControlsProps) {
  const [enabled] = useState(() => isConsentEnabled());
  const [state, setState] = useState<ConsentState>(() =>
    consentManager.getConsentState()
  );

  useEffect(() => {
    const unsubscribeChange = consentManager.onChange((next) => {
      setState(next);
      onChange?.(next);
    });
    const unsubscribeRevocation = consentManager.onRevocation(() => {
      onPersonalizationRevoked?.();
    });
    return () => {
      unsubscribeChange();
      unsubscribeRevocation();
    };
  }, [onChange, onPersonalizationRevoked]);

  if (!enabled) return null;

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Consent controls"
    >
      <div className="border-t border-panel-border pt-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-panel-muted">
          Consent
        </span>
      </div>
      <div className="space-y-2">
        <ConsentToggle
          label="Behavior tracking"
          icon={ShieldCheck}
          checked={state.behavior}
          onChange={(checked) => consentManager.setConsent("behavior", checked)}
        />
        <ConsentToggle
          label="Personalization"
          icon={UserCircle}
          checked={state.personalization}
          onChange={(checked) =>
            consentManager.setConsent("personalization", checked)
          }
        />
      </div>
    </section>
  );
}

function ConsentToggle({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-panel-border bg-panel-border/40 px-3 py-2 text-sm transition-colors hover:border-panel-accent/40">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-panel-accent" aria-hidden="true" />
        <span className="text-panel-foreground">{label}</span>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            "h-5 w-9 rounded-full border transition-colors",
            checked
              ? "border-panel-accent bg-panel-accent/30"
              : "border-panel-border bg-panel-border/60"
          )}
        >
          <div
            className={cn(
              "m-0.5 h-4 w-4 rounded-full transition-transform",
              checked
                ? "translate-x-4 bg-panel-accent"
                : "translate-x-0 bg-panel-muted"
            )}
          />
        </div>
      </div>
    </label>
  );
}
