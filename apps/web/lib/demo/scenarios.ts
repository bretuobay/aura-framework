/**
 * Simulation Scenarios for the AURA E-Commerce Demo.
 *
 * Provides 6 predefined adaptation scenarios that produce static
 * UIPrescription objects for conference demonstrations. Each scenario
 * completes within 100ms of trigger (they are synchronous lookups
 * of pre-built prescription fixtures).
 *
 * @see Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */

import type { UIPrescription, AuraEvent } from "@aura/protocol";
import { getFlags } from "@/lib/config/flags";

// ---------------------------------------------------------------------------
// Scenario Types
// ---------------------------------------------------------------------------

/**
 * The 6 predefined scenario identifiers.
 */
export type ScenarioId =
  | "search-intent-detection"
  | "price-sensitive-user"
  | "brand-preference"
  | "cold-start"
  | "mobile-context"
  | "accessibility-preference";

/**
 * Interface for the simulation engine that manages scenario prescriptions.
 */
export interface SimulationEngine {
  /** Returns a preset prescription for the given scenario */
  getScenarioPrescription(scenarioId: ScenarioId): UIPrescription;

  /** Checks if current flags allow simulation */
  isSimulationActive(): boolean;

  /** Maps trigger events to scenario IDs */
  matchTrigger(event: AuraEvent): ScenarioId | null;
}

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a context lock with a fixed sequence ID and current timestamp.
 */
