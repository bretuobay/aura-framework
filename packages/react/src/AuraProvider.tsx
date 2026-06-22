/**
 * @aura/react — AuraProvider component
 *
 * Context provider that owns the AuraClient lifecycle: creates the client
 * on mount, initializes it (fire-and-forget), and disconnects on unmount.
 * Propagates client, status, and error to all descendant hooks via AuraContext.
 */

import { useEffect, useRef, useState } from "react";
import { createAuraClient } from "@aura/sdk";
import type { AuraClient, AuraClientError } from "@aura/sdk";
import type { CapabilityManifest, ConsentProfile, ContextModel } from "@aura/protocol";
import { AuraContext } from "./AuraContext";
import type { SdkStatus, AuraContextValue } from "./AuraContext";

/**
 * Props accepted by AuraProvider.
 * Maps directly to AuraClientConfig fields plus React children.
 */
export interface AuraProviderProps {
  endpoint: string;
  manifest: CapabilityManifest;
  userId: string;
  consentProfile: ConsentProfile;
  context: ContextModel;
  children?: React.ReactNode;
}

/**
 * AuraProvider creates and manages an AuraClient instance, making SDK state
 * available to all descendant components through AuraContext.
 *
 * - Renders children immediately and unconditionally (never blocks rendering).
 * - Handles config errors gracefully by entering degraded mode.
 * - Cleans up on unmount: unregisters error handler, awaits in-flight init,
 *   then disconnects the client.
 * - Compatible with React Strict Mode double-invocation.
 */
export function AuraProvider({
  endpoint,
  manifest,
  userId,
  consentProfile,
  context,
  children,
}: AuraProviderProps): React.JSX.Element {
  // ─── Refs (non-render infrastructure) ────────────────────────────────────────
  const clientRef = useRef<AuraClient | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const unmountedRef = useRef<boolean>(false);
  const errorUnsubRef = useRef<(() => void) | null>(null);

  // ─── State (render-triggering) ───────────────────────────────────────────────
  const [state, setState] = useState<{ status: SdkStatus; error: AuraClientError | null }>({
    status: "idle",
    error: null,
  });

  // ─── Mount effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Reset unmounted flag (supports Strict Mode re-mount after cleanup)
    unmountedRef.current = false;

    // Attempt to create the client
    let client: AuraClient;
    try {
      client = createAuraClient({ endpoint, manifest, userId, consentProfile, context });
    } catch (err) {
      // Config error → enter degraded mode
      setState({
        status: "degraded",
        error: err instanceof Error ? (err as AuraClientError) : null,
      });
      return;
    }

    // Store client in ref
    clientRef.current = client;

    // Register onError handler
    errorUnsubRef.current = client.onError((err: AuraClientError) => {
      if (!unmountedRef.current) {
        setState((prev) => ({ ...prev, error: err }));
      }
    });

    // Fire init (fire-and-forget) — SDK's init() never rejects
    initPromiseRef.current = client.init().then(() => {
      if (!unmountedRef.current) {
        setState((prev) => ({ ...prev, status: client.status }));
      }
    });

    // ─── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      // Signal that this instance is unmounted
      unmountedRef.current = true;

      // Unregister onError handler before disconnect
      if (errorUnsubRef.current) {
        errorUnsubRef.current();
        errorUnsubRef.current = null;
      }

      // Disconnect: await in-flight init if present, then disconnect
      const cleanup = async () => {
        if (initPromiseRef.current) {
          try {
            await initPromiseRef.current;
          } catch {
            // Suppress — init may have been interrupted
          }
        }
        try {
          clientRef.current?.disconnect();
        } catch {
          // Suppress — disconnect must never propagate errors
        }
        clientRef.current = null;
        initPromiseRef.current = null;
      };

      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Context value ───────────────────────────────────────────────────────────
  // Reconstructed each render. The provider only re-renders when state changes
  // (status/error), at which point children need to see the update anyway.
  // clientRef.current is set once during the effect and nulled only on unmount.
  // Reading ref.current during render to pass stable client instance to context is intentional.
  // eslint-disable-next-line react-hooks/refs
  const currentClient = clientRef.current;
  const contextValue: AuraContextValue = {
    client: currentClient,
    status: state.status,
    error: state.error,
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return <AuraContext.Provider value={contextValue}>{children}</AuraContext.Provider>;
}
