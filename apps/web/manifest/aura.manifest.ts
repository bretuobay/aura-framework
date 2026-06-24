/**
 * AURA Capability Manifest for the E-Commerce Demo Application.
 *
 * Declares all adaptable surfaces, components, variants, constraints,
 * and layout stability strategies that the AURA middleware can target.
 *
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import type { CapabilityManifest } from "@aura/protocol";

/**
 * The AURA capability manifest declaring surfaces and adaptable components.
 *
 * Surfaces:
 * - search.results (low risk): Product cards with 4 variants, reserve-space layout stability
 * - filter.panel (medium risk): Collapsible filter panel with highlight support
 */
export const manifest: CapabilityManifest = {
  version: "1.0.0",
  surfaces: [
    {
      surfaceId: "search.results",
      components: [
        {
          componentId: "product-card",
          variants: ["standard", "compact", "comparison", "image-lead"],
          riskClass: "low",
          adaptableProps: {
            variant: "enum:standard,compact,comparison,image-lead",
            showPrice: "boolean",
            showRating: "boolean",
            badgeLabel: "string:max24",
          },
          constraints: {
            requiresConsent: ["personalization"],
            reversible: true,
          },
        },
      ],
      layoutStability: {
        strategy: "reserve-space",
        maxDecisionWaitMs: 150,
      },
    },
    {
      surfaceId: "filter.panel",
      components: [
        {
          componentId: "filter-panel",
          variants: ["default"],
          riskClass: "medium",
          adaptableProps: {
            highlightedFilterIds: "array:string:max3",
            collapsed: "boolean",
          },
          constraints: {
            reversible: true,
          },
        },
      ],
    },
  ],
};
