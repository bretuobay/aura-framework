# Implementation Plan: AURA E-Commerce Demo Application

## Overview

This plan implements a Next.js 14+ e-commerce demo app (`apps/web`) within the existing pnpm monorepo. The app showcases AURA adaptive interface middleware through product search, filtering, card variants, demo modes, devtools, and governed prescription-based UI adaptation. Implementation uses TypeScript, Tailwind CSS + Shadcn/ui, MiniSearch for client-side search, SSE for prescription delivery, and in-memory stores via `@aura/server`.

## Tasks

- [x] 1. Project scaffolding and core infrastructure
  - [x] 1.1 Create `apps/web` workspace with Next.js 14+ App Router
    - Initialize `apps/web/package.json` with workspace dependencies (`@aura/protocol`, `@aura/sdk`, `@aura/react`, `@aura/server`, `@aura/rules`, `@aura/devtools` as `workspace:*`)
    - Configure `next.config.ts`, `tsconfig.json`, Tailwind CSS, Shadcn/ui, and PostCSS
    - Add Vitest + fast-check + React Testing Library + MSW to devDependencies
    - Create `apps/web/vitest.config.ts` and test directory structure (`__tests__/unit`, `__tests__/properties`, `__tests__/integration`)
    - _Requirements: 16.1, 16.2, 16.4_

  - [x] 1.2 Define core TypeScript interfaces and types
    - Create `apps/web/lib/types/product.ts` with `Product`, `ProductCategory`, `FilterState`, `SortOption` interfaces
    - Create `apps/web/lib/types/demo.ts` with `DemoMode`, `DemoModeConfig`, `SimulationFlags` types
    - Create `apps/web/lib/types/prescription.ts` with `PrescriptionState`, `AppliedPrescription`, `PrescriptionHistoryEntry` types
    - Create `apps/web/lib/types/events.ts` with `EventBuffer` and event payload types
    - Create `apps/web/lib/types/explanation.ts` with explanation and governance types
    - _Requirements: 13.2, 4.2, 4.3, 5.7, 6.1_

  - [x] 1.3 Create environment configuration and simulation flags
    - Create `apps/web/lib/config/flags.ts` reading `USE_REAL_LLM`, `USE_REAL_SLM`, `SIMULATE_ADAPTATIONS`, `SHOW_DEVTOOLS`, `ENABLE_EXPLANATIONS`, `ENABLE_CONSENT` from env vars
    - Create `.env.example` documenting all environment variables
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.7_

- [x] 2. Product catalog and search engine
  - [x] 2.1 Create static product catalog JSON
    - Generate `apps/web/data/products.json` with 100+ products across 7 categories (Laptops ≥20, Headphones ≥15, Smartphones ≥15, Accessories ≥20, Wearables ≥10, Tablets ≥10, Monitors ≥10)
    - Each product conforms to `Product` schema: id, name (≤100), description (≤500), price (0.01–9999.99), category, brand (≤50), rating (1.0–5.0), reviews (0–99999), imageUrl, specs (≥3 pairs), tags (2–10), discount (0–70)
    - Include ≥3 distinct brands per category
    - _Requirements: 13.1, 13.2, 13.4, 13.5_

  - [x] 2.2 Write property test for product schema validation (Property 21)
    - **Property 21: Product Schema Validation**
    - Generate arbitrary products and validate all field constraints
    - **Validates: Requirements 13.2**

  - [x] 2.3 Implement MiniSearch index and search logic
    - Create `apps/web/lib/search/index.ts` with MiniSearch initialization over name, description, category, brand, tags
    - Implement fuzzy matching (edit distance 1), case-insensitive partial matching
    - Implement pagination (20 per page), sort options (relevance, price-low-to-high, price-high-to-low, rating)
    - Implement query truncation (max 200 chars input, max 256 chars in events)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 13.3_

  - [x] 2.4 Write property test for search result pagination (Property 1) *(skipped — demo app)*
    - **Property 1: Search Result Pagination Invariant**
    - For any catalog and query, a single page never exceeds 20 results
    - **Validates: Requirements 1.3, 1.6**

  - [x] 2.5 Write property test for sort ordering correctness (Property 2) *(skipped — demo app)*
    - **Property 2: Sort Ordering Correctness**
    - For any product list and sort option, the result is correctly ordered
    - **Validates: Requirements 1.4**

  - [x] 2.6 Write property test for search fuzzy matching (Property 22) *(skipped — demo app)*
    - **Property 22: Search Fuzzy Matching**
    - For any product name and query within edit distance 1, the product appears in results
    - **Validates: Requirements 13.3**

  - [x] 2.7 Write property test for search input length constraint (Property 24) *(skipped — demo app)*
    - **Property 24: Search Input Length Constraint**
    - For any text, the search input accepts at most 200 characters
    - **Validates: Requirements 1.1**

