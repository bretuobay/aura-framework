# Neocom Platform Architecture — Technical Notes

> **Source:** Product demo (YouTube). These are architecture notes derived from observing the live product, not from official technical documentation. Use as a working model, not a definitive spec.
>
> **Purpose:** Pre-interview technical grounding on how the product actually works under the hood, with implications for interview questions and AURA comparison.

---

## Architecture Overview

Neocom's platform is built around one reusable **conversation engine** that is embedded at different shop entry points and narrowed by **scopes**. The same backend logic serves many product categories and landing pages without rebuilding the advisor each time. That is the central engineering bet: generalize the engine, parameterize the experience.

```
┌─────────────────────────────────────────────────────┐
│                  Shop Entry Points                   │
│   Banner   │   Popup / Prompt   │   Inline Block     │
└──────────────────────┬──────────────────────────────┘
                       │
             ┌─────────▼──────────┐
             │  Conversation Engine│
             │  Quiz mode          │
             │  Chat / Gen AI mode │
             └─────────┬──────────┘
                       │
             ┌─────────▼──────────┐
             │    Scope Layer      │
             │  Question set       │
             │  Product group      │
             │  Segment rules      │
             └─────────┬──────────┘
                       │
             ┌─────────▼──────────┐
             │  Product Filter     │
             │  Answer pruning     │
             │  Candidate reduction│
             └─────────┬──────────┘
                       │
             ┌─────────▼──────────┐
             │  Ranking Engine     │
             │  Price impact       │
             │  Bestsellers        │
             │  Margin / Stock     │
             │  Merchandising rules│
             └─────────┬──────────┘
                       │
             ┌─────────▼──────────┐
             │  Knowledge Layer    │
             │  FAQs               │
             │  Product rules      │
             │  Custom inputs      │
             └─────────────────────┘
```

---

## 1. Integration Layer — Three Modes

The same backend advisor can be surfaced in three distinct UX patterns. This is a product architecture decision: the integration mode is a configuration option, not a separate build.

### Banner
- Passive, persistent. Lives at the top or bottom of a page.
- Low intrusiveness — the user initiates if they want.
- Best for: homepage, category pages where the user's intent is still broad.
- Technical note: renders as a fixed-position UI element; must not reflow page content.

### Popup / Prompt (delayed trigger)
- Active interruption triggered by a rule: time elapsed, scroll depth reached, exit intent, or a combination.
- Highest advisor start rate; highest dismissal rate if poorly timed.
- Technical note: trigger logic is configurable per brand and per page type. The trigger fires client-side; the advisor session opens server-side on first interaction.
- **Intrusiveness risk**: a time-only trigger (e.g. "show after 3 seconds") fires regardless of whether the user is stuck. A scroll-depth trigger (e.g. "show after 80% scroll on PLP") fires when the user has demonstrably browsed without finding what they want — much higher signal.

### Inline Integration
- The advisor becomes part of the page layout — embedded in a PLP or landing page as a block element.
- Lowest intrusiveness; feels native to the page rather than an overlay.
- Technical note: requires layout reservation at page render time to avoid cumulative layout shift (CLS) when the advisor initializes. The block must have a fixed height or a skeleton placeholder before the advisor loads.
- Best for: dedicated landing pages, category pages with strong guided selling intent.

**Architectural implication:** three modes, one engine. The shop configures mode and trigger rules; the conversation engine and scope logic are shared. This is a clean separation of concerns — integration presentation is orthogonal to recommendation logic.

---

## 2. Conversation Engine — Dual Mode

The conversation engine has two interaction modes that share the same underlying product-finding logic.

### Quiz Mode
- Structured question sequence, presented as multiple-choice cards.
- Each answer is a discrete, typed attribute selection.
- Branching is pre-defined (the scope determines which questions appear and in what order).
- Deterministic, auditable, fast. The engine knows exactly which products are compatible with every answer at every step.

### Chat / Gen AI Mode
- User types free text instead of selecting a card option.
- A generative AI layer interprets the free text and maps it to the same structured attribute selections the quiz mode uses.
- The product-finding logic underneath is identical — chat mode is a natural language front-end over the same structured engine.
- **This is the key architectural insight**: they did not build a chatbot. They built a structured decision engine and added an NLP front-end as an optional layer. The engine is always in control; the LLM is a translation layer.

**Technical implication for LLM usage:** The LLM in chat mode is doing *intent extraction* (free text → structured attribute), not *ranking* or *filtering*. This keeps the LLM off the hot path for recommendation logic and keeps the recommendation engine deterministic and auditable.

**Interview angle:** When asked about their LLM architecture, this distinction is worth raising — "I noticed from the demo that chat mode maps to the same structured engine as quiz mode. Is the LLM doing attribute extraction and then handing off to your constraint solver, or is it more integrated into the ranking step?"

---

## 3. Scopes — The Core Flexibility Mechanism

Scopes are the architectural primitive that allows one advisor to serve many product lines, segments, and landing pages.

