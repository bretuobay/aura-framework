/**
 * Prescription Application Engine for the AURA E-Commerce Demo.
 *
 * Handles applying prescriptions (ranking, variant, filter-highlight,
 * layout-density, accessibility) to UI state. Validates prescriptions
 * against the manifest, applies them in sequence ID order, and stores
 * previous state for undo support.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import type { UIPrescription, Adaptation, CapabilityManifest } from "@aura/protocol";
import type {
  PrescriptionState,
  AppliedPrescription,
  PrescriptionHistoryEntry,
} from "@/lib/types/prescription";

// ---------------------------------------------------------------------------
// Surface State Types
// ---------------------------------------------------------------------------

/**
 * Represents the adaptable state of the search.results surface.
 */
export interface SearchResultsState {
  /** Current product ID ordering */
  productOrder: string[];
  /** Current Product_Card variant */
  variant: string;
  /** Current layout density */
  layoutDensity: "compact" | "standard" | "expanded";
}

/**
 * Represents the adaptable state of the filter.panel surface.
 */
export interface FilterPanelState {
  /** Currently highlighted filter IDs (max 3) */
  highlightedFilterIds: string[];
  /** Whether the filter panel is collapsed */
  collapsed: boolean;
}

/**
 * Represents the global accessibility state.
 */
export interface AccessibilityState {
  /** Font scale factor (1.0 = default) */
  fontScale: number;
  /** Contrast mode */
  contrast: "normal" | "high";
  /** Whether motion/animations are reduced */
  motionReduced: boolean;
}

/**
 * Combined UI state managed by the prescription engine.
 */
export interface UIState {
  searchResults: SearchResultsState;
  filterPanel: FilterPanelState;
  accessibility: AccessibilityState;
}

// ---------------------------------------------------------------------------
// Validation Result
// ---------------------------------------------------------------------------

export interface ValidationError {
  prescriptionId: string;
  reason: string;
  componentId?: string;
  variant?: string;
}

// ---------------------------------------------------------------------------
// Engine Logger Interface
// ---------------------------------------------------------------------------

/**
 * Logger interface for the prescription engine.
 * Consumers can supply their own implementation (e.g., devtools stream).
 */
export interface PrescriptionLogger {
  error(message: string, detail?: unknown): void;
  warn(message: string, detail?: unknown): void;
  info(message: string, detail?: unknown): void;
}

const defaultLogger: PrescriptionLogger = {
  error: (msg, detail) => console.error(`[PrescriptionEngine] ${msg}`, detail),
  warn: (msg, detail) => console.warn(`[PrescriptionEngine] ${msg}`, detail),
  info: (msg, detail) => console.info(`[PrescriptionEngine] ${msg}`, detail),
};

// ---------------------------------------------------------------------------
// Default State Factories
// ---------------------------------------------------------------------------

export function createDefaultUIState(): UIState {
  return {
    searchResults: {
      productOrder: [],
      variant: "standard",
      layoutDensity: "standard",
    },
    filterPanel: {
      highlightedFilterIds: [],
      collapsed: false,
    },
    accessibility: {
      fontScale: 1.0,
      contrast: "normal",
      motionReduced: false,
    },
  };
}

export function createDefaultPrescriptionState(): PrescriptionState {
  return {
    activePrescriptions: new Map(),
    history: [],
  };
}

// ---------------------------------------------------------------------------
// Prescription Engine
// ---------------------------------------------------------------------------

export class PrescriptionEngine {
  private uiState: UIState;
  private prescriptionState: PrescriptionState;
  private manifest: CapabilityManifest;
  private logger: PrescriptionLogger;

