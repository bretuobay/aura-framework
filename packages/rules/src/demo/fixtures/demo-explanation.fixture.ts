/**
 * Fixture: Passive explanation rule produces content adaptation with
 * explanation records present on surface.viewed event.
 *
 * Validates that the demo-passive-explanation rule generates a content
 * adaptation and includes explanation metadata (no consent required).
 */

import type { Fixture } from "../../schema/fixture.schema.js";

const fixture: Fixture = {
  id: "demo-explanation-present",
  description:
    "Passive explanation rule produces content adaptation with explanation records on surface.viewed",
  input: {
    events: [
      {
        type: "surface.viewed",
        surfaceId: "search.results",
        timestamp: "2024-01-01T00:02:00Z",
        payload: { referrer: "homepage" },
      },
    ],
    context: { device: "mobile", locale: "en-US" },
    contextSequenceId: "ctx-003",
    profile: { tier: "free" },
    manifest: {
      version: "1.0.0",
      surfaces: [
        {
          surfaceId: "search.results",
          components: [
            {
              componentId: "explanation-banner",
              variants: ["default"],
              riskClass: "low",
            },
            {
              componentId: "product-card",
              variants: ["default"],
              riskClass: "low",
            },
          ],
        },
      ],
    },
    consent: { behavior: true, personalization: true },
    sessionId: "session-003",
    eventBatchId: "batch-003",
  },
  expected: [
    {
      surfaceId: "search.results",
      mode: "autoApply",
      adaptationType: "content",
    },
  ],
};

export default fixture;
