/**
 * Demo rules for an e-commerce search surface.
 *
 * Demonstrates the four core adaptation scenarios:
 * 1. Filter highlighting based on search behavior
 * 2. Product-card component variant for comparison intent
 * 3. Passive explanation with full metadata
 * 4. Rule subject to reject/undo suppression via feedback context
 */

import type { Rule } from "../schema/types.js";

export const Demo_Rules: Rule[] = [
  // ─── 1. Filter Highlighting ───────────────────────────────────────────────────
  {
    id: "demo-filter-highlight",
    priority: 10,
    riskClass: "low",
    conditions: [
      { path: "events.type", operator: "eq", value: "search.submitted" },
    ],
    actions: [
      {
        adaptationType: "filter",
        surfaceId: "search.results",
        slotId: "filters",
        payload: {
          target: "category-filter",
          visibleFilters: ["brand", "price", "rating"],
          reasonCode: "highlight-active",
        },
      },
    ],
    requiredConsent: ["behavior"],
    metadata: {
      explanationSummary:
        "Highlighting relevant filters based on your search behavior",
      explanationFactors: ["search query", "category interest"],
      userVisible: true,
      decisionSource: "rules",
    },
  },

  // ─── 2. Product-Card Comparison Variant ───────────────────────────────────────
  {
    id: "demo-product-card-variant",
    priority: 20,
    riskClass: "low",
    conditions: [
      {
        path: "events.type",
        operator: "eq",
        value: "product.compareIntent",
      },
    ],
    actions: [
      {
        adaptationType: "componentVariant",
        surfaceId: "search.results",
        slotId: "product-card",
        payload: {
          componentId: "product-card",
          variant: "comparison",
          showDiffHighlight: true,
        },
      },
    ],
    requiredConsent: ["personalization"],
    metadata: {
      explanationSummary:
        "Switching to comparison view based on your browsing pattern",
      explanationFactors: ["compare intent signal", "product views"],
      userVisible: true,
      decisionSource: "rules",
    },
  },

  // ─── 3. Passive Explanation Rule ──────────────────────────────────────────────
  {
    id: "demo-passive-explanation",
    priority: 5,
    riskClass: "low",
    conditions: [
      { path: "events.type", operator: "eq", value: "surface.viewed" },
    ],
    actions: [
      {
        adaptationType: "content",
        surfaceId: "search.results",
        slotId: "explanation-banner",
        payload: {
          message: "Results personalized based on your preferences",
          dismissible: true,
        },
      },
    ],
    metadata: {
      explanationSummary:
        "Showing a personalization notice to keep you informed",
      explanationFactors: [
        "active personalization rules",
        "consent status",
        "session behavior",
      ],
      userVisible: true,
      decisionSource: "rules",
    },
  },

  // ─── 4. Suppressible Recommendation (for reject/undo testing) ─────────────────
  {
    id: "demo-suppressible-recommendation",
    priority: 15,
    riskClass: "low",
    conditions: [
      { path: "events.type", operator: "eq", value: "search.submitted" },
    ],
    actions: [
      {
        adaptationType: "rank",
        surfaceId: "search.results",
        slotId: "product-list",
        payload: {
          strategy: "boost-recently-viewed",
          maxBoost: 3,
        },
      },
    ],
    requiredConsent: ["behavior"],
    metadata: {
      explanationSummary:
        "Boosting recently viewed items in your search results",
      explanationFactors: ["recently viewed products", "search relevance"],
      userVisible: true,
      decisionSource: "rules",
    },
  },
];