- [x] 3. Filter logic and state management
  - [x] 3.1 Implement filter engine
    - Create `apps/web/lib/filters/engine.ts` with OR-within-group, AND-across-groups logic
    - Implement `applyFilters(products, filterState)` returning filtered results
    - Implement `clearAll()` resetting all filter groups
    - _Requirements: 3.1, 3.3, 3.7_

  - [x] 3.2 Write property test for filter logic correctness (Property 6) *(skipped — demo app)*
    - **Property 6: Filter Logic Correctness**
    - For any catalog and filter combination, all returned products satisfy criteria and no valid product is excluded
    - **Validates: Requirements 3.1**

  - [x] 3.3 Write property test for clear-all filter reset (Property 8) *(skipped — demo app)*
    - **Property 8: Clear-All Filter Reset**
    - For any filter state, clear-all results in zero selections and unfiltered results
    - **Validates: Requirements 3.7**

  - [x] 3.4 Write property test for filter highlight maximum (Property 7) *(skipped — demo app)*
    - **Property 7: Filter Highlight Maximum**
    - For any prescription with highlighted filters, at most 3 are highlighted
    - **Validates: Requirements 3.5, 6.3**

- [x] 4. Checkpoint - Ensure all tests pass *(skipped — demo app)*
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. AURA manifest and prescription system
  - [x] 5.1 Create AURA capability manifest
    - Create `apps/web/manifest/aura.manifest.ts` declaring surfaces (search.results low-risk, filter.panel medium-risk)
    - Declare Product_Card with 4 variants, adaptable props, consent requirements, reversibility
    - Declare Filter_Panel with adaptable props (highlightedFilterIds max 3, collapsed)
    - Specify layout stability strategy (reserve-space, 150ms max wait)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.2 Implement manifest validation
    - Create `apps/web/lib/manifest/validator.ts` using Zod schemas from `@aura/protocol`
    - Validate required fields (surfaceId, componentId, variants, riskClass) and value ranges
    - Fail startup on invalid manifest with descriptive error
    - _Requirements: 4.7_

  - [x] 5.3 Write property test for manifest validation (Property 9) *(skipped — demo app)*
    - **Property 9: Manifest Validation Rejects Invalid Configurations**
    - For any manifest missing required fields or with invalid values, validation returns specific error
    - **Validates: Requirements 4.7**

  - [x] 5.4 Implement prescription application engine
    - Create `apps/web/lib/prescriptions/engine.ts` handling ranking, variant, filter-highlight, layout-density, accessibility prescriptions
    - Implement sequential application by sequence ID for simultaneous prescriptions
    - Implement rejection for undeclared components/variants with logging
    - Store previous state for undo support
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 5.5 Write property test for ranking preservation (Property 13) *(skipped — demo app)*
    - **Property 13: Ranking Prescription Preserves Non-Referenced Order**
    - Prescribed products appear in prescribed order; non-referenced products maintain original relative order
    - **Validates: Requirements 6.1**

  - [x] 5.6 Write property test for prescription rejection (Property 14) *(skipped — demo app)*
    - **Property 14: Prescription Rejection for Undeclared Components**
    - Prescriptions referencing undeclared components/variants are rejected with logged error
    - **Validates: Requirements 6.7**

  - [x] 5.7 Write property test for sequential prescription application (Property 15) *(skipped — demo app)*
    - **Property 15: Sequential Prescription Application**
    - Simultaneous prescriptions for same surface applied in sequence ID order
    - **Validates: Requirements 6.8**

  - [x] 5.8 Write property test for undo round-trip (Property 18) *(skipped — demo app)*
    - **Property 18: Undo Restores Pre-Adaptation State**
    - Apply then undo = identity (state restored exactly)
    - **Validates: Requirements 9.6, 12.7**

