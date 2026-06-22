// Feature: aura-react, Property 10: No Subscription Leak After Unmount
// **Validates: Requirements 5.6, 9.3, 9.5, 12.10**

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, act, cleanup } from "@testing-library/react";
import type { UIPrescription } from "@aura/protocol";

// Track active subscriptions globally
const activeSubscriptions = new Set<string>();

vi.mock("@aura/sdk", () => ({
  createAuraClient: vi.fn(() => ({
    status: "active",
    init: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    emit: vi.fn(),
    feedback: vi.fn(),
    subscribe: vi.fn((surfaceId: string, listener: (p: UIPrescription | undefined) => void) => {
      activeSubscriptions.add(surfaceId);
      return () => {
        activeSubscriptions.delete(surfaceId);
      };
    }),
    onError: vi.fn(() => () => {}),
  })),
}));

import { AuraProvider } from "../../src/AuraProvider";
import { usePrescription } from "../../src/usePrescription";

// Minimal valid provider props
const defaultProps = {
  endpoint: "https://aura.test/api",
  manifest: {
    appId: "test-app",
    version: "1.0.0",
    surfaces: [{ surfaceId: "test", components: [] }],
  },
  userId: "user-1",
  consentProfile: { level: "full" as const },
  context: {},
};

/**
 * A component that subscribes to a single surface via usePrescription.
 */
function SurfaceConsumer({ surfaceId }: { surfaceId: string }) {
  usePrescription(surfaceId);
  return null;
}

describe("Property 10: No Subscription Leak After Unmount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeSubscriptions.clear();
  });

  it("for any provider with k subscriptions, all are cleaned up on unmount", async () => {
    // Generate k distinct surfaceIds (k between 1 and 10)
    const arbDistinctSurfaceIds = fc
      .array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 })
      .map((arr) => [...new Set(arr)])
      .filter((arr) => arr.length >= 1);

    await fc.assert(
      fc.asyncProperty(arbDistinctSurfaceIds, async (surfaceIds) => {
        activeSubscriptions.clear();

        // Render a provider with k components each subscribing to a unique surface
        let unmountFn: () => void;
        await act(async () => {
          const result = render(
            React.createElement(
              AuraProvider,
              defaultProps,
              ...surfaceIds.map((sid) =>
                React.createElement(SurfaceConsumer, { key: sid, surfaceId: sid }),
              ),
            ),
          );
          unmountFn = result.unmount;
        });

        // After mount: verify k subscriptions are active
        expect(activeSubscriptions.size).toBe(surfaceIds.length);

        // Unmount the entire tree
        act(() => {
          unmountFn!();
        });

        // After unmount: verify all subscriptions are cleaned up
        expect(activeSubscriptions.size).toBe(0);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});
