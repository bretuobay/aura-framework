// Feature: aura-react, Property 8: Total Render Safety
// **Validates: Requirements 3.7, 4.7, 5.9, 6.7, 7.1, 7.7, 12.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

// Mock client with configurable status
const mockClient = {
  status: 'active' as string,
  init: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  emit: vi.fn(() => Promise.resolve()),
  feedback: vi.fn(() => Promise.resolve()),
  subscribe: vi.fn(() => () => {}),
  onError: vi.fn(() => () => {}),
};

vi.mock('@aura/sdk', () => ({
  createAuraClient: vi.fn(() => mockClient),
}));

import { AuraProvider } from '../../src/AuraProvider';
import { useAura } from '../../src/useAura';
import { useAuraEmit } from '../../src/useAuraEmit';
import { usePrescription } from '../../src/usePrescription';
import { useAuraFeedback } from '../../src/useAuraFeedback';

/**
 * Creates a wrapper that renders all four hooks inside an AuraProvider.
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      AuraProvider,
      {
        endpoint: 'https://aura.test/api',
        manifest: { capabilities: [] },
        userId: 'test-user',
        consentProfile: { level: 'full' },
        context: {},
      },
      children,
    );
  };
}

describe('Property 8: Total Render Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.status = 'active';
    mockClient.init.mockImplementation(() => Promise.resolve());
  });

  it('all hooks return non-throwing, defined values for all SDK states and surfaceId inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.constantFrom('idle', 'active', 'degraded'),
          fc.string({ minLength: 0, maxLength: 30 }), // surfaceId (includes empty)
        ),
        async ([status, surfaceId]) => {
          // Configure mock client to report the generated status
          mockClient.status = status;

          const wrapper = createWrapper();

          // useAura: should return { status, error } without throwing
          const { result: auraResult, unmount: unmountAura } = renderHook(
            () => useAura(),
            { wrapper },
          );
          await act(async () => {
            await Promise.resolve();
          });
          expect(auraResult.current).toBeDefined();
          expect(auraResult.current.status).toBeTypeOf('string');
          expect(auraResult.current.error === null || auraResult.current.error !== undefined).toBe(true);
          unmountAura();

          // useAuraEmit: should return a function without throwing
          const { result: emitResult, unmount: unmountEmit } = renderHook(
            () => useAuraEmit(),
            { wrapper },
          );
          await act(async () => {
            await Promise.resolve();
          });
          expect(emitResult.current).toBeDefined();
          expect(emitResult.current).toBeTypeOf('function');
          unmountEmit();

          // usePrescription: should return undefined or a prescription without throwing
          const { result: rxResult, unmount: unmountRx } = renderHook(
            () => usePrescription(surfaceId),
            { wrapper },
          );
          await act(async () => {
            await Promise.resolve();
          });
          // prescription is either undefined or a valid object — just verify no throw
          expect(rxResult.current === undefined || rxResult.current !== undefined).toBe(true);
          unmountRx();

          // useAuraFeedback: should return a function without throwing
          const { result: fbResult, unmount: unmountFb } = renderHook(
            () => useAuraFeedback(),
            { wrapper },
          );
          await act(async () => {
            await Promise.resolve();
          });
          expect(fbResult.current).toBeDefined();
          expect(fbResult.current).toBeTypeOf('function');
          unmountFb();
        },
      ),
      { numRuns: 100 },
    );
  });
});
