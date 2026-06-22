/**
 * Unit tests for AuraProvider lifecycle behavior.
 *
 * Validates: Requirements 1.1–1.9, 2.1–2.6, 10.4
 *
 * Tests mount/unmount/remount, Strict Mode double-invocation,
 * config error handling, init-in-flight + unmount race condition,
 * and onError handler lifecycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

// ─── Mock Setup ────────────────────────────────────────────────────────────────

type ErrorHandler = (err: Error) => void;

interface MockClient {
  status: string;
  init: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  feedback: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
}

let mockClient: MockClient;
let initResolve: () => void;
let initReject: (err: Error) => void;
let errorHandler: ErrorHandler | null = null;
let createClientError: Error | null = null;

function buildMockClient(overrides?: Partial<MockClient>): MockClient {
  const errorUnsub = vi.fn();
  const client: MockClient = {
    status: 'active',
    init: vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          initResolve = resolve;
          initReject = reject;
        }),
    ),
    disconnect: vi.fn(),
    emit: vi.fn(),
    feedback: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    onError: vi.fn((handler: ErrorHandler) => {
      errorHandler = handler;
      return errorUnsub;
    }),
    ...overrides,
  };
  return client;
}

vi.mock('@aura/sdk', () => ({
  createAuraClient: vi.fn((config: unknown) => {
    if (createClientError) {
      throw createClientError;
    }
    return mockClient;
  }),
}));

import { createAuraClient } from '@aura/sdk';
import { AuraProvider } from '../../src/AuraProvider';
import { useAura } from '../../src/useAura';

// ─── Helper Components ─────────────────────────────────────────────────────────

function StatusReader({ onStatus }: { onStatus: (s: { status: string; error: unknown }) => void }) {
  const { status, error } = useAura();
  onStatus({ status, error });
  return React.createElement('span', { 'data-testid': 'status' }, status);
}

// ─── Default Props ─────────────────────────────────────────────────────────────

const defaultProps = {
  endpoint: 'https://aura.test/api',
  manifest: {
    appId: 'test-app',
    version: '1.0.0',
    surfaces: [{ surfaceId: 'main', components: [] }],
  },
  userId: 'user-1',
  consentProfile: { level: 'full' as const },
  context: {},
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('AuraProvider lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientError = null;
    errorHandler = null;
    mockClient = buildMockClient();
  });

  // ── Mount ─────────────────────────────────────────────────────────────────

  describe('mount', () => {
    it('calls createAuraClient with config props and then init()', () => {
      const { unmount } = render(
        React.createElement(AuraProvider, defaultProps, React.createElement('div')),
      );

      expect(createAuraClient).toHaveBeenCalledTimes(1);
      expect(createAuraClient).toHaveBeenCalledWith({
        endpoint: defaultProps.endpoint,
        manifest: defaultProps.manifest,
        userId: defaultProps.userId,
        consentProfile: defaultProps.consentProfile,
        context: defaultProps.context,
      });
      expect(mockClient.init).toHaveBeenCalledTimes(1);

      unmount();
      cleanup();
    });

    it('renders children immediately before init() resolves', () => {
      const childText = 'child-content';
      const { getByText, unmount } = render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement('span', null, childText),
        ),
      );

      // Children are visible even though init() has not resolved
      expect(getByText(childText)).toBeTruthy();

      unmount();
      cleanup();
    });
  });

  // ── Config Error ──────────────────────────────────────────────────────────

  describe('config error', () => {
    it('enters degraded mode when createAuraClient throws', async () => {
      const configError = new Error('Invalid endpoint');
      createClientError = configError;

      const statuses: Array<{ status: string; error: unknown }> = [];
      const onStatus = (s: { status: string; error: unknown }) => statuses.push(s);

      let unmountFn: () => void;
      await act(async () => {
        const result = render(
          React.createElement(
            AuraProvider,
            defaultProps,
            React.createElement(StatusReader, { onStatus }),
          ),
        );
        unmountFn = result.unmount;
      });

      // Provider should be in degraded mode
      const lastStatus = statuses[statuses.length - 1];
      expect(lastStatus.status).toBe('degraded');
      expect(lastStatus.error).toBe(configError);

      unmountFn!();
      cleanup();
    });

    it('renders children even when config is invalid', () => {
      createClientError = new Error('Bad config');

      const childText = 'still-renders';
      const { getByText, unmount } = render(
        React.createElement(
          AuraProvider,
          defaultProps,
          React.createElement('span', null, childText),
        ),
      );

      expect(getByText(childText)).toBeTruthy();

      unmount();
      cleanup();
    });
  });

  // ── Init Success ──────────────────────────────────────────────────────────

  describe('init success', () => {
    it('status transitions to active after init resolves', async () => {
      const statuses: Array<{ status: string; error: unknown }> = [];
      const onStatus = (s: { status: string; error: unknown }) => statuses.push(s);

      let unmountFn: () => void;
      await act(async () => {
        const result = render(
          React.createElement(
            AuraProvider,
            defaultProps,
            React.createElement(StatusReader, { onStatus }),
          ),
        );
        unmountFn = result.unmount;
      });

      // Before init resolves, status is 'idle'
      expect(statuses[0].status).toBe('idle');

      // Resolve init — client.status is 'active' by default
      await act(async () => {
        initResolve();
      });

      const lastStatus = statuses[statuses.length - 1];
      expect(lastStatus.status).toBe('active');

      unmountFn!();
      cleanup();
    });
  });

  // ── Init Degraded ─────────────────────────────────────────────────────────

  describe('init degraded', () => {
    it('status transitions to degraded when init resolves with degraded status', async () => {
      // Set client status to 'degraded' so that after init resolves, provider reads it
      mockClient = buildMockClient();
      mockClient.status = 'degraded';

      const statuses: Array<{ status: string; error: unknown }> = [];
      const onStatus = (s: { status: string; error: unknown }) => statuses.push(s);

      let unmountFn: () => void;
      await act(async () => {
        const result = render(
          React.createElement(
            AuraProvider,
            defaultProps,
            React.createElement(StatusReader, { onStatus }),
          ),
        );
        unmountFn = result.unmount;
      });

      // Resolve init — client.status is 'degraded'
      await act(async () => {
        initResolve();
      });

      const lastStatus = statuses[statuses.length - 1];
      expect(lastStatus.status).toBe('degraded');

      unmountFn!();
      cleanup();
    });
  });

  // ── Unmount ───────────────────────────────────────────────────────────────

  describe('unmount', () => {
    it('calls disconnect() on the client', async () => {
      let unmountFn: () => void;

      await act(async () => {
        const result = render(
          React.createElement(AuraProvider, defaultProps, React.createElement('div')),
        );
        unmountFn = result.unmount;
      });

      // Resolve init so cleanup path is clear
      await act(async () => {
        initResolve();
      });

      act(() => {
        unmountFn!();
      });

      // Give async cleanup time to execute
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockClient.disconnect).toHaveBeenCalled();
      cleanup();
    });

    it('unregisters onError handler before disconnect', async () => {
      const errorUnsub = vi.fn();
      mockClient = buildMockClient({
        onError: vi.fn((handler: ErrorHandler) => {
          errorHandler = handler;
          return errorUnsub;
        }),
      });

      let unmountFn: () => void;
      await act(async () => {
        const result = render(
          React.createElement(AuraProvider, defaultProps, React.createElement('div')),
        );
        unmountFn = result.unmount;
      });

      // Resolve init
      await act(async () => {
        initResolve();
      });

      act(() => {
        unmountFn!();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // onError unsubscribe should be called
      expect(errorUnsub).toHaveBeenCalled();

      // Verify ordering: unsub was called before disconnect
      const unsubOrder = errorUnsub.mock.invocationCallOrder[0];
      const disconnectOrder = mockClient.disconnect.mock.invocationCallOrder[0];
      expect(unsubOrder).toBeLessThan(disconnectOrder);

      cleanup();
    });
  });

  // ── Unmount with init in-flight ───────────────────────────────────────────

  describe('unmount with init in-flight', () => {
    it('waits for init then disconnects', async () => {
      let unmountFn: () => void;

      await act(async () => {
        const result = render(
          React.createElement(AuraProvider, defaultProps, React.createElement('div')),
        );
        unmountFn = result.unmount;
      });

      // DO NOT resolve init — it's still in-flight
      // Unmount while init is pending
      act(() => {
        unmountFn!();
      });

      // disconnect should not have been called yet (waiting for init)
      expect(mockClient.disconnect).not.toHaveBeenCalled();

      // Now resolve init
      await act(async () => {
        initResolve();
        await new Promise((r) => setTimeout(r, 0));
      });

      // After init resolves, disconnect should be called
      expect(mockClient.disconnect).toHaveBeenCalled();

      cleanup();
    });
  });

  // ── Remount ───────────────────────────────────────────────────────────────

  describe('remount', () => {
    it('creates a new client instance (no reuse)', async () => {
      let unmountFn: () => void;

      await act(async () => {
        const result = render(
          React.createElement(AuraProvider, defaultProps, React.createElement('div')),
        );
        unmountFn = result.unmount;
      });

      // Resolve init & unmount
      await act(async () => {
        initResolve();
      });

      act(() => {
        unmountFn!();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Build a fresh mock for the second mount
      const firstClient = mockClient;
      mockClient = buildMockClient();

      let unmountFn2: () => void;
      await act(async () => {
        const result2 = render(
          React.createElement(AuraProvider, defaultProps, React.createElement('div')),
        );
        unmountFn2 = result2.unmount;
      });

      // createAuraClient was called again
      expect(createAuraClient).toHaveBeenCalledTimes(2);
      // init was called on the new client
      expect(mockClient.init).toHaveBeenCalledTimes(1);
      // The new client is a different object from the first
      expect(mockClient).not.toBe(firstClient);

      unmountFn2!();
      cleanup();
    });
  });

  // ── onError ───────────────────────────────────────────────────────────────

  describe('onError', () => {
    it('stores error in state and exposes via context', async () => {
      const statuses: Array<{ status: string; error: unknown }> = [];
      const onStatus = (s: { status: string; error: unknown }) => statuses.push(s);

      let unmountFn: () => void;
      await act(async () => {
        const result = render(
          React.createElement(
            AuraProvider,
            defaultProps,
            React.createElement(StatusReader, { onStatus }),
          ),
        );
        unmountFn = result.unmount;
      });

      // Resolve init
      await act(async () => {
        initResolve();
      });

      // Simulate SDK error via the registered error handler
      const sdkError = new Error('SDK connection lost');
      await act(async () => {
        errorHandler!(sdkError);
      });

      const lastStatus = statuses[statuses.length - 1];
      expect(lastStatus.error).toBe(sdkError);

      unmountFn!();
      cleanup();
    });
  });

  // ── Strict Mode double-invocation ─────────────────────────────────────────

  describe('Strict Mode double-invocation', () => {
    it('handles cleanup + re-setup correctly', async () => {
      // React Strict Mode invokes effects twice: setup → cleanup → setup
      // The provider must create a valid client on the second setup.

      let unmountFn: () => void;

      await act(async () => {
        const result = render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(AuraProvider, defaultProps, React.createElement('div')),
          ),
        );
        unmountFn = result.unmount;
      });

      // In Strict Mode, createAuraClient may be called twice (setup, cleanup, setup)
      const callCount = (createAuraClient as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(1);

      // Init should have been called on each created client
      // The important thing is the last setup leaves a working client
      expect(mockClient.init).toHaveBeenCalled();

      // Resolve the most recent init
      await act(async () => {
        initResolve();
      });

      // Verify the component tree still renders
      const statuses: Array<{ status: string; error: unknown }> = [];
      const onStatus = (s: { status: string; error: unknown }) => statuses.push(s);

      unmountFn!();
      cleanup();

      // Re-render in strict mode with status reader
      mockClient = buildMockClient();
      vi.clearAllMocks();

      let unmountFn2: () => void;
      await act(async () => {
        const result = render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(
              AuraProvider,
              defaultProps,
              React.createElement(StatusReader, { onStatus }),
            ),
          ),
        );
        unmountFn2 = result.unmount;
      });

      // Status should initially be 'idle'
      expect(statuses[0].status).toBe('idle');

      // Resolve init
      await act(async () => {
        initResolve();
      });

      // Final status should be 'active'
      const lastStatus = statuses[statuses.length - 1];
      expect(lastStatus.status).toBe('active');

      unmountFn2!();
      cleanup();
    });

    it('does not leak error handlers across double-invocation', async () => {
      const errorUnsubs: ReturnType<typeof vi.fn>[] = [];
      mockClient = buildMockClient({
        onError: vi.fn((handler: ErrorHandler) => {
          errorHandler = handler;
          const unsub = vi.fn();
          errorUnsubs.push(unsub);
          return unsub;
        }),
      });

      let unmountFn: () => void;
      await act(async () => {
        const result = render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(AuraProvider, defaultProps, React.createElement('div')),
          ),
        );
        unmountFn = result.unmount;
      });

      // Resolve init
      await act(async () => {
        initResolve();
      });

      // Unmount
      act(() => {
        unmountFn!();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // All registered error unsub handlers should have been called
      for (const unsub of errorUnsubs) {
        expect(unsub).toHaveBeenCalled();
      }

      cleanup();
    });
  });

  // ── disconnect throws ─────────────────────────────────────────────────────

  describe('disconnect throws', () => {
    it('suppresses exception silently', async () => {
      mockClient = buildMockClient({
        disconnect: vi.fn(() => {
          throw new Error('disconnect failure');
        }),
      });

      let unmountFn: () => void;
      await act(async () => {
        const result = render(
          React.createElement(AuraProvider, defaultProps, React.createElement('div')),
        );
        unmountFn = result.unmount;
      });

      // Resolve init
      await act(async () => {
        initResolve();
      });

      // Unmount should not throw even though disconnect throws
      expect(() => {
        act(() => {
          unmountFn!();
        });
      }).not.toThrow();

      // Give async cleanup time
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // disconnect was called (but error suppressed)
      expect(mockClient.disconnect).toHaveBeenCalled();

      cleanup();
    });
  });
});
