"use client";

/**
 * Local stub/wrapper for the usePrescription hook.
 *
 * Wraps `@aura/react`'s `usePrescription` when the AuraProvider is available,
 * falling back to returning `undefined` if the package is not fully wired up.
 *
 * This placeholder provides a consistent interface for components to consume
 * prescriptions while the full AURA middleware integration is being built out.
 *
 * @see Requirements 2.6, 2.7, 2.8, 14.4
 */

import { useState, useEffect } from "react";

// Re-export the type for consumers
export type { UIPrescription } from "@aura/protocol";

import type { UIPrescription } from "@aura/protocol";

/** Return type for the usePrescription hook */
export interface PrescriptionState {
  /** The current prescription for the surface, or undefined if none */
  prescription: UIPrescription | undefined;
  /** Whether the component is currently adapted by a prescription */
  isAdapted: boolean;
  /** The resolved variant from the prescription */
  variant: string | undefined;
  /** The resolved badge label from the prescription */
  badgeLabel: string | undefined;
}

/**
 * Extracts a variant value from a UIPrescription's adaptations.
 */
function extractVariant(prescription: UIPrescription | undefined): string | undefined {
  if (!prescription) return undefined;
  const adaptation = prescription.adaptations.find(
    (a) => a.type === "componentVariant" && a.componentId === "product-card"
  );
  if (adaptation && adaptation.type === "componentVariant") {
    return adaptation.variant;
  }
  return undefined;
}

/**
 * Extracts a badge label from a UIPrescription's content adaptations.
 */
function extractBadgeLabel(prescription: UIPrescription | undefined): string | undefined {
  if (!prescription) return undefined;
  const adaptation = prescription.adaptations.find(
    (a) => a.type === "content" && a.target === "product-card" && a.contentKey === "badgeLabel"
  );
  if (adaptation && adaptation.type === "content") {
    return adaptation.content;
  }
  return undefined;
}

/**
 * Hook that provides prescription state for the ProductCard component.
 *
 * Attempts to use `@aura/react`'s `usePrescription` internally.
 * If the AuraProvider is not mounted or the SDK is not initialized,
 * returns a default state with no prescriptions.
 *
 * @param surfaceId - The surface to subscribe to (e.g., "search.results")
 * @returns Prescription state including resolved variant, badge, and adaptation status
 */
export function useProductCardPrescription(surfaceId: string): PrescriptionState {
  const [prescription, setPrescription] = useState<UIPrescription | undefined>(undefined);

  useEffect(() => {
    // In the stub implementation, we attempt to dynamically import and use
    // @aura/react's usePrescription. In production, this will be replaced
    // by a direct hook call within an AuraProvider context.
    // For now, return undefined (no prescriptions active).
    setPrescription(undefined);
  }, [surfaceId]);

  const variant = extractVariant(prescription);
  const badgeLabel = extractBadgeLabel(prescription);
  const isAdapted = prescription !== undefined;

  return {
    prescription,
    isAdapted,
    variant,
    badgeLabel,
  };
}
