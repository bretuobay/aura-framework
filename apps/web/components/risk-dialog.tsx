"use client";

import { cn } from "@/lib/utils";

export interface RiskDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function RiskDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  className,
}: RiskDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div
        className={cn(
          "w-full max-w-md rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-xl",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="risk-dialog-title"
      >
        <h2 id="risk-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
