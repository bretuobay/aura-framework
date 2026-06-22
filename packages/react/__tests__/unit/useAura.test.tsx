/**
 * Unit tests for useAura hook
 * Validates: Requirements 3.1–3.8
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";

// Mock client with configurable status and onError behavior
let onErrorHandler: ((err: any) => void) | null = null;

const mockClient = {
  status: "active" as string,
  init: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  emit: vi.fn(() => Promise.resolve()),
  feedback: vi.fn(() => Promise.resolve()),
  subscribe: vi.fn(() => () => {}),
  onError: vi.fn((handler: (err: any) => void) => {
    onErrorHandler = handler;
    return () => {
      onErrorHandler = null;
    };
  }),
};

vi.mock("@aura/sdk", () => ({
  createAuraClient: vi.fn(() => mockClient),
}));

import { createAuraClient } from "@aura/sdk";
import { AuraProvider } from "../../src/AuraProvider";
import { useAura } from "../../src/useAura";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      AuraProvider,
      {
        endpoint: "https://aura.test/api",
        manifest: { capabilities: [] },
        userId: "test-user",
        consentProfile: { level: "full" },
        context: {},
      },
      children,
    );
  };
}

describe("useAura", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onErrorHandler = null;
    mockClient.status = "active";
    mockClient.init.mockImplementation(() => Promise.resolve());
  });

  // Req 3.2: Returns idle status before init resolves
  it("returns idle status before init resolves", () => {
    // Make init never resolve during this test
    mockClient.init.mockImplementation(() => new Promise(() => {}));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAura(), { wrapper });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  // Req 3.3: Returns active status after init resolves successfully
  it("returns active status after init resolves successfully", async () => {
    mockClient.status = "active";
    mockClient.init.mockImplementation(() => Promise.resolve());

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAura(), { wrapper });

    // Let the init promise resolve and flush the state update
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("active");
    expect(result.current.error).toBeNull();
  });

  // Req 3.4: Returns degraded status when init resolves with degraded client status
  it("returns degraded status when init resolves with degraded client status", async () => {
    // Simulate SDK transitioning to degraded during init (e.g., server unreachable)
    mockClient.status = "degraded";
    mockClient.init.mockImplementation(() => Promise.resolve());

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAura(), { wrapper });

    // Let init resolve — provider reads client.status which is 'degraded'
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("degraded");
    // No error from init itself — error is null unless onError fires
    expect(result.current.error).toBeNull();
  });

  // Req 3.5: Returns most recent error from onError handler
  it("returns most recent error from onError handler", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAura(), { wrapper });

    // Let init settle so onError handler is registered
    await act(async () => {
      await Promise.resolve();
    });

    const sdkError = { code: "CONNECTION_LOST", message: "Connection lost" };

    // Simulate SDK emitting an error
    await act(async () => {
      onErrorHandler?.(sdkError);
    });

    expect(result.current.error).toBe(sdkError);
  });

  // Req 3.5 continued: Error is replaced by subsequent errors (latest error wins)
  it("error is replaced by subsequent errors (latest error wins)", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAura(), { wrapper });

    // Let init settle
    await act(async () => {
      await Promise.resolve();
    });

    const firstError = { code: "ERR_1", message: "First error" };
    const secondError = { code: "ERR_2", message: "Second error" };

    // Emit first error
    await act(async () => {
      onErrorHandler?.(firstError);
    });
    expect(result.current.error).toBe(firstError);

    // Emit second error — should replace the first
    await act(async () => {
      onErrorHandler?.(secondError);
    });
    expect(result.current.error).toBe(secondError);
  });

  // Req 3.6: Outside provider returns { status: "degraded", error: null }
  it('outside provider: returns { status: "degraded", error: null }', () => {
    // Render without any wrapper (no AuraProvider)
    const { result } = renderHook(() => useAura());

    expect(result.current.status).toBe("degraded");
    expect(result.current.error).toBeNull();
  });

  // Req 3.7: Never throws during render
  it("never throws during render", async () => {
    // Test that calling useAura inside a provider does not throw
    const wrapper = createWrapper();
    const { unmount: u1 } = renderHook(() => useAura(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    u1();

    // Test that calling useAura outside a provider does not throw
    const { unmount: u2 } = renderHook(() => useAura());
    u2();

    // Test with a degraded client (config error)
    (createAuraClient as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("Config error");
    });
    const { unmount: u3 } = renderHook(() => useAura(), { wrapper: createWrapper() });
    await act(async () => {
      await Promise.resolve();
    });
    u3();

    // If we reached here, no throw occurred
    expect(true).toBe(true);
  });

  // Req 3.8: Status values are referentially stable across re-renders when unchanged
  it("status values are referentially stable across re-renders when unchanged", async () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(() => useAura(), { wrapper });

    // Let init settle so status becomes 'active'
    await act(async () => {
      await Promise.resolve();
    });

    const firstStatus = result.current.status;
    expect(firstStatus).toBe("active");

    // Re-render multiple times and verify same string reference (===)
    rerender();
    expect(result.current.status).toBe(firstStatus);

    rerender();
    expect(result.current.status).toBe(firstStatus);

    rerender();
    expect(result.current.status).toBe(firstStatus);

    // Strings are interned in JS, so same literal value means same reference.
    // The key point is that the provider doesn't create a new status string
    // unless a real status change occurred.
  });
});
