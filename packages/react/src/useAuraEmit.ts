/**
 * @aura/react — useAuraEmit hook
 *
 * Returns a stable function reference for emitting AuraEvent objects
 * through the underlying AuraClient. When called outside an AuraProvider
 * tree (client is null), the returned function resolves immediately
 * as a no-op. Never throws during the React render phase.
 */

import { useContext, useCallback } from 'react';
import type { AuraEvent } from '@aura/protocol';
import { AuraContext } from './AuraContext';

/**
 * Hook that returns a stable emit function for sending AuraEvent objects
 * through the SDK.
 *
 * - Delegates to `auraClient.emit(event)` when the SDK is available.
 * - Returns a no-op resolved promise when outside a provider tree.
 * - The returned function identity is stable across re-renders (same
 *   reference as long as the AuraProvider instance has not remounted).
 * - Never throws during the render phase.
 */
export function useAuraEmit(): (event: AuraEvent) => Promise<void> {
  const { client } = useContext(AuraContext);

  return useCallback(
    (event: AuraEvent): Promise<void> => {
      if (!client) {
        return Promise.resolve();
      }
      return client.emit(event);
    },
    [client]
  );
}
