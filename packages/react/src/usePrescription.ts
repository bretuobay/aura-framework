/**
 * @aura/react — usePrescription hook
 *
 * Per-surface prescription subscription hook. Subscribes to the SDK's
 * PrescriptionStore for a given surfaceId and returns the current
 * UIPrescription or undefined.
 *
 * Requirements: 5.1–5.12, 9.1–9.6
 */

import { useContext, useState, useEffect } from "react";
import { AuraContext } from "./AuraContext";
import type { UIPrescription } from "@aura/protocol";

/**
 * Subscribe to the current prescription for a given surface.
 *
 * - Returns `undefined` when outside an `AuraProvider`, when the SDK
 *   is degraded/idle, or when no prescription exists for the surface.
 * - Never throws during the React render phase.
 * - Each hook instance manages its own independent subscription, providing
 *   surface isolation (prescriptions for surface A never cause re-renders
 *   in components subscribed to surface B).
 * - On unmount or `surfaceId` change, the previous subscription is cleaned up.
 */
export function usePrescription(surfaceId: string): UIPrescription | undefined {
  const { client, status } = useContext(AuraContext);
  const [prescription, setPrescription] = useState<UIPrescription | undefined>(undefined);

  useEffect(() => {
    // No client available (outside provider) or SDK is in degraded mode
    if (!client || status === "degraded") {
      setPrescription(undefined);
      return;
    }

    // Subscribe to the surface's prescription updates
    const unsubscribe = client.subscribe(surfaceId, (rx) => {
      setPrescription(rx);
    });

    // Cleanup: unsubscribe on unmount or when surfaceId/client/status changes
    return () => {
      unsubscribe();
    };
  }, [client, surfaceId, status]);

  return prescription;
}
