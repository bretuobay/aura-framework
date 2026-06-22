// Feature: aura-react, Property 3: Feedback Forwarding
// **Validates: Requirements 6.2, 6.8, 12.3**

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { cleanup } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { arbFeedbackEvent } from "../arbitraries/feedback.arbitrary";

// Mock @aura/sdk before importing components that use it
const mockFeedback = vi.fn(() => Promise.resolve());

vi.mock("@aura/sdk", () => ({
  createAuraClient: vi.fn(() => ({
    status: "active",
    init: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    emit: vi.fn(),
    feedback: mockFeedback,
    subscribe: vi.fn(() => () => {}),
    onError: vi.fn(() => () => {}),
  })),
}));

import { AuraProvider } from "../../src/AuraProvider";
import { useAuraFeedback } from "../../src/useAuraFeedback";

describe("Property 3: Feedback Forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("client.feedback receives structurally equal FeedbackEvent for all valid events", async () => {
    await fc.assert(
      fc.asyncProperty(arbFeedbackEvent, async (feedbackEvent) => {
        const wrapper = ({ children }: { children: React.ReactNode }) =>
          React.createElement(
            AuraProvider,
            {
              endpoint: "https://aura.test",
              manifest: { surfaces: [], interactions: [] },
              userId: "test-user",
              consentProfile: { level: "full", categories: [] },
              context: { environment: "test" },
            },
            children,
          );

        const { result, unmount } = renderHook(() => useAuraFeedback(), { wrapper });

        // Wait for the provider's init effect to complete and re-render with client
        await act(async () => {
          await Promise.resolve();
        });

        // Now the client should be available and result.current should be the real feedback function
        await act(async () => {
          await result.current(feedbackEvent);
        });

        expect(mockFeedback).toHaveBeenCalledTimes(1);
        expect(mockFeedback).toHaveBeenCalledWith(feedbackEvent);

        unmount();
        cleanup();
        vi.clearAllMocks();
      }),
      { numRuns: 100 },
    );
  });
});
