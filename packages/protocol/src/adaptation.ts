import { z } from "zod";
import { AccessibilitySettingSchema, LayoutTypeSchema } from "./enums.js";
import { NonEmptyString } from "./common.js";

// === Rank Adaptation ===
const RankAdaptationSchema = z.object({
  type: z.literal("rank"),
  orderedIds: z.array(z.string().min(1)).nonempty(),
  reasonCode: NonEmptyString,
});

// === ComponentVariant Adaptation ===
const ComponentVariantAdaptationSchema = z.object({
  type: z.literal("componentVariant"),
  slotId: NonEmptyString,
  componentId: NonEmptyString,
  variant: NonEmptyString,
  reasonCode: NonEmptyString,
});

// === Layout Adaptation ===
const LayoutAdaptationSchema = z.object({
  type: z.literal("layout"),
  layout: LayoutTypeSchema,
  reasonCode: NonEmptyString,
});

// === Content Adaptation ===
const ContentAdaptationSchema = z.object({
  type: z.literal("content"),
  target: NonEmptyString,
  contentKey: NonEmptyString,
  content: NonEmptyString,
  reasonCode: NonEmptyString,
});

// === Accessibility Adaptation ===
const AccessibilityAdaptationSchema = z.object({
  type: z.literal("accessibility"),
  setting: AccessibilitySettingSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
  reasonCode: NonEmptyString,
});

// === Filter Adaptation ===
const FilterAdaptationSchema = z.object({
  type: z.literal("filter"),
  target: NonEmptyString,
  visibleFilters: z.array(z.string().min(1)).nonempty(),
  reasonCode: NonEmptyString,
});

// === Adaptation Discriminated Union ===
export const AdaptationSchema = z.discriminatedUnion("type", [
  RankAdaptationSchema,
  ComponentVariantAdaptationSchema,
  LayoutAdaptationSchema,
  ContentAdaptationSchema,
  AccessibilityAdaptationSchema,
  FilterAdaptationSchema,
]);

export type Adaptation = z.infer<typeof AdaptationSchema>;