function createContextLock(sequenceId: number) {
  return {
    sequenceId,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Creates a constraints object with an expiry 1 hour from now.
 */
function createConstraints() {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return { expiresAt };
}

// ---------------------------------------------------------------------------
// Scenario Prescriptions
// ---------------------------------------------------------------------------

/**
 * Search Intent Detection scenario prescription.
 *
 * Trigger: User searches "lightweight laptop for travel"
 * Adaptations:
 * - Rank ultraportable laptops in top 5
 * - Highlight "weight" and "battery" filters
 * - Switch to comparison variant
 *
 * @see Requirement 12.1
 */
function createSearchIntentDetectionPrescription(): UIPrescription {
  return {
    id: "sim-search-intent-detection",
    surfaceId: "search.results",
    mode: "autoApply",
    latencyClass: "fast",
    contextLock: createContextLock(1),
    adaptations: [
      {
        type: "rank",
        orderedIds: [
          "prod_001", // ultraportable laptops placed first
          "prod_002",
          "prod_003",
          "prod_004",
          "prod_005",
        ],
        reasonCode: "search-intent-travel-ultraportable",
      },
      {
        type: "filter",
        target: "filter-panel",
        visibleFilters: ["weight", "battery"],
        reasonCode: "highlight-travel-relevant-filters",
      },
      {
        type: "componentVariant",
        slotId: "product-card-slot",
        componentId: "product-card",
        variant: "comparison",
        reasonCode: "enable-spec-comparison-for-travel-intent",
      },
    ],
    constraints: createConstraints(),
    manifestVersion: "1.0.0",
    audit: {
      dataClassesUsed: ["behavior"],
      policyVersion: "1.0.0",
      decisionSource: "simulation",
    },
    explanation: {
      confidence: 0.92,
      summary:
        "Detected travel intent from your search. Showing ultraportable laptops with specs comparison to help you evaluate weight and battery life.",
    },
  };
}

/**
 * Price-Sensitive User scenario prescription.
 *
 * Trigger: User repeatedly sorts by price or clicks discounted items
 * Adaptations:
 * - Rank discounted products first
 * - Add "Best Price" badge via content adaptation
 * - Highlight price filter
 *
 * @see Requirement 12.2
 */
function createPriceSensitiveUserPrescription(): UIPrescription {
  return {
    id: "sim-price-sensitive-user",
    surfaceId: "search.results",
    mode: "autoApply",
    latencyClass: "fast",
    contextLock: createContextLock(2),
    adaptations: [
      {
        type: "rank",
        orderedIds: [
          "prod_010", // highest-discount products placed first
          "prod_011",
          "prod_012",
          "prod_013",
          "prod_014",
          "prod_015",
          "prod_016",
          "prod_017",
          "prod_018",
          "prod_019",
        ],
        reasonCode: "rank-discounted-products-first",
      },
      {
        type: "content",
        target: "product-card",
        contentKey: "badgeLabel",
        content: "Best Price",
        reasonCode: "badge-high-discount-products",
      },
      {
        type: "filter",
        target: "filter-panel",
        visibleFilters: ["price"],
        reasonCode: "highlight-price-filter-for-value-seeker",
      },
    ],
    constraints: createConstraints(),
    manifestVersion: "1.0.0",
    audit: {
      dataClassesUsed: ["behavior", "personalization"],
      policyVersion: "1.0.0",
      decisionSource: "simulation",
    },
    explanation: {
      confidence: 0.88,
      summary:
        "We noticed you prefer great deals. Showing best-priced products with discount badges to help you find value.",
    },
  };
}

/**
 * Brand Preference scenario prescription.
 *
 * Trigger: Returning user with brand interaction history
 * Adaptations:
 * - Place preferred brand products in top 5
 * - Add "Recommended for you" badge
 *
 * @see Requirement 12.3
 */
function createBrandPreferencePrescription(): UIPrescription {
  return {
    id: "sim-brand-preference",
    surfaceId: "search.results",
    mode: "autoApply",
    latencyClass: "fast",
    contextLock: createContextLock(3),
    adaptations: [
      {
        type: "rank",
        orderedIds: [
          "prod_020", // preferred brand products in top 5
          "prod_021",
          "prod_022",
          "prod_023",
          "prod_024",
        ],
        reasonCode: "rank-preferred-brand-products",
      },
      {
        type: "content",
        target: "product-card",
        contentKey: "badgeLabel",
        content: "Recommended for you",
        reasonCode: "badge-preferred-brand-products",
      },
    ],
    constraints: createConstraints(),
    manifestVersion: "1.0.0",
    audit: {
      dataClassesUsed: ["behavior", "personalization"],
      policyVersion: "1.0.0",
      decisionSource: "simulation",
    },
    explanation: {
      confidence: 0.85,
      summary:
        "Based on your prior interactions, we're highlighting products from your preferred brand.",
    },
  };
}

/**
 * Cold Start scenario prescription.
 *
 * Trigger: First-time visitor with no browsing history
 * Adaptations:
 * - Show diverse categories in results (rank diverse products)
 * - Expand category navigation (filter panel expanded)
 * - Layout for featured products section
 *
 * @see Requirement 12.4
 */
function createColdStartPrescription(): UIPrescription {
  return {
    id: "sim-cold-start",
    surfaceId: "search.results",
    mode: "autoApply",
    latencyClass: "fast",
    contextLock: createContextLock(4),
    adaptations: [
      {
        type: "rank",
        orderedIds: [
          "prod_001", // Laptops representative
          "prod_025", // Headphones representative
          "prod_040", // Smartphones representative
          "prod_055", // Accessories representative
          "prod_075", // Wearables representative
          "prod_085", // Tablets representative
          "prod_095", // Monitors representative
          "prod_002", // Additional featured items
          "prod_026",
          "prod_041",
          "prod_056",
        ],
        reasonCode: "diversify-categories-for-new-visitor",
      },
      {
        type: "filter",
        target: "filter-panel",
        visibleFilters: ["categories"],
        reasonCode: "expand-navigation-for-exploration",
      },
      {
        type: "layout",
        layout: "expanded",
        reasonCode: "featured-products-layout-for-discovery",
      },
    ],
    constraints: createConstraints(),
    manifestVersion: "1.0.0",
    audit: {
      dataClassesUsed: [],
      policyVersion: "1.0.0",
      decisionSource: "simulation",
    },
    explanation: {
      confidence: 0.7,
      summary:
        "Welcome! Showing a diverse selection across categories to help you discover what interests you.",
    },
  };
}

/**
 * Mobile Context scenario prescription.
 *
 * Trigger: Device/viewport detected as mobile
 * Adaptations:
 * - Switch to compact variant
 * - Collapse filter panel
 * - Set compact layout density (ensures 44×44px touch targets via compact grid)
 *
 * @see Requirement 12.5
 */
function createMobileContextPrescription(): UIPrescription {
  return {
    id: "sim-mobile-context",
    surfaceId: "search.results",
    mode: "autoApply",
    latencyClass: "fast",
    contextLock: createContextLock(5),
    adaptations: [
      {
        type: "componentVariant",
        slotId: "product-card-slot",
        componentId: "product-card",
        variant: "compact",
        reasonCode: "compact-variant-for-mobile-viewport",
      },
      {
        type: "filter",
        target: "filter-panel",
        visibleFilters: ["collapsed"],
        reasonCode: "collapse-filter-panel-for-mobile",
      },
      {
        type: "layout",
        layout: "compact",
        reasonCode: "compact-layout-with-touch-targets",
      },
    ],
    constraints: createConstraints(),
    manifestVersion: "1.0.0",
    audit: {
      dataClassesUsed: [],
      policyVersion: "1.0.0",
      decisionSource: "simulation",
    },
    explanation: {
      confidence: 0.95,
      summary:
        "Optimized for mobile: compact cards, collapsed filters, and touch-friendly targets for easier browsing.",
    },
  };
}

/**
 * Accessibility Preference scenario prescription.
 *
 * Trigger: User has high contrast or large font system preferences
 * Adaptations:
 * - Apply 1.5× font scale
 * - Activate WCAG AA high contrast
 * - Disable animations (reduced motion)
 *
 * @see Requirement 12.6
 */
function createAccessibilityPreferencePrescription(): UIPrescription {
  return {
    id: "sim-accessibility-preference",
    surfaceId: "search.results",
    mode: "autoApply",
    latencyClass: "fast",
    contextLock: createContextLock(6),
    adaptations: [
      {
        type: "accessibility",
        setting: "fontScale",
        value: 1.5,
        reasonCode: "large-font-preference-detected",
      },
      {
        type: "accessibility",
        setting: "contrast",
        value: "high",
        reasonCode: "high-contrast-wcag-aa-compliance",
      },
      {
        type: "accessibility",
        setting: "motion",
        value: "reduced",
        reasonCode: "disable-animations-for-accessibility",
      },
    ],
    constraints: createConstraints(),
    manifestVersion: "1.0.0",
    audit: {
      dataClassesUsed: ["accessibility"],
      policyVersion: "1.0.0",
      decisionSource: "simulation",
    },
    explanation: {
      confidence: 0.98,
      summary:
        "Applied accessibility preferences: larger text, high contrast colors, and reduced motion for comfortable viewing.",
    },
  };
}

// ---------------------------------------------------------------------------
// Scenario Registry
// ---------------------------------------------------------------------------

/**
 * Map of scenario IDs to their prescription factory functions.
 */
const SCENARIO_FACTORIES: Record<ScenarioId, () => UIPrescription> = {
  "search-intent-detection": createSearchIntentDetectionPrescription,
  "price-sensitive-user": createPriceSensitiveUserPrescription,
  "brand-preference": createBrandPreferencePrescription,
  "cold-start": createColdStartPrescription,
  "mobile-context": createMobileContextPrescription,
  "accessibility-preference": createAccessibilityPreferencePrescription,
};

/**
 * All available scenario IDs.
 */
export const SCENARIO_IDS: ScenarioId[] = [
  "search-intent-detection",
  "price-sensitive-user",
  "brand-preference",
  "cold-start",
  "mobile-context",
  "accessibility-preference",
];

// ---------------------------------------------------------------------------
// Trigger Matching
// ---------------------------------------------------------------------------

/**
 * Patterns for matching events to scenario triggers.
 * Each entry defines the event type and a predicate on the payload.
 */
const TRIGGER_PATTERNS: Array<{
  scenarioId: ScenarioId;
  eventType: string;
  matches: (payload: Record<string, unknown>) => boolean;
}> = [
  {
    scenarioId: "search-intent-detection",
    eventType: "search.submitted",
    matches: (payload) => {
      const query = String(payload.query ?? "").toLowerCase();
      return (
        query.includes("lightweight") ||
        query.includes("travel") ||
        query.includes("ultraportable") ||
        query.includes("portable")
      );
    },
  },
  {
    scenarioId: "price-sensitive-user",
    eventType: "interaction.clicked",
    matches: (payload) => {
      const elementType = String(payload.elementType ?? "");
      const elementId = String(payload.elementId ?? "");
      return (
        (elementType === "filter" && elementId === "price") ||
        elementId === "sort-price-low"
      );
    },
  },
  {
    scenarioId: "brand-preference",
    eventType: "interaction.clicked",
    matches: (payload) => {
      const elementType = String(payload.elementType ?? "");
      const elementId = String(payload.elementId ?? "");
      return elementType === "filter" && elementId.startsWith("brand-");
    },
  },
  {
    scenarioId: "cold-start",
    eventType: "surface.viewed",
    matches: (payload) => {
      // Triggers for first-time visitor (no prior results viewed)
      return payload.isFirstVisit === true || payload.resultCount === 0;
    },
  },
  {
    scenarioId: "mobile-context",
    eventType: "context.changed",
    matches: (payload) => {
      const property = String(payload.property ?? "");
      const value = payload.value;
      return (
        (property === "device.type" && value === "mobile") ||
        (property === "viewport.width" && typeof value === "number" && value < 768)
      );
    },
  },
  {
    scenarioId: "accessibility-preference",
    eventType: "context.changed",
    matches: (payload) => {
      const property = String(payload.property ?? "");
      const value = payload.value;
      return (
        (property === "accessibility.highContrast" && value === true) ||
        (property === "accessibility.fontSize" && value === "large") ||
        (property === "accessibility.reducedMotion" && value === true)
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Simulation Engine Implementation
// ---------------------------------------------------------------------------

/**
 * Creates a SimulationEngine instance that manages predefined scenario prescriptions.
 *
 * The engine checks the SIMULATE_ADAPTATIONS flag to determine if simulation
 * is active, generates UIPrescription objects for each scenario, and maps
 * incoming events to scenario triggers.
 *
 * All scenario prescriptions are pre-built fixtures — no AI calls or async
 * operations, guaranteeing completion within 100ms of trigger.
 */
export function createSimulationEngine(): SimulationEngine {
  return {
    getScenarioPrescription(scenarioId: ScenarioId): UIPrescription {
      const factory = SCENARIO_FACTORIES[scenarioId];
      if (!factory) {
        throw new Error(`Unknown scenario ID: ${scenarioId}`);
      }
      return factory();
    },

    isSimulationActive(): boolean {
      const flags = getFlags();
      return flags.SIMULATE_ADAPTATIONS;
    },

    matchTrigger(event: AuraEvent): ScenarioId | null {
      for (const pattern of TRIGGER_PATTERNS) {
        if (
          event.type === pattern.eventType &&
          pattern.matches(event.payload)
        ) {
          return pattern.scenarioId;
        }
      }
      return null;
    },
  };
}

/**
 * Singleton simulation engine instance for use across the application.
 */
export const simulationEngine = createSimulationEngine();