### What a scope is
A scope is a **subset of the full advisor** defined by:
- **Selected questions**: which questions from the global question bank appear in this scope.
- **Selected products**: which product group (or subset of the catalog) this scope operates over.
- **Segment rules**: a scope can target beginners vs. experts, or couch tables vs. premium sofas, or entry-level e-bikes vs. performance e-bikes.

### What scopes enable
- A single appliance advisor can have a scope for washing machines, a scope for dishwashers, and a scope for refrigerators — each with different questions and product groups, but the same underlying engine.
- A landing page for a "summer bikes" campaign uses a scope that narrows to that product subset, with tailored questions.
- Scopes can control which product groups are **included or excluded**, and which questions **appear or are suppressed** for a given path.

### What scopes are not
- Scopes are not user segments in the CRM sense. They are editorial configurations of the advisor, not behavioral targets.
- Scopes do not replace personalization. Two users entering the same scope get the same question sequence but potentially different recommendations depending on their answers. Scopes define the *experience shape*; answers define the *individual result*.

### Technical architecture of scopes

```
Full Advisor Config
├── Global question bank (all possible questions across all categories)
├── Global product catalog (all SKUs)
└── Scopes
    ├── scope:washing-machines
    │   ├── questions: [q-capacity, q-energy-class, q-budget, q-features]
    │   └── products: product_group == "washing-machines"
    ├── scope:dishwashers
    │   ├── questions: [q-place-settings, q-noise-level, q-budget]
    │   └── products: product_group == "dishwashers"
    └── scope:summer-campaign
        ├── questions: [q-terrain, q-range, q-budget]
        └── products: tag == "summer-2026" AND category == "e-bikes"
```

**Implication for multi-tenant scale:** Scopes are the mechanism by which the platform scales to many brands and categories without exponential configuration complexity. Each brand configures their question bank once; scopes are lightweight slices of that configuration. Adding a new product line means adding a scope, not building a new advisor.

---

## 4. Product Filtering Logic — Dynamic Answer Pruning

This is the main technical mechanism behind "shorter conversations."

### The problem it solves
In a naive quiz, a question with five answer options always shows five options, even if two of those options have no matching products in the current candidate set. The user selects an option, gets zero results, and the advisor has wasted a step.

### How answer pruning works