  constructor(
    manifest: CapabilityManifest,
    options?: {
      initialUIState?: UIState;
      logger?: PrescriptionLogger;
    },
  ) {
    this.manifest = manifest;
    this.uiState = options?.initialUIState ?? createDefaultUIState();
    this.prescriptionState = createDefaultPrescriptionState();
    this.logger = options?.logger ?? defaultLogger;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Get the current UI state (read-only snapshot).
   */
  getUIState(): Readonly<UIState> {
    return this.uiState;
  }

  /**
   * Get the current prescription state (read-only snapshot).
   */
  getPrescriptionState(): Readonly<PrescriptionState> {
    return this.prescriptionState;
  }

  /**
   * Apply one or more prescriptions. If multiple prescriptions target the same
   * surface, they are sorted by sequence ID (ascending) and applied sequentially.
   *
   * @returns Array of validation errors for rejected prescriptions.
   *
   * @see Requirements 6.6, 6.7, 6.8
   */
  applyPrescriptions(prescriptions: UIPrescription[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Sort by contextLock.sequenceId ascending for sequential application
    const sorted = [...prescriptions].sort(
      (a, b) => a.contextLock.sequenceId - b.contextLock.sequenceId,
    );

    for (const prescription of sorted) {
      const validationError = this.validatePrescription(prescription);
      if (validationError) {
        errors.push(validationError);
        this.recordHistory(prescription.id, prescription.surfaceId, "rejected");
        this.logger.error(
          `Prescription rejected: ${validationError.reason}`,
          validationError,
        );
        continue;
      }

      this.applySinglePrescription(prescription);
    }

    return errors;
  }

  /**
   * Undo a previously applied prescription, restoring the UI state to
   * what it was before the prescription was applied.
   *
   * @returns true if the prescription was successfully undone, false otherwise.
   *
   * @see Requirement 9.6, 12.7
   */
  undo(prescriptionId: string): boolean {
    const applied = this.prescriptionState.activePrescriptions.get(prescriptionId);
    if (!applied || applied.status !== "active") {
      this.logger.warn(`Cannot undo prescription: not found or not active`, {
        prescriptionId,
        status: applied?.status,
      });
      return false;
    }

    // Restore previous state
    const previousState = applied.previousState as Partial<UIState> | null;
    if (previousState) {
      this.restoreState(previousState);
    }

    // Update prescription status
    applied.status = "undone";
    this.recordHistory(
      prescriptionId,
      applied.prescription.surfaceId,
      "undone",
      previousState,
    );

    this.logger.info(`Prescription undone`, { prescriptionId });
    return true;
  }

  /**
   * Expire a prescription (e.g., when expiresAt is reached).
   */
  expire(prescriptionId: string): boolean {
    const applied = this.prescriptionState.activePrescriptions.get(prescriptionId);
    if (!applied || applied.status !== "active") {
      return false;
    }

    applied.status = "expired";
    this.recordHistory(prescriptionId, applied.prescription.surfaceId, "expired");
    this.logger.info(`Prescription expired`, { prescriptionId });
    return true;
  }

  /**
   * Set the product order for the search results surface.
   * Used to initialize the current product order before applying ranking prescriptions.
   */
  setProductOrder(productIds: string[]): void {
    this.uiState.searchResults.productOrder = [...productIds];
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Validates a prescription against the manifest.
   * Returns a ValidationError if invalid, or null if valid.
   *
   * @see Requirement 6.7
   */
  private validatePrescription(prescription: UIPrescription): ValidationError | null {
    const surface = this.manifest.surfaces.find(
      (s) => s.surfaceId === prescription.surfaceId,
    );

    if (!surface) {
      return {
        prescriptionId: prescription.id,
        reason: `Surface "${prescription.surfaceId}" is not declared in the manifest`,
      };
    }

    // Validate each adaptation references declared components/variants
    for (const adaptation of prescription.adaptations) {
      const error = this.validateAdaptation(adaptation, surface, prescription.id);
      if (error) return error;
    }

    return null;
  }

  /**
   * Validates a single adaptation against the manifest surface.
   */
  private validateAdaptation(
    adaptation: Adaptation,
    surface: CapabilityManifest["surfaces"][number],
    prescriptionId: string,
  ): ValidationError | null {
    switch (adaptation.type) {
      case "componentVariant": {
        const component = surface.components.find(
          (c) => c.componentId === adaptation.componentId,
        );
        if (!component) {
          return {
            prescriptionId,
            reason: `Component "${adaptation.componentId}" is not declared in surface "${surface.surfaceId}"`,
            componentId: adaptation.componentId,
          };
        }
        if (!component.variants.includes(adaptation.variant)) {
          return {
            prescriptionId,
            reason: `Variant "${adaptation.variant}" is not declared for component "${adaptation.componentId}"`,
            componentId: adaptation.componentId,
            variant: adaptation.variant,
          };
        }
        break;
      }
      case "filter": {
        const component = surface.components.find(
          (c) => c.componentId === adaptation.target,
        );
        if (!component) {
          return {
            prescriptionId,
            reason: `Filter target component "${adaptation.target}" is not declared in surface "${surface.surfaceId}"`,
            componentId: adaptation.target,
          };
        }
        break;
      }
      // rank, layout, accessibility, content — no component-specific manifest check
      // (they target the surface as a whole or global settings)
      default:
        break;
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Application
  // -------------------------------------------------------------------------

  /**
   * Applies a single validated prescription to the UI state.
   */
  private applySinglePrescription(prescription: UIPrescription): void {
    // Capture previous state before applying (for undo)
    const previousState = this.captureRelevantState(prescription);

    // Apply each adaptation
    for (const adaptation of prescription.adaptations) {
      this.applyAdaptation(adaptation, prescription.surfaceId);
    }

    // Record as active
    const appliedEntry: AppliedPrescription = {
      prescription,
      appliedAt: new Date().toISOString(),
      previousState,
      status: "active",
    };
    this.prescriptionState.activePrescriptions.set(prescription.id, appliedEntry);

    this.recordHistory(
      prescription.id,
      prescription.surfaceId,
      "applied",
      previousState,
    );
    this.logger.info(`Prescription applied`, { prescriptionId: prescription.id });
  }

  /**
   * Applies a single adaptation to the UI state.
   */
  private applyAdaptation(adaptation: Adaptation, surfaceId: string): void {
    switch (adaptation.type) {
      case "rank":
        this.applyRanking(adaptation.orderedIds);
        break;

      case "componentVariant":
        this.applyVariant(adaptation.variant, surfaceId);
        break;

      case "filter":
        this.applyFilterHighlight(adaptation.visibleFilters);
        break;

      case "layout":
        this.applyLayoutDensity(adaptation.layout);
        break;

      case "accessibility":
        this.applyAccessibility(adaptation.setting, adaptation.value);
        break;

      case "content":
        // Content adaptations are handled at the component level
        // (e.g., badge labels). No global state change needed here.
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Ranking Prescription
  // -------------------------------------------------------------------------

  /**
   * Reorders the product list according to the prescribed order.
   * Products referenced in the ranking appear first in the prescribed order.
   * Non-referenced products maintain their original relative order.
   *
   * @see Requirement 6.1
   */
  private applyRanking(orderedIds: string[]): void {
    const currentOrder = this.uiState.searchResults.productOrder;

    // Separate referenced and non-referenced products
    const orderedSet = new Set(orderedIds);
    const nonReferenced = currentOrder.filter((id) => !orderedSet.has(id));

    // Referenced products go first in prescribed order (only those that exist)
    const referencedInOrder = orderedIds.filter((id) => currentOrder.includes(id));

    this.uiState.searchResults.productOrder = [...referencedInOrder, ...nonReferenced];
  }

  // -------------------------------------------------------------------------
  // Variant Prescription
  // -------------------------------------------------------------------------

  /**
   * Changes the Product_Card variant for all cards in the specified surface.
   *
   * @see Requirement 6.2
   */
  private applyVariant(variant: string, _surfaceId: string): void {
    this.uiState.searchResults.variant = variant;
  }

  // -------------------------------------------------------------------------
  // Filter Highlight Prescription
  // -------------------------------------------------------------------------

  /**
   * Highlights specified filters in the Filter_Panel, capped at 3.
   *
   * @see Requirement 6.3
   */
  private applyFilterHighlight(filterIds: string[]): void {
    // Cap at 3 highlighted filters
    this.uiState.filterPanel.highlightedFilterIds = filterIds.slice(0, 3);
  }

  // -------------------------------------------------------------------------
  // Layout Density Prescription
  // -------------------------------------------------------------------------

  /**
   * Maps protocol layout types to the demo's density concept.
   * - compact → 4-column grid
   * - expanded → 2-column grid
   * - step-by-step / accessible → treated as standard (3-column)
   *
   * @see Requirement 6.4
   */
  private applyLayoutDensity(layout: string): void {
    switch (layout) {
      case "compact":
        this.uiState.searchResults.layoutDensity = "compact";
        break;
      case "expanded":
        this.uiState.searchResults.layoutDensity = "expanded";
        break;
      default:
        this.uiState.searchResults.layoutDensity = "standard";
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Accessibility Prescription
  // -------------------------------------------------------------------------

  /**
   * Applies accessibility settings (font scale, contrast, motion).
   *
   * @see Requirement 6.5
   */
  private applyAccessibility(setting: string, value: string | number | boolean): void {
    switch (setting) {
      case "fontScale":
        if (typeof value === "number") {
          this.uiState.accessibility.fontScale = value;
        }
        break;
      case "contrast":
        if (value === "high" || value === true) {
          this.uiState.accessibility.contrast = "high";
        } else {
          this.uiState.accessibility.contrast = "normal";
        }
        break;
      case "motion":
        if (value === "reduced" || value === true) {
          this.uiState.accessibility.motionReduced = true;
        } else {
          this.uiState.accessibility.motionReduced = false;
        }
        break;
    }
  }

  // -------------------------------------------------------------------------
  // State Capture & Restore
  // -------------------------------------------------------------------------

  /**
   * Captures the relevant portion of UI state before a prescription is applied.
   * This enables undo to restore exactly the pre-adaptation state.
   */
  private captureRelevantState(prescription: UIPrescription): Partial<UIState> {
    const captured: Partial<UIState> = {};

    for (const adaptation of prescription.adaptations) {
      switch (adaptation.type) {
        case "rank":
          captured.searchResults = {
            ...this.uiState.searchResults,
            productOrder: [...this.uiState.searchResults.productOrder],
          };
          break;
        case "componentVariant":
          captured.searchResults = {
            ...(captured.searchResults ?? this.uiState.searchResults),
            variant: this.uiState.searchResults.variant,
            productOrder: [...this.uiState.searchResults.productOrder],
            layoutDensity: this.uiState.searchResults.layoutDensity,
          };
          break;
        case "layout":
          captured.searchResults = {
            ...(captured.searchResults ?? this.uiState.searchResults),
            layoutDensity: this.uiState.searchResults.layoutDensity,
            productOrder: [...this.uiState.searchResults.productOrder],
            variant: this.uiState.searchResults.variant,
          };
          break;
        case "filter":
          captured.filterPanel = {
            ...this.uiState.filterPanel,
            highlightedFilterIds: [...this.uiState.filterPanel.highlightedFilterIds],
          };
          break;
        case "accessibility":
          captured.accessibility = { ...this.uiState.accessibility };
          break;
        case "content":
          // Content adaptations don't change global state tracked here
          break;
      }
    }

    return captured;
  }

  /**
   * Restores the UI state from a captured snapshot.
   */
  private restoreState(previousState: Partial<UIState>): void {
    if (previousState.searchResults) {
      this.uiState.searchResults = {
        ...this.uiState.searchResults,
        ...previousState.searchResults,
        productOrder: [...previousState.searchResults.productOrder],
      };
    }
    if (previousState.filterPanel) {
      this.uiState.filterPanel = {
        ...this.uiState.filterPanel,
        ...previousState.filterPanel,
        highlightedFilterIds: [...previousState.filterPanel.highlightedFilterIds],
      };
    }
    if (previousState.accessibility) {
      this.uiState.accessibility = { ...previousState.accessibility };
    }
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  /**
   * Records a history entry for audit and devtools display.
   */
  private recordHistory(
    prescriptionId: string,
    surfaceId: string,
    action: PrescriptionHistoryEntry["action"],
    previousState?: unknown,
  ): void {
    const entry: PrescriptionHistoryEntry = {
      prescriptionId,
      surfaceId,
      action,
      timestamp: new Date().toISOString(),
      previousState: previousState ?? null,
    };
    this.prescriptionState.history.push(entry);
  }
}
