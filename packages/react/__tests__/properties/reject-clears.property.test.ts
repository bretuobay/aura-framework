// Feature: aura-react, Property 7: Reject Clears Prescription
// **Validates: Requirements 5.5, 12.9**

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, act, cleanup } from "@testing-library/react";
import { arbUIPrescription } from "../arbitraries/prescription.arbitrary";
import type { UIPrescription } from "@aura/protocol";

// Track subscription listener for the surface under test
let subscriptionListener: ((p: UIPrescription | undefined) => void) | null = null;

vi.mock("@aura/sdk", () => ({
  createAuraClient: vi.fn(() => ({
    status: "active",
    init: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    emit: vi.fn(),
    feedback: vi.fn(),
    subscribe: vi.fn((_surfaceId: string, listener: (p: UIPrescription | undefined) => void) => {
      subscriptionListener = listener;
      return () => {
        subscriptionListener = null;
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
    surfaces: [{ surfaceId: "test-surface", components: [] }],
  },
  userId: "user-1",
  consentProfile: { level: "full" as const },
  context: {},
};

/**
 * Simple consumer that exposes the current prescription value via callback.
 */
function PrescriptionConsumer({
  surfaceId,
  onPrescription,
}: {
  surfaceId: string;
  onPrescription: (p: UIPrescription | undefined) => void;
}) {
  const prescription = usePrescription(surfaceId);
  onPrescription(prescription);
  return null;
}

describe("Property 7: Reject Clears Prescription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionListener = null;
  });

  it("after delivering undefined, hook returns undefined regardless of prior prescription sequence", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of 1-5 prescriptions to deliver before the undefined
        fc.array(arbUIPrescription(), { minLength: 1, maxLength: 5 }),
        async (prescriptionSequence) => {
          subscriptionListener = null;

          let currentPrescription: UIPrescription | undefined;

          let unmountFn: () => void;
          await act(async () => {
            const result = render(
              React.createElement(
                AuraProvider,
                defaultProps,
                React.createElement(PrescriptionConsumer, {
                  surfaceId: "test-surface",
                  onPrescription: (p: UIPrescription | undefined) => {
                    currentPrescription = p;
                  },
                }),
              ),
            );
            unmountFn = result.unmount;
          });

          // Ensure subscription was registered
          expect(subscriptionListener).not.toBeNull();

          // Deliver the sequence of prescriptions
          for (const prescription of prescriptionSequence) {
            act(() => {
              subscriptionListener!(prescription);
            });
          }

          // Verify the last prescription was delivered
          const lastPrescription = prescriptionSequence[prescriptionSequence.length - 1];
          expect(currentPrescription).toEqual(lastPrescription);

          // Now deliver undefined (simulating SDK clearing prescription after reject)
          act(() => {
            subscriptionListener!(undefined);
          });

          // Verify: hook returns undefined after the undefined delivery
          expect(currentPrescription).toBeUndefined();

          unmountFn!();
          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