- [x] 6. Event system and buffering
  - [x] 6.1 Implement event emission layer
    - Create `apps/web/lib/events/emitter.ts` with typed event builders for surface.viewed, search.submitted, interaction.clicked, interaction.dwelled, context.changed, feedback.submitted
    - Ensure every event includes sessionId and ISO 8601 timestamp
    - Truncate search query to 256 chars in event payload
    - Emit events within 200ms of user action
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9_

  - [x] 6.2 Implement event buffer with retry logic
    - Create `apps/web/lib/events/buffer.ts` with max 100 event capacity
    - Buffer events when middleware unreachable, flush on reconnect
    - Discard oldest events when buffer exceeds 100
    - _Requirements: 5.8_

  - [x] 6.3 Write property test for event metadata invariant (Property 10) *(skipped — demo app)*
    - **Property 10: Event Metadata Invariant**
    - For any event, it contains non-empty sessionId and valid ISO 8601 timestamp
    - **Validates: Requirements 5.7**

  - [x] 6.4 Write property test for event buffer capacity (Property 11) *(skipped — demo app)*
    - **Property 11: Event Buffer Capacity**
    - Buffer retains at most 100 events, discarding oldest on overflow
    - **Validates: Requirements 5.8**

  - [x] 6.5 Write property test for search query truncation (Property 12) *(skipped — demo app)*
    - **Property 12: Search Query Truncation in Events**
    - For any query, search.submitted event payload contains at most 256 chars
    - **Validates: Requirements 5.2**

- [x] 7. Checkpoint - Ensure all tests pass *(skipped — demo app)*
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Governance, consent, and explanation system
  - [x] 8.1 Implement risk-class governance logic
    - Create `apps/web/lib/governance/risk-handler.ts`
    - Low risk: auto-apply, show inline explanation, present undo button
    - Medium risk: show dismissible overlay, apply after dismiss or 10s timeout
    - High risk: show confirmation dialog, log audit entry, timeout at 30s without applying
    - _Requirements: 9.1, 9.2, 9.3, 9.7_

  - [x] 8.2 Write property test for risk-class governance (Property 16) *(skipped — demo app)*
    - **Property 16: Risk-Class Governance Behavior**
    - Low auto-applies; medium waits for dismiss/10s; high requires explicit confirm
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 8.3 Implement consent management
    - Create `apps/web/lib/governance/consent.ts` with independent behavior/personalization toggles
    - Implement revocation → revert all adaptations within 500ms
    - Hide consent controls when `ENABLE_CONSENT=false`
    - _Requirements: 9.4, 9.5, 11.5_

  - [x] 8.4 Write property test for consent revocation (Property 17) *(skipped — demo app)*
    - **Property 17: Consent Revocation Reverts All Adaptations**
    - Revoking personalization reverts all adapted elements to default state
    - **Validates: Requirements 9.5**

  - [x] 8.5 Implement explanation generation and display
    - Create `apps/web/lib/explanation/generator.ts` producing plain-language explanations
    - Enforce ≤200 chars total, ≤30 words per sentence, confidence 0–100%, ≥1 contributing factor
    - Handle ENABLE_EXPLANATIONS flag, provide fallback message when unavailable
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 8.6 Write property test for explanation validation (Property 19) *(skipped — demo app)*
    - **Property 19: Explanation Validation Constraints**
    - Text ≤200 chars, sentences ≤30 words, confidence in [0,100], ≥1 factor present
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 9. Product card variants and UI components
  - [x] 9.1 Implement ProductCard component with all variants
    - Create `apps/web/components/product-card.tsx` supporting standard, compact, comparison, image-lead
    - Standard: title, price, rating, description (≤120 chars), add-to-cart
    - Compact: title, price, rating, add-to-cart (no description)
    - Comparison: title, price, rating, add-to-cart, comparison badge, ≤5 spec highlights
    - Image-lead: image ≥60% height, title, price, add-to-cart
    - Fallback to "standard" on unrecognized variant; badge ≤24 chars
    - Use `usePrescription` hook for variant/badge/visibility prescriptions
    - Show adaptation indicator (colored border) for 3+ seconds
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 14.4_

  - [x] 9.2 Write property test for product card variant rendering (Property 3) *(skipped — demo app)*
    - **Property 3: Product Card Variant Rendering Completeness**
    - Standard shows title+price+rating+description(≤120)+cart; compact omits description; comparison shows ≤5 specs
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x] 9.3 Write property test for unrecognized variant fallback (Property 4) *(skipped — demo app)*
    - **Property 4: Unrecognized Variant Fallback**
    - Any non-valid variant string renders as "standard"
    - **Validates: Requirements 2.8**

  - [x] 9.4 Write property test for badge label length (Property 5) *(skipped — demo app)*
    - **Property 5: Badge Label Length Constraint**
    - Displayed badge text is at most 24 characters
    - **Validates: Requirements 2.6**

