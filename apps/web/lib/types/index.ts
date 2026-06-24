/**
 * Central type exports for the AURA E-Commerce Demo.
 */

export type {
  Product,
  ProductCategory,
  FilterState,
  SortOption,
} from "./product";

export type {
  DemoMode,
  DemoModeConfig,
  SimulationFlags,
} from "./demo";
export { DEMO_MODE_CONFIGS } from "./demo";

export type {
  PrescriptionStatus,
  AppliedPrescription,
  PrescriptionHistoryEntry,
  PrescriptionState,
} from "./prescription";

export type {
  EventBuffer,
  BaseEventFields,
  SurfaceViewedPayload,
  SearchSubmittedPayload,
  InteractionClickedPayload,
  InteractionDwelledPayload,
  ContextChangedPayload,
  FeedbackSubmittedPayload,
  EventPayload,
  EventPayloadMap,
  EventType,
} from "./events";

export type {
  RiskClass,
  FactorCategory,
  ContributingFactor,
  Explanation,
  GovernanceAuditEntry,
  ConsentState,
  ExplanationDisplayConfig,
} from "./explanation";
