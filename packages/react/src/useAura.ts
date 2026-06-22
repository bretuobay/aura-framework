/**
 * @aura/react — useAura hook
 *
 * Returns the current SDK status and most recent error from AuraContext.
 * Safe to call outside an AuraProvider tree (returns degraded defaults).
 * Never throws during the render phase.
 */

import { useContext } from 'react';
import { AuraContext } from './AuraContext';
import type { SdkStatus } from './AuraContext';
import type { AuraClientError } from '@aura/sdk';

/**
 * Read the current AURA SDK status and error from context.
 *
 * - Inside an `AuraProvider`: returns live status and error values.
 * - Outside an `AuraProvider`: returns `{ status: "degraded", error: null }`.
 * - Never throws.
 */
export function useAura(): { status: SdkStatus; error: AuraClientError | null } {
  const { status, error } = useContext(AuraContext);
  return { status, error };
}
