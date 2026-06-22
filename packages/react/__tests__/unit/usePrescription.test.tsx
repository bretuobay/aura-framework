/**
 * Unit tests for usePrescription hook
 *
 * Validates: Requirements 5.1–5.12, 9.1–9.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UIPrescription } from '@aura/protocol';

// ─── Mock setup ────────────────────────────────────────────────────────────────

const listeners = new Map<string, Function>();
const unsubscribeSpy = vi.fn();

const mockClient = {
  status: 'active' as string,
  init: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  emit: vi.fn(),
  feedback: vi.fn(),
  subscribe: vi.fn((surfaceId: string, listener: (p: UIPrescription | undefined) => void) => {
    listeners.set(surfaceId, listener);
    return () => {
      unsubscribeSpy(surfaceId);
      listeners.delete(surfaceId);
    };
  }),
  onError: vi.fn(() => () => {}),
};

vi.mock('@aura/sdk', () => ({
  createAuraClient: vi.fn(() => mockClient),
}));

import { AuraProvider } from '../../src/AuraProvider';
import { usePrescription } from '../../src/usePrescription';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  endpoint: 'https://aura.test/api',
  manifest: {
    appId: 'test-app',
    version: '1.0.0',
    surfaces: [{ surfaceId: 'hero-banner', components: [] }],
  },
  userId: 'user-1',
  consentProfile: { level: 'full' as const },
  context: {},
};

function makePrescription(surfaceId: string, variant = 'default'): UIPrescription {
  return {
    prescriptionId: `rx-${surfaceId}-${variant}`,
    surfaceId,
    components: [{ componentId: 'comp-1', type: 'banner', props: { text: variant } }],
    constraints: { expiresAt: new Date(Date.now() + 60_000).toISOString() },
    contextLock: { hash: 'abc123' },
  } as unknown as UIPrescription;
}

/** Wrapper component that provides AuraProvider context */
function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuraProvider, defaultProps, children);
}

