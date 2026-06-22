/**
 * Fixture: Product-card comparison variant triggers on product.compareIntent
 * with personalization consent.
 *
 * Validates that the demo-product-card-variant rule produces a componentVariant
 * adaptation when the event matches and personalization consent is granted.
 */

import type { Fixture } from "../../schema/fixture.schema.js";

const fixture: Fixture = {
  id: "demo-product-card-variant-basic",
  description:
    "Product-card comparison variant triggers on product.compareIntent with personalization consent",
  input: {
    events: [
      {
        type: "product.compareIntent",
        surfaceId: "search.results",
        timestamp: "2024-01-01T00:01:00Z",
        payload: {
          productIds: ["prod-001", "prod-002"],
          source: "comparison-button",
        },
      },
    ],
    context: { device: "desktop", locale: "en-US" },
    contextSequenceId: "ctx-002",
    profile: { tier: "standard" },
    manifest: {
      version: "1.0.0",
      surfaces: [
        {
          surfaceId: "search.results",
          components: [
            {
              componentId: "product-card",
              variants: ["default", "comparison"],
              riskClass: "low",
            },
            {
              componentId: "category-filter",
              variants: ["default"],
              riskClass: "low",
            },
          ],
        },
      ],
    },
    consent: { personalization: true },
    sessionId: "session-002",
    eventBatchId: "batch-002",
  },
  expected: [
    {
      surfaceId: "search.results",
      mode: "autoApply",
      adaptationType: "componentVariant",
    },
  ],
};

export default fixture;