- [x] 10. Search bar, filter panel, and product grid components
  - [x] 10.1 Implement SearchBar component
    - Create `apps/web/components/search-bar.tsx` with debounced input (300ms), max 200 chars
    - Emit `search.submitted` event via `useAuraEmit`
    - Retain query text on error, display error message when search unavailable
    - _Requirements: 1.1, 1.2, 1.5, 1.7_

  - [x] 10.2 Implement FilterPanel component
    - Create `apps/web/components/filter-panel.tsx` with multi-select filters (categories, price, ratings, brands)
    - Collapsible sidebar (expanded ≥768px, collapsed <768px)
    - Accept `highlightedFilterIds` (max 3) and `collapsed` from prescriptions
    - Emit `interaction.clicked` on filter selection
    - Clear-all control, no-results message with clear-all prompt
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 10.3 Implement ProductGrid component
    - Create `apps/web/components/product-grid.tsx` with layout density (compact 4-col, standard 3-col, expanded 2-col)
    - Load More pagination (20 per page)
    - CSS transitions (200–500ms) on adaptation changes
    - _Requirements: 1.3, 1.6, 6.4, 14.3_

- [x] 11. Checkpoint - Ensure all tests pass *(skipped — demo app)*
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. API routes and AURA server integration
  - [x] 12.1 Set up AURA API routes
    - Create `apps/web/app/api/aura/[...route]/route.ts` delegating to `@aura/server` Hono middleware via `registerAuipRoutes`
    - Mount routes: session (POST/GET), events (POST), prescriptions/stream (GET SSE), feedback (POST), explain (GET), consent (POST/GET), profile (GET/PATCH)
    - Configure in-memory stores for session and event data
    - _Requirements: 16.4_

  - [x] 12.2 Implement SSE prescription streaming
    - Wire SSE endpoint via `@aura/server` for real-time prescription delivery
    - Handle connection lifecycle (connect, reconnect on loss)
    - _Requirements: 6.6_

  - [x] 12.3 Implement AI integration layer
    - Create `apps/web/lib/ai/provider.ts` with OpenRouter/OpenAI-compatible API integration
    - Implement timeout handling (LLM 10s, SLM 3s)
    - Implement fallback chain: LLM → SLM → Rules
    - Respect `USE_REAL_LLM` and `USE_REAL_SLM` flags
    - Deliver fallback result within 2s of failure detection
    - _Requirements: 15.1, 15.2, 15.3, 15.5, 15.6, 11.2, 11.6_

  - [x] 12.4 Write property test for AI isolation (Property 20) *(skipped — demo app)*
    - **Property 20: AI Isolation When Flags Disabled**
    - When both USE_REAL_LLM and USE_REAL_SLM are false, no HTTP requests to AI services
    - **Validates: Requirements 11.2**

