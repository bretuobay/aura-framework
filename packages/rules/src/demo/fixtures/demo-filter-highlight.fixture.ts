/**
 * Fixture: Filter highlighting triggers on search.submitted with behavior consent.
 *
 * Validates that the demo-filter-highlight rule produces a filter adaptation
 * when the event type matches and behavior consent is granted.
 */

import type { Fixture } from "../../schema/fixture.schema.js";

const fixture: Fixture = {
  id: "demo-filter-highlight-basic",
  description: "Filter highlighting triggers on search.submitted with behavior consent",
  input: {
    events: [
      {
        type: "search.submitted",
        surfaceId: "search.results",
        timestamp: "2024-01-01T00:00:00Z",
        payload: { query: "running shoes" },
      },
    ],
    context: { device: "desktop", locale: "en-US" },
    contextSequenceId: "ctx-001",
    profile: { tier: "premium" },
    manifest: {
      version: "1.0.0",
      surfaces: [
        {
          surfaceId: "search.results",
          components: [
            {
              componentId: "category-filter",
              variants: ["default", "highlighted"],
              riskClass: "low",
            },
            {
              componentId: "product-card",
              variants: ["default", "comparison"],
              riskClass: "low",
            },
          ],
        },
      ],
    },
    consent: { behavior: true },
    sessionId: "session-001",
    eventBatchId: "batch-001",
  },
  expected: [
    {
      surfaceId: "search.results",
      mode: "autoApply",
      adaptationType: "filter",
    },
  ],
};

export default fixture;
