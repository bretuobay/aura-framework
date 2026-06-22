/**
 * @aura/react — useAuraFeedback hook
 *
 * Returns a stable function for submitting FeedbackEvent objects through the
 * underlying AuraClient. Safe to call outside an AuraProvider tree (returns a
 * no-op that resolves immediately). Never throws during the render phase.
 */

import { useContext, useCallback } from 'react';
import { AuraContext } from './AuraContext';
import type { FeedbackEvent } from '@aura/protocol';

/**
 * Get a stable feedback submission function from context.
 *
 * - Inside an `AuraProvider`: delegates to `client.feedback(feedbackEvent)`.
 * - Outside an `AuraProvider`: returns an async no-op resolving to `undefined`.
 * - The returned function reference is stable across re-renders (same identity
 *   unless the provider remounts).
 * - Never throws during render.
 */
export function useAuraFeedback(): (feedbackEvent: FeedbackEvent) => Promise<void> {
  const { client } = useContext(AuraContext);

  return useCallback(
    (feedbackEvent: FeedbackEvent): Promise<void> => {
      if (!client) {
        return Promise.resolve() as Promise<void>;
      }
      return client.feedback(feedbackEvent);
    },
    [client],
  );
}