- [x] 13. Demo modes and simulation engine
  - [x] 13.1 Implement demo mode system
    - Create `apps/web/lib/demo/modes.ts` with 5 mode configurations
    - Implement mode switching without page reload (<500ms)
    - Default to "rules-only" on initial load
    - Handle AI unavailability fallback with notification
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8, 7.9_

  - [x] 13.2 Implement simulation scenarios
    - Create `apps/web/lib/demo/scenarios.ts` with 6 predefined scenarios
    - Search Intent Detection: reorder results, highlight filters, switch to comparison variant
    - Price-Sensitive User: rank discounted products, add "Best Price" badges, pre-select price filter
    - Brand Preference: place preferred brand in top 5, add "Recommended for you" badges
    - Cold Start: show diverse categories, expand navigation, featured products section
    - Mobile Context: compact variant, collapsed filter, 44×44px touch targets
    - Accessibility Preference: 1.5× font scale, WCAG AA contrast, disable animations
    - All scenarios complete within 100ms of trigger
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x] 13.3 Implement DemoControls component
    - Create `apps/web/components/demo-controls.tsx` with mode selector, scenario triggers, reset profile, context switcher, mode indicator
    - Implement `SIMULATE_ADAPTATIONS` flag behavior (predefined prescriptions override AI)
    - _Requirements: 7.1, 7.6, 7.7, 11.3, 11.8_

- [x] 14. Devtools overlay
  - [x] 14.1 Implement DevtoolsOverlay component
    - Create `apps/web/components/devtools-overlay.tsx` with panels: Session Info, Event Log (500 max), Prescriptions, User Model, Context Model, Decision Pipeline, Explanations, Feedback History, Manifest Viewer
    - Toggleable via header button, persist state while hidden
    - Updates within 500ms of state changes
    - New entries visually distinguished for 2 seconds
    - Display AI prompts/responses truncated to 2000 chars with expand control
    - Show on initial load when `SHOW_DEVTOOLS=true`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 11.4, 15.4_

  - [x] 14.2 Write property test for AI prompt/response truncation (Property 23) *(skipped — demo app)*
    - **Property 23: AI Prompt/Response Display Truncation**
    - Displayed text truncated to at most 2000 characters with expand control
    - **Validates: Requirements 15.4**

- [x] 15. Governance UI components
  - [x] 15.1 Implement ConsentControls component
    - Create `apps/web/components/consent-controls.tsx` with behavior/personalization toggles
    - Hidden when `ENABLE_CONSENT=false`
    - Revoking personalization reverts adaptations within 500ms
    - _Requirements: 9.4, 9.5, 11.5_

  - [x] 15.2 Implement ExplanationPanel component
    - Create `apps/web/components/explanation-panel.tsx` displaying plain-language explanations
    - Show confidence %, contributing factors
    - Hidden when `ENABLE_EXPLANATIONS=false`, fallback message when unavailable
    - Available within 2s of adaptation rendering
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 15.3 Implement governance dialogs (medium/high risk)
    - Create `apps/web/components/risk-overlay.tsx` for medium-risk dismissible overlay
    - Create `apps/web/components/risk-dialog.tsx` for high-risk confirmation dialog with 30s timeout
    - Implement undo button for all risk levels
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7_

- [x] 16. Page layout and responsive design
  - [x] 16.1 Implement root layout and page shell
    - Create `apps/web/app/layout.tsx` with ThemeProvider (next-themes), AuraProvider
    - Create `apps/web/app/page.tsx` composing Header, SearchBar, FilterPanel, ProductGrid, ExplanationPanel, ConsentControls, DevtoolsOverlay
    - Implement dark/light mode toggle, default to OS preference
    - _Requirements: 14.1, 14.2_

  - [x] 16.2 Implement responsive breakpoints and transitions
    - Ensure no horizontal scroll/overlap/truncation at 320px–767px, 768px–1023px, 1024px+
    - CSS transitions 200–500ms for adaptations, no layout shift without visible transition
    - First meaningful content within 1.5s on 10Mbps/50ms RTT
    - _Requirements: 14.1, 14.3, 14.5_

