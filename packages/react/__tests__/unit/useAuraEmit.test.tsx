/**
 * Unit tests for useAuraEmit hook
 *
 * Validates: Requirements 4.1–4.7
 * - Delegates to client.emit
 * - Returns promise from client.emit
 * - Propagates AuraValidationError rejection
 * - No-op behavior outside provider
 * - Stable reference across renders
 * - Never throws during render phase
 * - Works in degraded/idle state (delegates to client which handles enqueuing)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

// ─── Mock client ───────────────────────────────────────────────────────────────
const mockClient = {
  status: 'active' as const,
  init: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  emit: vi.fn(() => Promise.resolve()),
  feedback: vi.fn(() => Promise.resolve()),
  subscribe: vi.fn(() => () => {}),
  onError: vi.fn(() => () => {}),
  updateContext: vi.fn(),
  getContextSequenceId: vi.fn(() => 0),
  getPrescription: vi.fn(),
  updateConsent: vi.fn(),
  getConsent: vi.fn(() => ({})),
  explain: vi.fn(),
  getProfile: vi.fn(),
  correctProfile: vi.fn(),
  getLogs: vi.fn(() => []),
};

// ─── Mock @aura/sdk ────────────────────────────────────────────────────────────
vi.mock('@aura/sdk', () => ({
  createAuraClient: vi.fn(() => mockClient),
}));

// ─── Import after mock setup ──────────────────────────────────────────────────
import { AuraProvider } from '../../src/AuraProvider';
import { useAuraEmit } from '../../src/useAuraEmit';

// ─── Wrapper that provides AuraProvider context ────────────────────────────────
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(AuraProvider, {
      endpoint: 'https://aura.test/api',
      manifest: { surfaces: [], capabilities: [] },
      userId: 'test-user',
      consentProfile: {},
      context: {},
    }, children);
  };
}

describe('useAuraEmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.status = 'active' as any;
    mockClient.emit.mockImplementation(() => Promise.resolve());
    mockClient.init.mockImplementation(() => Promise.resolve());
  });

  // ─── Requirement 4.1, 4.2: Delegates to client.emit ─────────────────────────
  it('delegates to client.emit when called with a valid event', async () => {
    const { result } = renderHook(() => useAuraEmit(), {
      wrapper: createWrapper(),
    });

    // Wait for provider init to settle so client is available
    await act(async () => {
      await Promise.resolve();
    });

    const event = { type: 'click', surface: 'hero-banner', payload: { x: 10 } };

    await act(async () => {
      await result.current(event as any);
    });

    expect(mockClient.emit).toHaveBeenCalledTimes(1);
    expect(mockClient.emit).toHaveBeenCalledWith(event);
  });

  // ─── Requirement 4.2: Returns the promise from client.emit ───────────────────
  it('returns the promise from client.emit', async () => {
    const { result } = renderHook(() => useAuraEmit(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    const event = { type: 'interaction', surface: 'nav', payload: {} };
    mockClient.emit.mockResolvedValueOnce(undefined);

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current(event as any);
    });

    expect(returnValue).toBeUndefined();
  });

  // ─── Requirement 4.4: Propagates AuraValidationError rejection ───────────────
  it('propagates AuraValidationError rejection from SDK', async () => {
    const { result } = renderHook(() => useAuraEmit(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    const validationError = new Error('Event validation failed');
    validationError.name = 'AuraValidationError';
    mockClient.emit.mockRejectedValueOnce(validationError);

    const invalidEvent = { type: '', surface: '', payload: null };

    await expect(
      act(async () => {
        await result.current(invalidEvent as any);
      }),
    ).rejects.toThrow('Event validation failed');
  });

  // ─── Requirement 4.6: No-op outside provider ────────────────────────────────
  it('outside provider: returns a no-op function that resolves to undefined', async () => {
    // Render without a wrapper (no AuraProvider)
    const { result } = renderHook(() => useAuraEmit());

    const event = { type: 'click', surface: 'test', payload: {} };

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current(event as any);
    });

    // Should not call client.emit
    expect(mockClient.emit).not.toHaveBeenCalled();
    // Should resolve to undefined
    expect(returnValue).toBeUndefined();
  });

  // ─── Requirement 4.5: Stable reference across re-renders ─────────────────────
  it('stable reference: same function identity across re-renders', async () => {
    const { result, rerender } = renderHook(() => useAuraEmit(), {
      wrapper: createWrapper(),
    });

    // Wait for init to settle
    await act(async () => {
      await Promise.resolve();
    });

    const firstRef = result.current;

    // Re-render multiple times
    rerender();
    expect(result.current).toBe(firstRef);

    rerender();
    expect(result.current).toBe(firstRef);

    rerender();
    expect(result.current).toBe(firstRef);
  });

  // ─── Requirement 4.7: Never throws during render phase ───────────────────────
  it('never throws during render phase', () => {
    // Should not throw regardless of what happens
    expect(() => {
      renderHook(() => useAuraEmit(), {
        wrapper: createWrapper(),
      });
    }).not.toThrow();
  });

  it('never throws during render phase even outside provider', () => {
    expect(() => {
      renderHook(() => useAuraEmit());
    }).not.toThrow();
  });

  // ─── Requirement 4.3: Works in degraded/idle state ───────────────────────────
  it('works in degraded/idle state (delegates to client which handles enqueuing)', async () => {
    // Simulate a client in idle state (before init resolves)
    mockClient.status = 'idle' as any;
    mockClient.emit.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuraEmit(), {
      wrapper: createWrapper(),
    });

    // Wait for the provider to mount and create client
    await act(async () => {
      await Promise.resolve();
    });

    const event = { type: 'interaction', surface: 'sidebar', payload: { action: 'expand' } };

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current(event as any);
    });

    // Even in idle/degraded state, the hook delegates to client.emit
    // The SDK handles enqueuing internally
    expect(mockClient.emit).toHaveBeenCalledTimes(1);
    expect(mockClient.emit).toHaveBeenCalledWith(event);
    expect(returnValue).toBeUndefined();
  });
});
