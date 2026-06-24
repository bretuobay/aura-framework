# Product Requirements Document (PRD)
## AURA Demo Application – E-Commerce Showcase

---

## 1. Executive Summary

### 1.1 Purpose
The AURA Demo App is a reference implementation of the AURA reference architecture, built as an e-commerce product discovery experience. Its purpose is to demonstrate, in a live and tangible setting, how the AURA middleware enables governed, adaptive user interfaces across web applications. The demo targets conferences, development teams, and startup audiences, showing the full lifecycle of adaptive behavior: event ingestion, user/context modeling, decision pipeline execution, prescription validation, UI adaptation, explanation delivery, and feedback collection.

### 1.2 Core Value Proposition
- **Tangible demonstration** of the reference architecture's concepts without requiring complex backend infrastructure
- **Show, don't tell** approach to explaining prescription-based adaptation, capability manifests, and risk governance
- **Simulated and real modes** allow presenters to demonstrate both the architecture's logic and its AI-powered capabilities with live LLM/SLM integration
- **Devtools integration** reveals the internal state of the system, making the architecture transparent to technical audiences

### 1.3 Target Audiences
- **Conference attendees**: Quick, visually compelling demonstrations of adaptive UI concepts
- **Development teams**: Hands-on exploration of SDK integration, manifest definition, and adaptation behavior
- **Startup founders and product teams**: Understanding the value proposition of governed personalization without full custom builds
- **Architects and technical leads**: Deep dives into the decision pipeline, capability registry, and governance model

---

## 2. Product Objectives

### 2.1 Primary Objectives
1. **Demonstrate prescription-based adaptation** – Show UI changes (ranking, component variants, layout, filters) as the result of governed prescriptions, not unrestricted generation
2. **Illustrate the tiered decision pipeline** – Show rules, SLM, and LLM contributions to adaptation decisions with clear visual indicators
3. **Showcase governance and explainability** – Display risk classes, explanations, consent controls, and profile correction
4. **Validate the developer experience** – Show the minimal code required to integrate AURA into a Next.js application
5. **Enable audience interactivity** – Allow presenters and attendees to trigger adaptations, override prescriptions, and explore the devtools

