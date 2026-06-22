/**
 * @aura/react — Internal React context definition
 *
 * This module defines the AuraContext used internally to propagate
 * the AuraClient instance and SDK state to descendant hooks.
 * NOT exported from the public API.
 */

import { createContext } from 'react';
import type { AuraClient, AuraClientError } from '@aura/sdk';

/**
 * The lifecycle status of the SDK client.
 * Mirrors `AuraClientStatus` from `@aura/sdk` but re-exported
 * under the React adapter's naming convention.
 */
export type SdkStatus = AuraClient['status'];

/**
 * The shape of the value propagated through AuraContext.
 */
export interface AuraContextValue {
  client: AuraClient | null;
  status: SdkStatus;
  error: AuraClientError | null;
}

/**
 * Internal React context for the AURA SDK.
 *
 * Default value provides safe fallbacks when hooks are used outside
 * an AuraProvider tree:
 * - client: null (no SDK available)
 * - status: "degraded" (signals SDK unavailable)
 * - error: null (no error to report)
 */
export const AuraContext = createContext<AuraContextValue>({
  client: null,
  status: 'degraded',
  error: null,
});