At each step, the engine:
1. Takes the current candidate product set (all products matching answers so far).
2. Evaluates each remaining answer option in the next question against that candidate set.
3. **Removes answer options that would result in zero products**.
4. If only one answer option remains (and it's not meaningful to show a single choice), it can skip that question entirely.

This makes the flow *adaptive to the available catalog* — not just to the user's answers.

```
Step 1: candidate set = 180 products
  Question: "What's your budget?"
  Options evaluated:
    "Under €500"     → 45 products  ✓ show
    "€500–€800"      → 67 products  ✓ show
    "€800–€1200"     → 38 products  ✓ show
    "Over €1200"     → 0 products   ✗ prune (no stock in this range)
  Result: 3 options shown (not 4)

Step 2: user selects "€500–€800", candidate set = 67 products
  Question: "What energy class?"
  Options evaluated:
    "A+++"           → 67 products  ✓ show
    "A++ or better"  → 67 products  ✓ show
    "Any"            → 67 products  ✓ show
  (All match — no pruning, full question shown)

Step 3: question "Which brand?" evaluated
  Options:
    "Miele"          → 0 products in €500–€800 range  ✗ prune
    "Bosch"          → 34 products  ✓ show
    "Samsung"        → 21 products  ✓ show
    "No preference"  → 55 products  ✓ show
  Result: Miele option removed (out of budget range)
```

**Technical requirement:** This needs the full candidate set to be queryable in real time at each step, not just at the end. The filtering logic must be fast enough (< 50ms) that it doesn't introduce latency between steps. This pushes toward in-memory indexes or pre-computed compatibility matrices, not live database queries per step.

**Interview angle:** "The dynamic answer pruning in your demo is elegant — how do you keep that fast at scale? Are you running live catalog queries at each step, or do you pre-compute compatibility matrices per scope?"

---

## 5. Data & Control — Merchandising Layer

The advisor is not a pure user-need matcher. The shop owner can influence what surfaces first.

### Ranking signals the shop controls
- **Price impact**: can weight lower or higher price products up or down in rank.
- **Bestsellers**: products with high sales velocity can be promoted.
- **Margin**: high-margin products can be given a ranking boost.
- **Stock availability**: out-of-stock products are filtered; low-stock can be flagged or promoted.

### Governance implication
This is where the line between `assistive` and `manipulative` becomes concrete. A ranking boost for bestsellers (products many users found satisfactory) is `informative`. A ranking boost for high-margin products regardless of user need is `persuasive` at best, `manipulative` at worst — the advisor is presenting itself as a neutral product-finding tool while secretly prioritizing shop revenue.

This is a legitimate product design tension that neocom will have thought about. Good interview question: "How do you prevent merchandising rules from undermining user trust in the advisor as a neutral guide? Is there a cap on how much a margin or price boost can shift a recommendation?"

### Knowledge layer
Beyond rules, the platform supports extra knowledge inputs:
- **FAQs**: common questions about product categories, injected as context for the chat mode's LLM.
- **Product rules**: editorial constraints (e.g. "always recommend a cable when recommending this charger", "never recommend product X with product Y").
- **Custom inputs**: brand-specific knowledge that the generic LLM wouldn't have.

**Architectural significance:** This is how they avoid the "generic LLM knows nothing about our catalog" problem. They're not just prompting a foundation model with product names; they have a structured knowledge injection layer that gives the model brand-specific context. This is RAG at the domain-knowledge level, not just catalog retrieval.

---

## 6. Practical Architecture — End-to-End Flow

```
User lands on page
       │
       ▼
Integration mode fires (banner / popup trigger / inline render)
       │
       ▼
Session initialized (sessionId, scope selected, catalog subset loaded)
       │
       ▼
Question 1 shown
  → Candidate set evaluated
  → Answer options pruned to valid-only
       │
       ▼
User answers (quiz card click OR free text → LLM attribute extraction)
  → Candidate set filtered by answer
  → Next question selected (next in scope sequence OR skip if redundant)
       │
       ▼
    [repeat per question]
       │
       ▼
Ranking applied to final candidate set
  → User-need match score (attribute coverage)
  → Merchandising signals (bestseller, margin, stock)
  → Explanation generated per top result
       │
       ▼
Results returned to UI
  → User accepts recommendation → product.detail or add-to-cart
  → User rejects → back-navigation or session end
       │
       ▼
Feedback captured (accepted product ID, rejected options, session duration)
```

---

## 7. Comparison to AURA Concepts

| Neocom concept | AURA equivalent | Key difference |
|---|---|---|
| Scope | CapabilityManifest (surface + component declarations) | Scope is editorial configuration of questions+products; manifest is a typed contract of what AURA can change in the host UI |
| Advisor session | AUIP session + UserModel bootstrap | Neocom's session ends when recommendations are shown; AURA's session persists and extends into PLP/PDP/search |
| Answer → candidate filter | Rules Engine + hard constraint evaluation | Same logic; AURA's rules engine is a general tier, not quiz-specific |
| Answer pruning | No direct equivalent | AURA doesn't have a "prune prescription options based on context" concept — this is neocom-specific and interesting |
| Merchandising ranking signals | Recommender tier (ranking by domain signals) | Equivalent function, different framing |
| Chat mode LLM | SLM/LLM classification tier | Both use NL→structured attribute extraction; AURA makes this a named tier in the pipeline |
| Knowledge layer (FAQs, rules) | Retrieval / Vector Store (RET in AURA diagram) | Both are grounding mechanisms to prevent generic LLM responses |
| Integration mode (banner/popup/inline) | layoutStability config in surface manifest | AURA's manifest has `strategy: "reserve-space"` / `"modal"` / `"async-update"` — comparable concept |
| Scope question sequence | No direct equivalent | AURA doesn't specify question sequencing; it's a conversation-layer concern above AURA's abstraction level |

**The fundamental difference:** Neocom is a **conversation-first product engine** — the advisor *is* the product. AURA is **prescription middleware** — the adaptive behavior *augments* an existing product without replacing its UI. They are complementary, not competing: neocom generates the high-quality explicit user profile; AURA extends that profile across surfaces the advisor never touches.

---

## 8. Open Technical Questions (Things Not Shown in the Demo)

These are the gaps between what the demo reveals and what a production system would need. Good to have mental models for these before the interview.

**Q: How is the question bank authored and maintained?**
Presumably a visual editor in their admin UI. The interesting question is whether questions are authored entirely by humans or whether LLMs propose question candidates from a catalog attribute schema (and humans approve). The latter would make onboarding new brands much faster.

**Q: How does the scoping system handle overlapping product groups?**
If a product belongs to two scopes (e.g. a "versatile" washing machine that fits both the standard and premium scope), does it appear in both? Who resolves ranking conflicts across scopes?

**Q: How are merchandising weight limits governed?**
If a brand can set margin boost to an arbitrary value, they can effectively override the user-need matching entirely. Is there a cap? Is it logged? Is it auditable?

**Q: What happens when answer pruning leaves zero valid options on a required question?**
The flow must handle this gracefully — either skip the question, broaden the candidate set, or tell the user "we don't have products matching all your criteria" rather than silently showing wrong results.

**Q: How does chat mode handle ambiguous or contradictory free text?**
"I want something cheap but also high quality" is contradictory. Does the LLM pick one, ask a clarifying question, or map both attributes at reduced confidence?

**Q: How is the feedback loop closed?**
The demo shows recommendations being shown. What happens after? Does the platform track which recommended product was purchased, and does that signal flow back into the ranking model? The Rebike CMO quote ("advisor became customer-insight hub") implies they track this strategically, but the demo doesn't show the data pipeline.
