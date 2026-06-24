"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RiskOverlayProps {
  open: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  className?: string;
}

export function RiskOverlay({
  open,
  title,
  message,
  onDismiss,
  className,
}: RiskOverlayProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-40 max-w-sm rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg",
        className
      )}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
