/**
 * Central export for all shared fast-check arbitrary generators.
 * Import from this file for convenience in property-based tests.
 */
export {
  arbProduct,
  arbProductCatalog,
  arbProductCatalogWithCategories,
  arbProductCategory,
  arbProductId,
  arbProductName,
  arbProductDescription,
  arbPrice,
  arbBrand,
  arbRating,
  arbReviewCount,
  arbImageUrl,
  arbSpecs,
  arbTag,
  arbTags,
  arbDiscount,
  PRODUCT_CATEGORIES,
} from "./product.arb";

export {
  arbPrescription,
  arbPrescriptionForSurface,
  arbPrescriptionWithSequence,
  arbRankingPrescription,
  arbRankingPrescriptionStandalone,
  arbBadgeLabel,
  arbBadgeLabelAnyLength,
  arbVariant,
  arbValidVariant,
  arbInvalidVariant,
  VALID_VARIANTS,
  type ProductCardVariant,
} from "./prescription.arb";

export {
  arbFilterState,
  arbActiveFilterState,
  arbEmptyFilterState,
  arbCategoryFilter,
  arbPriceRange,
  arbRatingsFilter,
  arbBrandsFilter,
  arbHighlightedFilterIds,
  arbHighlightedFilterIdsAnyLength,
} from "./filter.arb";

export {
  arbEvent,
  arbEventWithSession,
  arbEventSequence,
  arbSearchQuery,
  arbSearchQueryAnyLength,
  arbLongSearchQuery,
  arbNonEmptySearchQuery,
  arbISOTimestamp,
  arbSessionId,
  arbEventType,
  arbSurfaceId,
  EVENT_TYPES,
} from "./event.arb";

export {
  arbExplanation,
  arbExplanationAnyLength,
  arbContributingFactor,
  arbFactorCategory,
  arbSentence,
  arbConfidence,
  arbConfidenceAnyRange,
  arbRiskClass,
  FACTOR_CATEGORIES,
  RISK_CLASSES,
} from "./explanation.arb";