/** Consumer component that exposes prescription value via callback */
function PrescriptionConsumer({
  surfaceId,
  onValue,
}: {
  surfaceId: string;
  onValue: (p: UIPrescription | undefined) => void;
}) {
  const prescription = usePrescription(surfaceId);
  onValue(prescription);
  return null;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('usePrescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    unsubscribeSpy.mockClear();
    mockClient.status = 'active';
  });

  it('returns undefined initially when no prescription has been delivered', async () => {
    let value: UIPrescription | undefined = 'NOT_UNDEFINED' as any;

    await act(async () => {
      render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'hero-banner',
            onValue: (p) => { value = p; },
          }),
        ),
      );
    });

    expect(value).toBeUndefined();

    cleanup();
  });

  it('returns prescription after SDK delivers one via subscription callback', async () => {
    let value: UIPrescription | undefined;

    await act(async () => {
      render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'hero-banner',
            onValue: (p) => { value = p; },
          }),
        ),
      );
    });

    const prescription = makePrescription('hero-banner', 'v1');

    act(() => {
      listeners.get('hero-banner')!(prescription);
    });

    expect(value).toEqual(prescription);

    cleanup();
  });

  it('returns undefined when called outside of AuraProvider', () => {
    const { result } = renderHook(() => usePrescription('any-surface'));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when SDK status is degraded', async () => {
    mockClient.status = 'degraded';
    let value: UIPrescription | undefined = 'NOT_UNDEFINED' as any;

    // We need to simulate degraded status through the provider context.
    // The mock createAuraClient returns a client with status 'degraded',
    // but AuraProvider starts with idle state. We use a custom wrapper
    // that provides degraded context directly.
    const { AuraContext } = await import('../../src/AuraContext');

    const DegradedWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        AuraContext.Provider,
        { value: { client: mockClient as any, status: 'degraded', error: null } },
        children,
      );

    await act(async () => {
      render(
        React.createElement(
          DegradedWrapper,
          null,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'hero-banner',
            onValue: (p) => { value = p; },
          }),
        ),
      );
    });

    expect(value).toBeUndefined();

    cleanup();
  });

  it('subscribes with the correct surfaceId on mount', async () => {
    await act(async () => {
      render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'hero-banner',
            onValue: () => {},
          }),
        ),
      );
    });

    expect(mockClient.subscribe).toHaveBeenCalledWith('hero-banner', expect.any(Function));
    expect(listeners.has('hero-banner')).toBe(true);

    cleanup();
  });

  it('unsubscribes on unmount (cleanup)', async () => {
    let unmountFn: () => void;

    await act(async () => {
      const result = render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'hero-banner',
            onValue: () => {},
          }),
        ),
      );
      unmountFn = result.unmount;
    });

    expect(listeners.has('hero-banner')).toBe(true);

    act(() => {
      unmountFn!();
    });

    expect(unsubscribeSpy).toHaveBeenCalledWith('hero-banner');
    expect(listeners.has('hero-banner')).toBe(false);

    cleanup();
  });

  it('re-subscribes when surfaceId changes (unsubscribes old, subscribes new)', async () => {
    let surfaceId = 'surface-a';
    let rerender: (ui: React.ReactElement) => void;

    await act(async () => {
      const result = render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId,
            onValue: () => {},
          }),
        ),
      );
      rerender = result.rerender;
    });

    expect(mockClient.subscribe).toHaveBeenCalledWith('surface-a', expect.any(Function));
    expect(listeners.has('surface-a')).toBe(true);

    // Change surfaceId
    act(() => {
      rerender!(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'surface-b',
            onValue: () => {},
          }),
        ),
      );
    });

    // Old subscription should be cleaned up
    expect(unsubscribeSpy).toHaveBeenCalledWith('surface-a');
    // New subscription should be active
    expect(mockClient.subscribe).toHaveBeenCalledWith('surface-b', expect.any(Function));
    expect(listeners.has('surface-b')).toBe(true);

    cleanup();
  });

  it('returns undefined for empty surfaceId', async () => {
    let value: UIPrescription | undefined = 'NOT_UNDEFINED' as any;

    await act(async () => {
      render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: '',
            onValue: (p) => { value = p; },
          }),
        ),
      );
    });

    // Hook subscribes with empty string but no prescription is delivered → undefined
    expect(value).toBeUndefined();

    cleanup();
  });

  it('never throws during render', async () => {
    // Test with various edge cases: empty string, undefined-like values
    const testCases = ['', 'valid-surface', 'special!@#chars'];

    for (const surfaceId of testCases) {
      expect(() => {
        const { unmount } = render(
          React.createElement(
            AuraProvider,
            defaultProps,
            React.createElement(PrescriptionConsumer, {
              surfaceId,
              onValue: () => {},
            }),
          ),
        );
        unmount();
      }).not.toThrow();
    }

    cleanup();
  });

  it('clears prescription when undefined is delivered (reject/expiry simulation)', async () => {
    let value: UIPrescription | undefined;

    await act(async () => {
      render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'hero-banner',
            onValue: (p) => { value = p; },
          }),
        ),
      );
    });

    // Deliver a prescription
    const prescription = makePrescription('hero-banner');
    act(() => {
      listeners.get('hero-banner')!(prescription);
    });
    expect(value).toEqual(prescription);

    // Simulate reject/expiry by delivering undefined
    act(() => {
      listeners.get('hero-banner')!(undefined);
    });
    expect(value).toBeUndefined();

    cleanup();
  });

  it('returns the most recent prescription when multiple are delivered', async () => {
    let value: UIPrescription | undefined;

    await act(async () => {
      render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(PrescriptionConsumer, {
            surfaceId: 'hero-banner',
            onValue: (p) => { value = p; },
          }),
        ),
      );
    });

    const rx1 = makePrescription('hero-banner', 'first');
    const rx2 = makePrescription('hero-banner', 'second');
    const rx3 = makePrescription('hero-banner', 'third');

    act(() => {
      listeners.get('hero-banner')!(rx1);
    });
    expect(value).toEqual(rx1);

    act(() => {
      listeners.get('hero-banner')!(rx2);
    });
    expect(value).toEqual(rx2);

    act(() => {
      listeners.get('hero-banner')!(rx3);
    });
    expect(value).toEqual(rx3);

    cleanup();
  });

  it('multiple hook instances with different surfaceIds are independent', async () => {
    let valueA: UIPrescription | undefined;
    let valueB: UIPrescription | undefined;

    await act(async () => {
      render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement(React.Fragment, null,
            React.createElement(PrescriptionConsumer, {
              surfaceId: 'surface-a',
              onValue: (p) => { valueA = p; },
            }),
            React.createElement(PrescriptionConsumer, {
              surfaceId: 'surface-b',
              onValue: (p) => { valueB = p; },
            }),
          ),
        ),
      );
    });

    // Both should have independent subscriptions
    expect(listeners.has('surface-a')).toBe(true);
    expect(listeners.has('surface-b')).toBe(true);

    // Deliver a prescription only to surface-a
    const rxA = makePrescription('surface-a', 'alpha');
    act(() => {
      listeners.get('surface-a')!(rxA);
    });

    // surface-a should have the prescription, surface-b should remain undefined
    expect(valueA).toEqual(rxA);
    expect(valueB).toBeUndefined();

    // Deliver a prescription only to surface-b
    const rxB = makePrescription('surface-b', 'beta');
    act(() => {
      listeners.get('surface-b')!(rxB);
    });

    // Both should have their own respective prescriptions
    expect(valueA).toEqual(rxA);
    expect(valueB).toEqual(rxB);

    // Update surface-a — surface-b should not change
    const rxA2 = makePrescription('surface-a', 'alpha-v2');
    act(() => {
      listeners.get('surface-a')!(rxA2);
    });

    expect(valueA).toEqual(rxA2);
    expect(valueB).toEqual(rxB);

    cleanup();
  });
});
