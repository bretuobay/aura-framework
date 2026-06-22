// Feature: aura-react, Property 5: Surface Isolation
// **Validates: Requirements 5.10, 9.1, 9.2, 12.5**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import React, { useRef } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { arbUIPrescription } from '../arbitraries/prescription.arbitrary';
import type { UIPrescription } from '@aura/protocol';

// Track subscriptions per surfaceId for controlled delivery
const subscriptions = new Map<string, (p: UIPrescription | undefined) => void>();

vi.mock('@aura/sdk', () => ({
  createAuraClient: vi.fn(() => ({
    status: 'active',
    init: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    emit: vi.fn(),
    feedback: vi.fn(),
    subscribe: vi.fn((surfaceId: string, listener: (p: UIPrescription | undefined) => void) => {
      subscriptions.set(surfaceId, listener);
      return () => {
        subscriptions.delete(surfaceId);
      };
    }),
    onError: vi.fn(() => () => {}),
  })),
}));

import { AuraProvider } from '../../src/AuraProvider';
import { usePrescription } from '../../src/usePrescription';

// Minimal valid provider props
const defaultProps = {
  endpoint: 'https://aura.test/api',
  manifest: {
    appId: 'test-app',
    version: '1.0.0',
    surfaces: [{ surfaceId: 'test', components: [] }],
  },
  userId: 'user-1',
  consentProfile: { level: 'full' as const },
  context: {},
};

/**
 * A component that consumes usePrescription and tracks render count.
 * The render count ref is exposed via a callback so the test can read it.
 */
function PrescriptionConsumer({
  surfaceId,
  onRender,
  onPrescription,
}: {
  surfaceId: string;
  onRender: (count: number) => void;
  onPrescription: (p: UIPrescription | undefined) => void;
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  onRender(renderCount.current);

  const prescription = usePrescription(surfaceId);
  onPrescription(prescription);

  return null;
}

describe('Property 5: Surface Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptions.clear();
  });

  it('prescription delivery to s1 does not re-render component subscribed to s2', async () => {
    // Generate pairs of distinct surfaceIds
    const arbDistinctSurfaceIds = fc
      .tuple(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
      )
      .filter(([a, b]) => a !== b);

    await fc.assert(
      fc.asyncProperty(
        arbDistinctSurfaceIds,
        arbUIPrescription(),
        async ([s1, s2], prescription) => {
          subscriptions.clear();

          let s1RenderCount = 0;
          let s2RenderCount = 0;
          let s1Prescription: UIPrescription | undefined;
          let s2Prescription: UIPrescription | undefined;

          // Use async act to properly flush the provider's useEffect
          // including the async init().then() promise resolution
          let unmountFn: () => void;
          await act(async () => {
            const result = render(
              React.createElement(
                AuraProvider,
                defaultProps,
                React.createElement(PrescriptionConsumer, {
                  surfaceId: s1,
                  onRender: (count: number) => { s1RenderCount = count; },
                  onPrescription: (p: UIPrescription | undefined) => { s1Prescription = p; },
                }),
                React.createElement(PrescriptionConsumer, {
                  surfaceId: s2,
                  onRender: (count: number) => { s2RenderCount = count; },
                  onPrescription: (p: UIPrescription | undefined) => { s2Prescription = p; },
                }),
              ),
            );
            unmountFn = result.unmount;
          });

          // After await act(), init() has resolved, status updated to 'active',
          // re-render has happened, and usePrescription effects have subscribed
          // Record render counts after full mount
          const s2RenderCountAfterMount = s2RenderCount;

          // Deliver a prescription to s1 only
          const s1Listener = subscriptions.get(s1);
          expect(s1Listener).toBeDefined();

          act(() => {
            s1Listener!(prescription);
          });

          // Verify: s1's component has the prescription
          expect(s1Prescription).toEqual(prescription);

          // Verify: s2's component still has undefined (no prescription delivered to s2)
          expect(s2Prescription).toBeUndefined();

          // Verify: s2's render count did not increase after the delivery to s1
          expect(s2RenderCount).toBe(s2RenderCountAfterMount);

          unmountFn!();
          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
