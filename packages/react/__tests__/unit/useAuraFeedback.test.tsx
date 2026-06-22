/**
 * Unit tests for useAuraFeedback hook
 *
 * Validates: Requirements 6.1–6.8
 * - Delegates to client.feedback
 * - Returns promise from client.feedback
 * - Propagates AuraValidationError rejection
 * - No-op behavior outside provider
 * - Stable reference across renders
 * - Never throws during render phase
 * - Works in degraded/idle state (delegates to client which handles gracefully)
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
import { useAuraFeedback } from '../../src/useAuraFeedback';

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

describe('useAuraFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.status = 'active' as any;
    mockClient.feedback.mockImplementation(() => Promise.resolve());
    mockClient.init.mockImplementation(() => Promise.resolve());
  });

  // ─── Requirement 6.1: Returns a function ─────────────────────────────────────
  it('returns a function', () => {
    const { result } = renderHook(() => useAuraFeedback(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });

  // ─── Requirement 6.2: Delegates to client.feedback ───────────────────────────
  it('delegates to client.feedback when called with a valid FeedbackEvent', async () => {
    const { result } = renderHook(() => useAuraFeedback(), {
      wrapper: createWrapper(),
    });

    // Wait for provider init to settle so client is available
    await act(async () => {
      await Promise.resolve();
    });

    const feedbackEvent = {
      action: 'accept',
      surfaceId: 'hero-banner',
      prescriptionId: 'rx-123',
      timestamp: Date.now(),
    };

    await act(async () => {
      await result.current(feedbackEvent as any);
    });

    expect(mockClient.feedback).toHaveBeenCalledTimes(1);
    expect(mockClient.feedback).toHaveBeenCalledWith(feedbackEvent);
  });

  // ─── Requirement 6.2: Returns the promise from client.feedback ───────────────
  it('returns the promise from client.feedback', async () => {
    const { result } = renderHook(() => useAuraFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    const feedbackEvent = {
      action: 'dismiss',
      surfaceId: 'sidebar',
      prescriptionId: 'rx-456',
    };
    mockClient.feedback.mockResolvedValueOnce(undefined);

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current(feedbackEvent as any);
    });

    expect(returnValue).toBeUndefined();
  });

  // ─── Requirement 6.3: Propagates AuraValidationError rejection ───────────────
  it('propagates AuraValidationError rejection from SDK', async () => {
    const { result } = renderHook(() => useAuraFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    const validationError = new Error('Feedback validation failed');
    validationError.name = 'AuraValidationError';
    mockClient.feedback.mockRejectedValueOnce(validationError);

    const invalidFeedback = { action: '', surfaceId: '', prescriptionId: '' };

    await expect(
      act(async () => {
        await result.current(invalidFeedback as any);
      }),
    ).rejects.toThrow('Feedback validation failed');
  });

  // ─── Requirement 6.6: No-op outside provider ────────────────────────────────
  it('outside provider: returns a no-op function that resolves to undefined', async () => {
    // Render without a wrapper (no AuraProvider)
    const { result } = renderHook(() => useAuraFeedback());

    const feedbackEvent = {
      action: 'reject',
      surfaceId: 'test-surface',
      prescriptionId: 'rx-789',
    };

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current(feedbackEvent as any);
    });

    // Should not call client.feedback
    expect(mockClient.feedback).not.toHaveBeenCalled();
    // Should resolve to undefined
    expect(returnValue).toBeUndefined();
  });

  // ─── Requirement 6.6: No-op when client is null (degraded config error) ─────
  it('returns no-op resolved promise when client is null (degraded config error)', async () => {
    // Render without wrapper simulates client=null from default context
    const { result } = renderHook(() => useAuraFeedback());

    const feedbackEvent = {
      action: 'accept',
      surfaceId: 'nav',
      prescriptionId: 'rx-000',
    };

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current(feedbackEvent as any);
    });

    expect(mockClient.feedback).not.toHaveBeenCalled();
    expect(returnValue).toBeUndefined();
  });

  // ─── Requirement 6.5: Stable reference across re-renders ─────────────────────
  it('stable reference: same function identity across re-renders', async () => {
    const { result, rerender } = renderHook(() => useAuraFeedback(), {
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

  // ─── Requirement 6.7: Never throws during render phase ───────────────────────
  it('never throws during render phase', () => {
    expect(() => {
      renderHook(() => useAuraFeedback(), {
        wrapper: createWrapper(),
      });
    }).not.toThrow();
  });

  it('never throws during render phase even outside provider', () => {
    expect(() => {
      renderHook(() => useAuraFeedback());
    }).not.toThrow();
  });

  // ─── Requirement 6.4: Works in degraded/idle state ───────────────────────────
  it('works in degraded/idle state (delegates to client which handles gracefully)', async () => {
    // Simulate a client in idle state (before init resolves)
    mockClient.status = 'idle' as any;
    mockClient.feedback.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuraFeedback(), {
      wrapper: createWrapper(),
    });

    // Wait for the provider to mount and create client
    await act(async () => {
      await Promise.resolve();
    });

    const feedbackEvent = {
      action: 'override',
      surfaceId: 'sidebar',
      prescriptionId: 'rx-101',
      payload: { field: 'color', value: '#ff0000' },
    };

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current(feedbackEvent as any);
    });

    // Even in idle/degraded state, the hook delegates to client.feedback
    // The SDK handles graceful resolution internally
    expect(mockClient.feedback).toHaveBeenCalledTimes(1);
    expect(mockClient.feedback).toHaveBeenCalledWith(feedbackEvent);
    expect(returnValue).toBeUndefined();
  });
});
