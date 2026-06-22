/**
 * @aura/react — Public API
 *
 * This module is the single entry-point for consumers of @aura/react.
 * Only types and components intended for external use are exported here.
 * AuraContext is intentionally NOT exported (internal implementation detail).
 */

// ─── Components ──────────────────────────────────────────────────────────────
export { AuraProvider } from "./AuraProvider";
export type { AuraProviderProps } from "./AuraProvider";

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { useAura } from "./useAura";
export { useAuraEmit } from "./useAuraEmit";
export { usePrescription } from "./usePrescription";
export { useAuraFeedback } from "./useAuraFeedback";

// ─── Types (local) ───────────────────────────────────────────────────────────
export type { SdkStatus } from "./AuraContext";

// ─── Types re-exported from @aura/sdk ────────────────────────────────────────
export type { AuraClientError, AuraValidationError } from "@aura/sdk";

// ─── Types re-exported from @aura/protocol ───────────────────────────────────
export type {
  AuraEvent,
  UIPrescription,
  FeedbackEvent,
  CapabilityManifest,
  ConsentProfile,
  ContextModel,
} from "@aura/protocol";
