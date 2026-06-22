/**
 * Fixture: Feedback rejection suppresses previously-rejected rule.
 *
 * Validates that when a user has recently rejected the demo-suppressible-recommendation
 * rule, that rule produces zero prescriptions even though conditions and consent match.
 */

import type { Fixture } from "../../schema/fixture.schema.js";

const fixture: Fixture = {
  id: "demo-reject-suppress-basic",
  description:
    "Feedback rejection of demo-suppressible-recommendation produces zero prescriptions for that rule",
  input: {
    events: [
      {
        type: "search.submitted",
        surfaceId: "search.results",
        timestamp: "2024-01-01T00:03:00Z",
        payload: { query: "headphones" },
      },
    ],
    context: { device: "desktop", locale: "en-US" },
    contextSequenceId: "ctx-004",
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
              variants: ["default"],
              riskClass: "low",
            },
            {
              componentId: "product-list",
              variants: ["default"],
              riskClass: "low",
            },
          ],
        },
      ],
    },
    consent: { behavior: true },
    sessionId: "session-004",
    eventBatchId: "batch-004",
    feedback: {
      recentRejections: [
        {
          ruleId: "demo-suppressible-recommendation",
          timestamp: "2024-01-01T00:02:30Z",
        },
      ],
      recentUndos: [],
    },
  },
  expected: [
    {
      surfaceId: "search.results",
      mode: "autoApply",
      adaptationType: "filter",
      ruleId: "demo-filter-highlight",
    },
  ],
};

export default fixture;