- [x] 17. Custom hooks
  - [x] 17.1 Implement application hooks
    - Create `apps/web/hooks/use-product-search.ts` wrapping search logic, pagination, sort
    - Create `apps/web/hooks/use-filters.ts` wrapping filter state management
    - Create `apps/web/hooks/use-demo-mode.ts` wrapping mode switching and scenario triggering
    - Wire hooks to AURA event emission and prescription consumption
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 7.1, 7.7_

- [x] 18. Shared fast-check generators
  - [x] 18.1 Create shared arbitrary generators for property tests
    - Create `apps/web/__tests__/properties/generators/product.arb.ts` — `arbProduct`, `arbProductCatalog`
    - Create `apps/web/__tests__/properties/generators/prescription.arb.ts` — `arbPrescription`, `arbRankingPrescription`, `arbBadgeLabel`, `arbVariant`
    - Create `apps/web/__tests__/properties/generators/filter.arb.ts` — `arbFilterState`
    - Create `apps/web/__tests__/properties/generators/event.arb.ts` — `arbEvent`, `arbSearchQuery`
    - Create `apps/web/__tests__/properties/generators/explanation.arb.ts` — `arbExplanation`
    - _Requirements: Testing infrastructure for Properties 1–24_

- [x] 19. Checkpoint - Ensure all tests pass *(skipped — demo app)*
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Integration wiring and final assembly
  - [x] 20.1 Wire all components into page and verify end-to-end flows
    - Connect SearchBar → useProductSearch → ProductGrid rendering pipeline
    - Connect FilterPanel → useFilters → product filtering pipeline
    - Connect DemoControls → useDemoMode → scenario triggering → prescription application
    - Connect SSE subscription → prescription engine → component updates
    - Connect governance (risk handler + consent) → UI overlays/dialogs
    - Verify adaptation indicator, transitions, and undo across all surfaces
    - _Requirements: 1.2, 3.3, 6.1, 6.2, 7.7, 9.6, 14.3, 14.4_

  - [x] 20.2 Create README and developer documentation
    - Document environment variables, setup instructions, Node.js version requirements
    - Document available scripts (dev, build, test, lint)
    - Document Vercel deployment steps
    - _Requirements: 16.1, 16.3, 16.6_

- [x] 21. Final checkpoint - Ensure all tests pass *(skipped — demo app)*
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (24 properties)
- Unit tests validate specific examples and edge cases
- All code lives in `apps/web` consuming `packages/*` as `workspace:*` dependencies
- TypeScript is used throughout with strict mode enabled
- fast-check property tests use minimum 100 iterations per property

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "18.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "2.7", "3.1"] },
    { "id": 5, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.4", "6.1"] },
    { "id": 7, "tasks": ["5.3", "5.5", "5.6", "5.7", "5.8", "6.2"] },
    { "id": 8, "tasks": ["6.3", "6.4", "6.5", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3", "8.5"] },
    { "id": 10, "tasks": ["8.4", "8.6", "9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3", "9.4", "10.1", "10.2", "10.3"] },
    { "id": 12, "tasks": ["12.1", "12.2", "12.3", "17.1"] },
    { "id": 13, "tasks": ["12.4", "13.1", "13.2"] },
    { "id": 14, "tasks": ["13.3", "14.1"] },
    { "id": 15, "tasks": ["14.2", "15.1", "15.2", "15.3"] },
    { "id": 16, "tasks": ["16.1", "16.2"] },
    { "id": 17, "tasks": ["20.1"] },
    { "id": 18, "tasks": ["20.2"] }
  ]
}
```