### 2.2 Secondary Objectives
- Provide a reusable template for teams adopting AURA
- Establish a baseline for performance and usability evaluation (Paper 4)
- Serve as a reference implementation for the @aura/* packages

---

## 3. User Personas

| Persona | Description | Demo Relevance |
|---|---|---|
| **The Bargain Hunter** | Price-sensitive, compares products, uses filters heavily | Triggers ranking adaptations, filter highlighting |
| **The Power User** | Tech-savvy, visits frequently, knows the catalog | Shows repeated behavior inference, progressive adaptation |
| **The First-Time Visitor** | New to the site, exploring categories | Triggers cold-start adaptations, LLM-assisted guidance |
| **The Accessibility User** | Uses assistive technology, needs high contrast/large fonts | Triggers accessibility adaptations from context |
| **The Conference Attendee** | Watches demo, asks questions | Benefits from devtools transparency, explanation visibility |
| **The Developer Evaluator** | Wants to understand integration | Explores SDK code, manifest definition, devtools |

---

## 4. Functional Requirements

### 4.1 Application Overview

A simple e-commerce product search and discovery page with:
- Search bar with autocomplete
- Product results grid
- Filter panel (categories, price range, ratings, brands)
- Product detail quick-view modal
- User profile/consent controls (simple toggle panel)
- AURA devtools overlay (toggleable)

### 4.2 User Experience Requirements

#### 4.2.1 Search Experience
- **Search input**: Text input with debounced search
- **Results display**: Grid of product cards with image, title, price, rating, badges
- **Filter panel**: Collapsible sidebar with multi-select filters
- **Sort options**: Relevance, price low-high, price high-low, rating
- **Pagination**: Load more or infinite scroll (load more is simpler for demo)

#### 4.2.2 Product Card Component
The product card is the primary adaptable component. It supports variants:
- **Standard**: Full information (title, price, rating, description snippet, add-to-cart button)
- **Compact**: Reduced information (title, price, rating, add-to-cart button)
- **Comparison**: Enlarged with comparison badge, spec highlights, price comparison indicators
- **Image-lead**: Larger image, smaller text, visual-first layout

#### 4.2.3 Adaptive Surface: Search Results
- **Risk class**: Low (auto-apply with explanation)
- **Adaptable aspects**:
  - Ranking order of products
  - Product card variant selection
  - Filter panel highlighting
  - Badge labels on cards
  - Layout density (compact/standard/expanded)

### 4.3 AURA Integration Requirements

#### 4.3.1 Manifest Definition
The demo must include a well-documented manifest that declares:
- **Surfaces**: `search.results` (risk: low), `filter.panel` (risk: medium)
- **Components**: `product-card` (variants: standard, compact, comparison, image-lead), `filter-panel` (highlightable filters, collapsible state)
- **Constraints**: Consent requirements (behavior, personalization), reversibility flags
- **Layout stability**: Reserve space for async adaptations

#### 4.3.2 Event Emission
The application must emit at least the following events:
- `surface.viewed`: When search results render
- `search.submitted`: When user searches
- `interaction.clicked`: Product clicks, filter clicks
- `interaction.dwelled`: Time spent on products
- `context.changed`: Device changes, viewport changes
- `feedback.submitted`: User accepts/dismisses/overrides prescriptions

#### 4.3.3 Prescription Application
- Map prescriptions to React component props
- Apply ranking prescriptions (reorder the product list)
- Apply component variant prescriptions (change card style)
- Apply filter highlighting prescriptions
- Apply layout density prescriptions
- Apply accessibility prescriptions (font scale, contrast)
- Apply explanation display (toggleable explanation panel)

### 4.4 Adaptation Scenarios for Demonstration

#### Scenario 1: Search Intent Detection
**Trigger**: User searches for "lightweight laptop for travel"
**Adaptation**:
- Ranking: Show ultraportable laptops first
- Filter highlighting: Highlight "Weight", "Battery Life" filters
- Product card variant: Use "comparison" variant for easy spec comparison
- Explanation: "We noticed you're looking for portable laptops. Here are some lightweight options."

#### Scenario 2: Price-Sensitive User
**Trigger**: User repeatedly sorts by price low-to-high, filters by discounts
**Adaptation**:
- Ranking: Show discounted items higher
- Badge: Add "Best Price" badge to value items
- Filter highlighting: Pre-expand "Price" filter with low-end pre-selected
- Explanation: "You seem to be looking for value. Here are some deals we found."

#### Scenario 3: Returning User with Brand Preference
**Trigger**: User has previously bought from Brand X
**Adaptation**:
- Ranking: Boost Brand X products
- Card variant: Use "standard" with brand prominence
- Badge: "Recommended for you" badge
- Explanation: "You've purchased from Brand X before. Here are similar items."

#### Scenario 4: Cold Start / First-Time Visitor
**Trigger**: First session, no history
**Adaptation (LLM-assisted)**:
- Content: "New to our catalog? Here are popular items in each category."
- Layout: Expanded category navigation, featured products
- Explanation: "Since you're new, we're showing you our most popular products."

#### Scenario 5: Mobile Context
**Trigger**: Device detected as mobile
**Adaptation**:
- Layout: Compact cards, simplified filters (collapsed by default)
- Accessibility: Larger touch targets
- Explanation: "We've made it easier to browse on your mobile."

#### Scenario 6: Accessibility Preference (User-Declared)
**Trigger**: User sets "High Contrast" or "Large Font" preference
**Adaptation**:
- Font scaling applied
- High contrast color scheme
- Reduced motion
- Explanation: "Adapting to your accessibility preferences."

### 4.5 Demo Modes

| Mode | Description | Use Case |
|---|---|---|
| **Rules Only** | No AI, only deterministic rules | Shows foundation, governance, manifest |
| **SLM Enabled** | Small language model for classification | Shows fast semantic reasoning |
| **LLM Enabled** | Full LLM for reasoning and explanation | Shows advanced adaptation, cold-start |
| **Demo Simulation** | Preset adaptations triggered by fake signals | Guarantees visible adaptations regardless of AI availability |
| **Developer Mode** | Shows manifest validation, event stream, prescription history | Deep technical exploration |

### 4.6 Simulation Flags

| Flag | Purpose |
|---|---|
| `USE_REAL_LLM` | Use live LLM API (requires key) |
| `USE_REAL_SLM` | Use live SLM (requires key) |
| `SIMULATE_ADAPTATIONS` | Trigger preset adaptation scenarios regardless of model output |
| `SHOW_DEVTOOLS` | Show the devtools overlay |
| `ENABLE_EXPLANATIONS` | Show/hide explanation panels |
| `ENABLE_CONSENT` | Show consent controls |

### 4.7 Devtools Requirements

The devtools overlay must display:
1. **Session info**: Session ID, user ID, consent state, manifest version
2. **Event log**: Chronological list of emitted events with timestamps
3. **Prescription stream**: Incoming prescriptions with validation status, context lock
4. **User model**: Current profile attributes with provenance, confidence, expiry
5. **Context model**: Current context values (device, viewport, etc.)
6. **Decision pipeline**: Which tier (rules/SLM/LLM) generated the adaptation
7. **Explanation**: Full explanation text for active prescriptions
8. **Feedback history**: User accept/dismiss/override actions
9. **Manifest viewer**: Rendered manifest with validation status

---

## 5. Technical Architecture

### 5.1 Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | Server components, React integration, deployable to Vercel |
| **UI Framework** | Tailwind CSS + Shadcn/ui | Rapid prototyping, accessible components |
| **SDK** | @aura/sdk, @aura/react | AURA frontend integration |
| **API Layer** | Next.js API Routes or Hono | Simple, self-contained, no extra server needed |
| **Server Logic** | @aura/server | AUIP route handlers |
| **Rules Engine** | @aura/rules | Deterministic adaptation policies |
| **Devtools** | @aura/devtools | Inspection and debugging |
| **State** | In-memory + Redis optional | Minimal for demo |
| **AI Integration** | OpenRouter API (for LLMs), Transformers.js or internal SLM | Single API for multiple models, supports many providers |

### 5.2 Deployment Options

| Option | Description | Best For |
|---|---|---|
| **Vercel** | Full Next.js deployment with serverless functions | Conference demos |
| **Local Docker** | Self-contained container with all services | Development teams |
| **Static Build + External API** | Frontend hosted on CDN, AURA backend separately | Enterprise evaluations |

### 5.3 Data Sources

| Data Type | Source | Notes |
|---|---|---|
| **Product catalog** | Static JSON file | ~100-200 products for demo |
| **User profiles** | In-memory | Session-based, no persistence required |
| **Product images** | Picsum.photos or placeholder | Simple, fast |
| **Search index** | In-memory Fuse.js or MiniSearch | Simple client-side search |
| **Events** | In-memory buffer | 24-hour retention for demo |

### 5.4 AI/LLM Integration

The AI layer should support:

| Service | Purpose | Fallback |
|---|---|---|
| **OpenRouter** | LLM access (GPT-4, Claude, etc.) | Simulated LLM responses |
| **OpenAI-compatible API** | Local LLMs (via Ollama, LM Studio) | Simulated LLM responses |
| **SLM** | ONNX runtime or Transformers.js for browser-based inference | Simulated SLM responses |

**Simulation behavior**:
- When AI is disabled: Use rule-based adaptations only
- When AI is enabled but no key: Use rule-based adaptations with simulated LLM-like metadata
- When AI is enabled with key: Use real LLM/SLM with fallback to rules on timeout

### 5.5 File Structure

```
aura-ecommerce/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── page.tsx                 # Main search page
│       │   ├── layout.tsx               # Root layout with AURA provider
│       │   ├── api/
│       │   │   └── aura/
│       │   │       ├── session/route.ts
│       │   │       ├── events/route.ts
│       │   │       ├── prescriptions/stream/route.ts
│       │   │       ├── feedback/route.ts
│       │   │       ├── explain/route.ts
│       │   │       ├── consent/route.ts
│       │   │       └── profile/route.ts
│       │   └── devtools/
│       │       └── page.tsx             # Devtools standalone view
│       ├── components/
│       │   ├── SearchBar.tsx
│       │   ├── ProductGrid.tsx
│       │   ├── ProductCard.tsx
│       │   ├── FilterPanel.tsx
│       │   ├── AuraProvider.tsx
│       │   ├── ExplanationPanel.tsx
│       │   ├── ConsentControls.tsx
│       │   └── DevtoolsOverlay.tsx
│       ├── manifest/
│       │   └── aura.manifest.ts         # AURA capability manifest
│       ├── data/
│       │   └── products.json            # Product catalog
│       ├── hooks/
│       │   ├── useAura.ts               # AURA hook wrapper
│       │   └── useProductSearch.ts      # Search logic
│       └── lib/
│           ├── aura-server.ts           # AURA server instance
│           └── simulation.ts            # Simulation helpers
├── packages/
│   ├── @aura/protocol/                  # Types and schemas
│   ├── @aura/sdk/                       # Framework-neutral SDK
│   ├── @aura/react/                     # React provider and hooks
│   ├── @aura/server/                    # Hono middleware
│   ├── @aura/rules/                     # Rules engine
│   └── @aura/devtools/                  # Devtools inspector
├── docker-compose.yml                   # Local deployment
└── README.md                            # Getting started guide
```

---

## 6. User Interface Requirements

### 6.1 Layout

```
+----------------------------------------------------------+
|  [LOGO]  Search: [___________________] [🔍]  [User Menu]  |
|  [Consent Toggle] [Devtools Toggle] [Demo Mode Selector]  |
+----------------------------------------------------------+
| Filters  |  Results Area                                   |
| [X] Cat1 |  +--[Card]---+ +--[Card]---+ +--[Card]---+    |
| [X] Cat2 |  | Product 1 | | Product 2 | | Product 3 |    |
| Price    |  | $99.99    | | $149.99   | | $79.99    |    |
| [===]    |  | ⭐⭐⭐⭐   | | ⭐⭐⭐⭐⭐  | | ⭐⭐⭐    |    |
| Rating   |  +-----------+ +-----------+ +-----------+    |
| [===]    |  +--[Card]---+ +--[Card]---+ +--[Card]---+    |
| Brand    |  | Product 4 | | Product 5 | | Product 6 |    |
| [X] BrA  |  | $199.99   | | $89.99    | | $129.99   |    |
| [X] BrB  |  +-----------+ +-----------+ +-----------+    |
+----------+------------------------------------------------+
|  [Explanation Panel]  [Devtools Overlay]                   |
+----------------------------------------------------------+
```

### 6.2 Visual Design Requirements

- Clean, modern e-commerce design (similar to Amazon, Best Buy, or a DTC brand)
- Dark and light mode support (demonstrates accessibility adaptation)
- Responsive design (mobile, tablet, desktop)
- Subtle animation on adaptations (smooth transitions, not jarring)
- Visual indicators for adaptations (colored border, animation, badge)
- Explanation panel: Slide-in or overlay with plain-language reason and undo button

### 6.3 Demo Controls

A floating toolbar with:
- **Demo Mode selector**: Rules Only / SLM / LLM / Simulation
- **Adaptation trigger**: "Simulate Search" button with predefined scenarios
- **Reset Profile**: Clear session data
- **Consent toggles**: Quick consent switches
- **Devtools toggle**: Show/hide devtools overlay
- **Context switcher**: Simulate device, viewport, accessibility needs

---

## 7. Use Case Walkthroughs (Demo Script)

### 7.1 The "Look What Happens When You Search" Demo

**Setup**: No AI, using simulation mode, devtools visible.

**Steps**:
1. Open the demo app
2. Search for "laptop"
3. See default results (no adaptation yet)
4. Presenter clicks "Simulate Search Intent" → "Travel Laptop"
5. Observe: Ranking changes, card variant changes to "comparison", filter highlighting appears
6. Open explanation panel: See why changes were made
7. Click "Undo" → Reverts to default
8. Open devtools → Show the prescription that was applied
9. Show manifest → Point out the components that were declared adaptable

**Key messages**:
- The app declared what can change (manifest)
- AURA decided what to change (prescription)
- The app rendered the change (host authority)
- You can undo it (user control)
- You can see why (explainability)

### 7.2 The "AI-Powered Cold Start" Demo

**Setup**: LLM enabled, no search history.

**Steps**:
1. Clear session / start incognito
2. Show default homepage (generic)
3. Search for "headphones for running"
4. Show LLM-generated reasoning (devtools or explanation panel)
5. Observe: Product ranking, badge labels, card variant adaptation
6. Compare to rules-only mode: Switch to rules only, repeat same search
7. Show difference: LLM mode has better explanations, more relevant adaptations
8. Show the prompt that was sent to the LLM (devtools)
9. Show the response parsed into prescriptions

**Key messages**:
- AI helps in cold-start scenarios
- The LLM doesn't control rendering, it advises the middleware
- All LLM output is validated against the manifest
- You can see exactly what the LLM was asked and what it returned

### 7.3 The "Risk Governance" Demo

**Setup**: Simulation mode.

**Steps**:
1. Search for "laptop"
2. Show a low-risk adaptation: Product card variant change
   - Auto-applies, passive explanation, undo available
3. Switch context to "Healthcare Professional" (via context switcher)
4. Show a high-risk adaptation attempt: Filter panel collapse
   - Requires confirmation, active explanation, audit log entry
5. Show audit log in devtools: Risk class, policy version, data classes used
6. Revoke consent → Show adaptations disappear

**Key messages**:
- Different risk classes have different behaviors
- High-risk changes require user confirmation
- Everything is logged for audit
- Users control consent

### 7.4 The "Developer Experience" Demo

**Setup**: Developer mode on, code displayed alongside.

**Steps**:
1. Show the manifest file → "This is all you need to declare what AURA can change"
2. Show the component → ProductCard.tsx with the `useAdaptation` hook
3. Show initialization → AuraProvider wrapping the app
4. Show event emission → `aura.emit({ type: "search.submitted", ... })`
5. Show the devtools → Event stream, prescription stream, profile state
6. Show the rules → `aura.rules` policy file

**Key messages**:
- It's just React, Next.js, and TypeScript
- The SDK is type-safe
- You can see what's happening
- You already have most of the code written; you just need to add AURA

---

## 8. Non-Functional Requirements

### 8.1 Performance
- **Search response**: < 300ms (simulated search)
- **Prescription application**: < 100ms from event to UI update for immediate class
- **First render**: < 1.5s on decent network
- **Devtools latency**: < 500ms for updates
- **Memory usage**: < 100MB for demo session

### 8.2 Stability
- No crashes on invalid prescriptions
- Graceful fallback when AI is unavailable
- Session recovery on refresh
- Devtools must not break app functionality

### 8.3 Usability
- Controls must be self-documenting with tooltips
- Adaptation changes must be visually clear and smooth
- Explanation panel must use plain language
- Demo controls must have clear labels and statuses

### 8.4 Deployability
- Must work as a single Next.js app
- Must work with `npm run dev` for local development
- Must have `npm run build` for production builds
- Must support Vercel deployment with zero configuration

---

## 9. Deliverables

### 9.1 Application
- Fully functional Next.js application
- Product catalog with 100+ products
- AURA manifest file
- All AURA packages integrated

### 9.2 Documentation
- README with setup instructions
- Architecture diagram (Mermaid)
- Demo script with talking points for each scenario
- API reference for manifest definition
- "How to add AURA to your app" guide

### 9.3 Conference Materials
- 5-minute demo video
- Presentation slides with key architectural concepts
- QR code to live demo URL
- Handout with architecture overview and GitHub link

### 9.4 Development
- All source code in a public GitHub repository
- Open source license (Apache 2.0 or MIT)
- CI/CD pipeline for automated builds
- Example environment variables for AI integration

---

## 10. Development Phases

| Phase | Tasks | Duration |
|---|---|---|
| **Phase 1: Foundation** | Product catalog, basic search, UI layout, manifest | 2 weeks |
| **Phase 2: AURA Integration** | SDK integration, event emission, prescription application | 2 weeks |
| **Phase 3: Adaptation Scenarios** | Rules development, simulation mode, 5+ scenarios | 2 weeks |
| **Phase 4: AI Integration** | SLM/LLM integration, fallback, simulation flags | 1 week |
| **Phase 5: Devtools** | Full devtools overlay, event log, prescription inspection | 1 week |
| **Phase 6: Polish** | Responsive design, dark mode, documentation, demo script | 1 week |
| **Total** | | **9 weeks** |

---

## 11. Success Criteria

| Criteria | Target |
|---|---|
| All adaptation scenarios demonstrateable in < 2 minutes | ✓ |
| Devtools shows live event stream and prescriptions | ✓ |
| Application runs locally with `npm run dev` | ✓ |
| Application deploys to Vercel in one click | ✓ |
| User can override any adaptation with undo | ✓ |
| Explanations are visible and understandable | ✓ |
| All manifest components can be adapted | ✓ |
| Rules, SLM, and LLM modes work and are toggleable | ✓ |

---

## 12. Appendix: Example Product Catalog

```
100 products across categories:
- Laptops (20)
- Headphones (15)
- Smartphones (15)
- Accessories (20)
- Wearables (10)
- Tablets (10)
- Monitors (10)

Each product: id, name, description, price, category, brand, rating, reviews, imageUrl, specs, tags, discount
```

---

## 13. Appendix: Example Manifest (Simplified)

```typescript
export const manifest = defineManifest({
  surfaces: {
    "search.results": {
      riskClass: "low",
      slots: ["results", "filters", "explanation"],
      layoutStability: {
        strategy: "reserve-space",
        maxDecisionWaitMs: 150
      }
    }
  },
  components: {
    "product-card": {
      variants: ["standard", "compact", "comparison", "image-lead"],
      riskClass: "low",
      adaptableProps: {
        variant: z.enum(["standard", "compact", "comparison", "image-lead"]),
        showPrice: z.boolean(),
        showRating: z.boolean(),
        badgeLabel: z.string().max(24).optional()
      },
      constraints: {
        requiresConsent: ["personalization"]
      }
    },
    "filter-panel": {
      riskClass: "medium",
      adaptableProps: {
        highlightedFilterIds: z.array(z.string()).max(3),
        collapsed: z.boolean()
      },
      constraints: {
        reversible: true
      }
    }
  }
});
```

---

## 14. Appendix: Example Prescription

```json
{
  "id": "pres_abc123",
  "surfaceId": "search.results",
  "manifestVersion": "1.0.0",
  "contextLock": {
    "sequenceId": 42,
    "capturedAt": "2026-06-23T10:30:00Z"
  },
  "latencyClass": "fast",
  "mode": "autoApply",
  "adaptations": [
    {
      "type": "rank",
      "target": "products",
      "orderedIds": ["prod_101", "prod_203", "prod_305"],
      "reasonCode": "travel_intent_detected"
    },
    {
      "type": "componentVariant",
      "slotId": "results",
      "componentId": "product-card",
      "variant": "comparison",
      "reasonCode": "comparison_intent"
    }
  ],
  "constraints": {
    "expiresAt": "2026-06-23T11:00:00Z",
    "reversible": true,
    "requiresUserConfirmation": false
  },
  "explanation": {
    "id": "expl_abc123",
    "summary": "We detected you're comparing laptops for travel. We've reordered results and switched to comparison view.",
    "userVisible": true,
    "factors": ["query: lightweight laptop", "travel context", "comparison behavior"],
    "confidence": 0.87
  }
}
```

---

**END OF PRD**