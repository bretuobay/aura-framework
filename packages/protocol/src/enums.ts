import { z } from "zod";

// === RiskClass ===
export const RiskClassSchema = z.enum(["low", "medium", "high", "critical"]);
export type RiskClass = z.infer<typeof RiskClassSchema>;

// === PrescriptionMode ===
export const PrescriptionModeSchema = z.enum(["recommend", "autoApply", "askUser", "observeOnly"]);
export type PrescriptionMode = z.infer<typeof PrescriptionModeSchema>;

// === NetworkQuality ===
export const NetworkQualitySchema = z.enum(["offline", "slow", "moderate", "fast"]);
export type NetworkQuality = z.infer<typeof NetworkQualitySchema>;

// === LatencyClass ===
export const LatencyClassSchema = z.enum(["immediate", "fast", "deliberate"]);
export type LatencyClass = z.infer<typeof LatencyClassSchema>;

// === LayoutStrategy ===
export const LayoutStrategySchema = z.enum(["none", "reserve-space", "skeleton", "host-default"]);
export type LayoutStrategy = z.infer<typeof LayoutStrategySchema>;

// === AdaptationType ===
export const AdaptationTypeSchema = z.enum([
  "rank",
  "componentVariant",
  "layout",
  "content",
  "accessibility",
  "filter",
]);
export type AdaptationType = z.infer<typeof AdaptationTypeSchema>;

// === FeedbackAction ===
export const FeedbackActionSchema = z.enum([
  "accept",
  "dismiss",
  "override",
  "undo",
  "reject",
  "error",
]);
export type FeedbackAction = z.infer<typeof FeedbackActionSchema>;

// === ProfileProvenance ===
export const ProfileProvenanceSchema = z.enum(["explicit", "inferred", "imported"]);
export type ProfileProvenance = z.infer<typeof ProfileProvenanceSchema>;

// === CorrectionAction ===
export const CorrectionActionSchema = z.enum(["remove", "correct"]);
export type CorrectionAction = z.infer<typeof CorrectionActionSchema>;

// === DataClass ===
export const DataClassSchema = z.enum([
  "behavior",
  "personalization",
  "accessibility",
  "approximateLocation",
  "health",
  "education",
  "demographics",
  "emotion",
  "sensitiveInference",
  "cloudModelUse",
  "aggregation",
  "retention",
]);
export type DataClass = z.infer<typeof DataClassSchema>;

// === AccessibilitySetting ===
export const AccessibilitySettingSchema = z.enum(["fontScale", "contrast", "motion", "inputMode"]);
export type AccessibilitySetting = z.infer<typeof AccessibilitySettingSchema>;

// === LayoutType ===
export const LayoutTypeSchema = z.enum(["compact", "expanded", "step-by-step", "accessible"]);
export type LayoutType = z.infer<typeof LayoutTypeSchema>;
