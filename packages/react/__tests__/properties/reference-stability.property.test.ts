// Feature: aura-react, Property 4: Hook Function Reference Stability
// **Validates: Requirements 4.5, 6.5, 12.7, 12.8**

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { renderHook, act } from "@testing-library/react";

// Stable mock client instance — shared across all renders to ensure
// the useCallback dependency (client) does not change.
const mockClient = {
  status: "active" as const,
  init: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  emit: vi.fn(() => Promise.resolve()),
  feedback: vi.fn(() => Promise.resolve()),
  subscribe: vi.fn(() => () => {}),
  onError: vi.fn(() => () => {}),
};

// Mock @aura/sdk with a stable client mock
vi.mock("@aura/sdk", () => ({
  createAuraClient: vi.fn(() => mockClient),
}));

import { AuraProvider } from "../../src/AuraProvider";
import { useAuraEmit } from "../../src/useAuraEmit";
import { useAuraFeedback } from "../../src/useAuraFeedback";

/**
 * Creates a wrapper component that provides AuraProvider context
 * with stable, minimal props for testing hook reference stability.
 */
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

describe("Property 4: Hook Function Reference Stability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.init.mockImplementation(() => Promise.resolve());
  });

  it("useAuraEmit returns the same function reference across N re-renders", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (rerenderCount) => {
        const wrapper = createWrapper();
        const { result, rerender } = renderHook(() => useAuraEmit(), { wrapper });

        // Allow the provider's init effect to settle so the client
        // is propagated through context and useCallback stabilizes.
        await act(async () => {
          await Promise.resolve();
        });

        // Capture the stabilized function reference
        const stableRef = result.current;
        expect(stableRef).toBeTypeOf("function");

        // Re-render N times and verify identity is preserved
        for (let i = 0; i < rerenderCount; i++) {
          rerender();
          expect(result.current).toBe(stableRef);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("useAuraFeedback returns the same function reference across N re-renders", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (rerenderCount) => {
        const wrapper = createWrapper();
        const { result, rerender } = renderHook(() => useAuraFeedback(), { wrapper });

        // Allow the provider's init effect to settle so the client
        // is propagated through context and useCallback stabilizes.
        await act(async () => {
          await Promise.resolve();
        });

        // Capture the stabilized function reference
        const stableRef = result.current;
        expect(stableRef).toBeTypeOf("function");

        // Re-render N times and verify identity is preserved
        for (let i = 0; i < rerenderCount; i++) {
          rerender();
          expect(result.current).toBe(stableRef);
        }
      }),
      { numRuns: 100 },
    );
  });
});
