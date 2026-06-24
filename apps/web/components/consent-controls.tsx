"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
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
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      aria-label="Consent controls"
    >
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Consent</h2>
      </div>
      <div className="space-y-2">
        <ConsentToggle
          label="Behavior tracking"
          checked={state.behavior}
          onChange={(checked) => consentManager.setConsent("behavior", checked)}
        />
        <ConsentToggle
          label="Personalization"
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
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
    </label>
  );
}
