// Feature: aura-react, Property 2: Emit Forwarding
// Validates: Requirements 4.2, 12.2
//
// For any valid AuraEvent, verify client.emit receives structurally equal event.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { arbAuraEvent } from "../arbitraries/event.arbitrary";

// ─── Mock client ───────────────────────────────────────────────────────────────
const mockClient = {
  status: "active" as const,
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
vi.mock("@aura/sdk", () => ({
  createAuraClient: vi.fn(() => mockClient),
}));

// ─── Import components under test (after mock setup) ───────────────────────────
import { AuraProvider } from "../../src/AuraProvider";
import { useAuraEmit } from "../../src/useAuraEmit";

// ─── Wrapper helper ────────────────────────────────────────────────────────────
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      AuraProvider,
      {
        endpoint: "https://aura.test/api",
        manifest: { surfaces: [], capabilities: [] },
        userId: "test-user",
        consentProfile: {},
        context: {},
      },
      children,
    );
  };
}

describe("Property 2: Emit Forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any valid AuraEvent, client.emit receives a structurally equal event", async () => {
    // Render the hook once, wait for the provider to finish init and
    // re-render with the client available in context.
    const { result, unmount } = renderHook(() => useAuraEmit(), {
      wrapper: createWrapper(),
    });

    // Wait for the provider effect to run and init() to resolve,
    // which triggers a setState and re-render with client available.
    await waitFor(() => {
      // After init resolves, the provider re-renders with status='active'
      // and clientRef.current is set, making it visible via context.
      expect(mockClient.init).toHaveBeenCalled();
    });

    // Allow microtask queue to flush (init promise resolution + setState)
    await act(async () => {
      await Promise.resolve();
    });

    await fc.assert(
      fc.asyncProperty(arbAuraEvent, async (event) => {
        mockClient.emit.mockClear();

        // Call the emit function returned by the hook
        await act(async () => {
          await result.current(event);
        });

        // Verify client.emit was called exactly once
        expect(mockClient.emit).toHaveBeenCalledTimes(1);

        // Verify the event received by client.emit is structurally equal
        const receivedEvent = mockClient.emit.mock.calls[0][0];
        expect(receivedEvent).toEqual(event);
      }),
      { numRuns: 100 },
    );

    unmount();
  });
});
