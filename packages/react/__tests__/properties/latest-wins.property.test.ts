// Feature: aura-react, Property 6: Latest-Wins Prescription Delivery
// **Validates: Requirements 5.4, 5.11, 12.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { arbPrescriptionForSurface } from '../arbitraries/prescription.arbitrary';
import type { UIPrescription } from '@aura/protocol';

// Track the subscription listener for the test surface
let capturedListener: ((p: UIPrescription | undefined) => void) | null = null;

vi.mock('@aura/sdk', () => ({
  createAuraClient: vi.fn(() => ({
    status: 'active',
    init: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    emit: vi.fn(),
    feedback: vi.fn(),
    subscribe: vi.fn((surfaceId: string, listener: (p: UIPrescription | undefined) => void) => {
      capturedListener = listener;
      return () => {
        capturedListener = null;
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
    surfaces: [{ surfaceId: 'test-surface', components: [] }],
  },
  userId: 'user-1',
  consentProfile: { level: 'full' as const },
  context: {},
};

const TEST_SURFACE_ID = 'test-surface';

/**
 * A component that consumes usePrescription and exposes the current value.
 */
function PrescriptionConsumer({
  surfaceId,
  onPrescription,
}: {
  surfaceId: string;
  onPrescription: (p: UIPrescription | undefined) => void;
}) {
  const prescription = usePrescription(surfaceId);
  onPrescription(prescription);
  return null;
}

describe('Property 6: Latest-Wins Prescription Delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedListener = null;
  });

  it('for any sequence of prescriptions delivered to a surface, hook returns the most recently delivered prescription', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbPrescriptionForSurface(TEST_SURFACE_ID), { minLength: 1, maxLength: 10 }),
        async (prescriptions) => {
          capturedListener = null;
          let currentPrescription: UIPrescription | undefined;

          let unmountFn: () => void;
          await act(async () => {
            const result = render(
              React.createElement(
                AuraProvider,
                defaultProps,
                React.createElement(PrescriptionConsumer, {
                  surfaceId: TEST_SURFACE_ID,
                  onPrescription: (p: UIPrescription | undefined) => {
                    currentPrescription = p;
                  },
                }),
              ),
            );
            unmountFn = result.unmount;
          });

          // After mount and init() resolution, listener should be captured
          expect(capturedListener).not.toBeNull();

          // Deliver each prescription sequentially and verify latest-wins
          for (const prescription of prescriptions) {
            act(() => {
              capturedListener!(prescription);
            });

            // After each delivery, the hook should return the most recently delivered prescription
            expect(currentPrescription).toEqual(prescription);
          }

          // Final verification: the last prescription in the sequence is what's returned
          expect(currentPrescription).toEqual(prescriptions[prescriptions.length - 1]);

          unmountFn!();
          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
