# Neocom.ai Interview Prep — Technical Questions

> **Context:** Neocom is an AI-native commerce experience platform whose core product is a guided selling advisor ("Shop Agent", product finder, quiz, configurator/bundler). Their published case studies span baby products (Emma & Noah), lighting (Paulmann Licht), premium appliances (Miele), and e-bikes (Rebike), with consistent results: 2–2.5× conversion lift and 19–26.5% AOV improvement. Their positioning is a bounded advisor widget — they turn "20 filters → 8 questions" — not full-store personalization middleware.
>
> Your angle: you have studied their product pattern deeply and have a concrete architectural proposal (AURA) for the gap their widget leaves open — extending advisor-derived signals into PLP, PDP, search, and cart.

---

## Part 1 — Questions to Expect From Them

These are grouped by depth. Expect the interview to start in Section A and go as deep as your answers allow.

---

### A. Core Product & System Design

**1. Walk me through how you would design the question → recommendation pipeline.**

*What they want:* A clear mental model of the full data flow from user answer to ranked product list. Strong answer covers: structured answer schema → attribute matching/filtering → ranking layer → result rendering.

Concrete answer:
- Each question answer maps to one or more **product attribute constraints** (e.g. "budget under €800" → `price_eur: { max: 800 }`).
- Answers accumulate into a **session profile** (structured key-value, not free text).
- A **rules pass** first eliminates hard violations (out-of-stock, outside budget, missing required feature).
- A **ranking pass** then scores remaining products by weighted attribute match + collaborative signal (users with similar profiles who purchased what).
- Result is a ranked product list with attribute-match **explanations** per product ("matches your budget, energy class A+++, large drum capacity").

Follow-up they'll ask: *What if two answers conflict?* → explicit answer overrides inferred; latest explicit wins; surface a clarifying question rather than silently dropping a constraint.

---

**2. How do you decide which question to ask next?**

*What they want:* Evidence you understand that a static question tree is a product liability, and some ML intuition about adaptive branching.

Options to discuss:
- **Static decision tree**: simple, auditable, easy to author, but brittle for large catalogs or novel user paths.
- **Decision tree with attribute-information-gain branching**: next question is the one whose answer would most reduce product-space uncertainty (entropy reduction over remaining candidate set).
- **ML-driven branching (transformer/small model)**: learns from historical sessions which question sequences led to accepted recommendations. Higher lift, harder to debug.
- **Hybrid**: rules encode hard exclusions and ordering constraints (always ask budget before brand); ML selects within those bounds.

Strong position: start with rule-based + information-gain; move to ML-driven once you have enough sessions per brand to train. Never remove human editorial control over question ordering for regulated or sensitive categories (baby products, medical devices).

---

**3. How do you handle a product catalog with 10,000 SKUs across 50 brands on your platform?**

*What they want:* Multi-tenancy, catalog representation, and scale thinking.

Cover:
- **Catalog ingestion**: brand onboards via API or feed (CSV → structured ingestion pipeline → validated attribute schema per category). Schema normalization is the hard part — "spin speed" means different things in different catalog systems.
- **Tenant isolation**: each brand's catalog is scoped; questions can be global templates or brand-specific overrides.
- **Embedding index**: product attributes + descriptions embedded (e.g. `text-embedding-3-small`) into a vector store, used for semantic matching when rule-based attribute matching has low coverage.
- **Catalog change propagation**: price/stock changes must invalidate or re-rank active recommendations in real time. A change subscription pattern (webhook from the platform → invalidate affected recommendation caches) is standard.

---

**4. How do you handle cold start — a brand new to your platform with no session history?**

*What they want:* Practical ML intuition, not just "more data."

Approaches:
- **Content-based only**: rank products purely on attribute match to session answers. No collaborative signal needed. Works day 1.
- **Cross-brand transfer**: if the new brand is in a category you already have (e.g. another appliance brand), a lightweight transfer model can bootstrap collaborative signal from similar-category sessions with appropriate decay.
- **LLM-assisted question generation**: for a brand with a structured catalog but no question template, a one-time LLM pass over catalog attributes can propose question candidates ranked by discriminative power. Human editorial review before deployment.
- **Synthetic sessions**: generate synthetic advisor sessions from catalog attribute distributions as a warm-start signal for the ranking model. Label these with lower confidence.

The honest answer: cold start is a product problem as much as an ML problem. A well-authored question template + content-based ranking gets you 80% of the lift. The collaborative signal is the incremental 20%.

---

**5. How do you measure recommendation quality?**

*What they want:* You know the gap between offline metrics and business outcomes.

Offline metrics (fast, no user needed):
- **Catalog coverage**: what % of the catalog can the advisor recommend? Low coverage = overly restrictive attribute matching.
- **Answer-to-candidate set size**: does each answer sequence lead to a tractable result set (3–10 products) or an empty set? Empty set is a failure mode.
- **Attribute recall**: does the top recommendation match all stated constraints?

Online metrics (requires users):
- **Acceptance rate**: user clicks the recommended product (weak signal).
- **Add-to-cart rate** after advisor (stronger).
- **Purchase rate** (strongest — but delayed, requires OMS integration).
- **Undo/back rate** within the advisor: how often does the user change a previous answer? High rate = question ordering is confusing.
- **Session completion rate**: how often does the user finish the advisor vs. abandoning mid-flow?

Anti-metrics (things that look good but aren't):
- High acceptance rate + low conversion = the advisor is confidently wrong. Users click but don't buy.
- Low recommendation set size + high acceptance = the advisor is over-constraining (only one option, user has no real choice).

---

### B. Architecture & Integration

**6. How would you design the SDK that drops into any ecommerce platform (Shopify, Magento, WooCommerce, custom)?**

*What they want:* You can reason about SDK design constraints and platform heterogeneity.

Key design principles:
- **Core SDK is framework-agnostic** (vanilla TypeScript, no React/Vue dependency). Framework adapters wrap it (`@neocom/react`, `@neocom/vue`).
- **Initialization** takes a catalog identifier, a session token, and a consent profile. Nothing platform-specific in the core.
- **Events are typed**: `advisor.question_answered`, `advisor.recommendation_shown`, `advisor.recommendation_accepted`. Platforms emit these via the SDK; the SDK handles batching and retry.
- **Prescription delivery**: SSE or polling. SSE preferred for real-time re-ranking; polling fallback for environments that don't support persistent connections.
- **Platform adapters** (`@neocom/shopify-adapter`, `@neocom/magento-adapter`) handle:
  - Catalog API translation → normalized product schema
  - Customer identity mapping → session user ID
  - Cart events → `product.added_to_cart`
  - Webhook registration → `purchase.completed` callback

Risk to surface: **the hardest part is catalog schema normalization**, not the SDK itself. Every platform has a different product attribute model. A robust ingestion layer with category-specific attribute schemas is what makes multi-platform work at scale.

---

**7. How do you handle the session state in a multi-step advisor flow?**

*What they want:* State management, concurrency, and resilience thinking.

- **Session state lives server-side**, keyed by `sessionId`. Client sends answers; server accumulates the profile. Stateless client = easier recovery from tab refresh.
- **State is append-only**: each answer is an event with a timestamp. You can replay the event log to reconstruct any session state. This is also your audit trail.
- **Mid-session catalog changes**: if a product goes out of stock between question 3 and question 6, the final recommendation set recalculates on delivery, not at answer time. Never cache the final set during the question flow.
- **Back navigation**: user changes a previous answer → rewind the event log to that point, recompute candidate set, continue. Don't re-run the full flow from scratch.

---

**8. What does your LLM usage pattern look like — generation, RAG, or classification?**

*What they want:* You're not just "using LLMs everywhere." You have a cost/latency/accuracy model.

The right tiered answer:
- **Classification / intent extraction** (SLM or fine-tuned small model, < 100ms): take a free-text user input ("I need something for my open-plan kitchen, not too modern") → extract structured attributes (room type: kitchen, style preference: not contemporary). This is the main LLM use case in the question flow.
- **RAG for question generation** (LLM, one-time per catalog): given catalog attribute schema → generate candidate questions. Run offline, human-reviewed. Not in the user-facing hot path.
- **RAG for explanation generation** (LLM, on-demand, async): generate a plain-language explanation of why a product was recommended ("matches your energy budget and family-size capacity needs"). Can be cached per recommendation cluster.
- **NOT**: LLM directly ranking products in real time. Too slow, too expensive, too hard to audit.

Position clearly: LLMs are cost-justified for semantic bridging (natural language → structured attributes) and explanation quality. They are not appropriate for the ranking or filtering hot path.

---

**9. How do you prevent dark patterns in an adaptive advisor — artificial urgency, manipulative narrowing, filter suppression?**

*What they want:* Product ethics and governance thinking, especially relevant for baby/health categories.

Key rules to articulate:
- **Urgency signals must be factual**: "3 left in stock" must reflect actual inventory. If you manufacture urgency, you're lying to users.
- **No suppression**: the advisor can *promote* certain categories or products to prominence; it must not *hide* available options. Users must always be able to access the full catalog.
- **Reversibility**: every adaptive change in the surrounding UI must have an undo. Users can always reset to the default experience.
- **Sensitive categories require stricter rules**: baby product recommendations that affect infant safety, medical device recommendations — these need human editorial sign-off on recommendation logic, not just ML output. The Emma & Noah case is the canonical example.
- **Anti-manipulation policy**: distinguish `assistive` (helps rational decision-making), `informative` (presents accurate facts), `persuasive` (emphasizes genuine differentiators), and `manipulative` (exploits cognitive bias). The first three are acceptable; the last is not.

---

### C. Data, Privacy & Personalization

**10. How do you handle cross-session persistence — a user who takes 3 weeks to decide on a Miele washing machine?**

*What they want:* You understand that the purchase cycle for high-consideration products is long, and session-scoped profiles are insufficient.

Cover:
- **Anonymous session → authenticated identity merge**: when the user logs in, merge the anonymous profile into their authenticated profile. Explicit attributes transfer at full confidence; inferred behavioral attributes transfer with a confidence decay.
- **Attribute expiry calibrated to purchase cycle**: washing machine research → 90-day expiry. Session-level browsing behavior → 7-day expiry. Don't use the same TTL for everything.
- **Cross-device continuity**: authenticated users should get the same profile on mobile and desktop. Requires a shared server-side profile store, not localStorage.
- **Profile correction**: users must be able to see what you've inferred about them and correct or delete it. This is a UX requirement and a GDPR requirement.

---

**11. What's your GDPR and consent strategy?**

*What they want:* You have concrete answers, not "we comply with GDPR."

- **Consent is scoped by data class**, not a single boolean. A user can consent to behavioral analytics but not to personalized recommendations. The system must respect these independently.
- **Explicit advisor answers** (budget, use case) are the most valuable and the most sensitive. They should be stored with `source: "explicit"` provenance, shown to the user in their profile, and deletable on request.
- **No PII to cloud LLMs by default**. Structured summaries (attribute vectors) are sent for reasoning, not raw session transcripts. On-device or private-hosted SLM is preferred for any sensitive inference.
- **Right to erasure**: deleting a profile removes behavioral attributes. Audit metadata (anonymized: "advisor session occurred, resulted in purchase") is retained for compliance but de-linked from the user.
- **Data portability**: users can export their profile. GDPR Article 20 requires machine-readable export.

---

**12. How do you attribute a conversion to the advisor when the purchase happens days later?**

*What they want:* Attribution modeling, which is a genuinely hard problem.

Approaches:
- **Last-touch**: credit the advisor if it was the last major touchpoint before purchase. Simple, often wrong.
- **Data-driven attribution**: model the contribution of each touchpoint (advisor session, PDP view, email, retargeting ad) to purchase probability using a causal model or Shapley values. Requires enough purchase events to train.
- **Intent-modified conversion window**: if the advisor ran in session 1 and purchase happened in session 4 within 30 days, attribute advisor contribution with a decay function.
- **Holdout experiment**: the cleanest attribution is a randomized controlled trial — show the advisor to 50% of users, withhold it from 50%, compare purchase rates. This is what gives you the "2× conversion" numbers in the Miele case study.

Important caveat to raise: the neocom case study numbers are industry-reported, not from controlled experiments with holdout groups. A rigorous A/B test is the right way to establish causal lift, not before-after comparisons.

---

### D. Scale & Operational

**13. How do you scale this to handle peak ecommerce traffic — Black Friday, product launches?**

- Advisor widget is stateless on the client; session state is server-side. Horizontal scaling of the API tier.
- Recommendation computation is the CPU-intensive step. Pre-compute ranked lists for common answer patterns (top 10 answer combinations per brand) and cache. Tail answer patterns get computed on-demand.
- **Product catalog is read-heavy**: cache aggressively, invalidate on price/stock webhook. Cache hit rate should be > 95% in steady state.
- **Model inference at scale**: SLM classification should run in < 50ms; batch wherever possible. LLM explanation generation is async and can be queued — it doesn't block the recommendation.
- Graceful degradation: if the recommendation service is overloaded, fall back to rule-based filtering (budget + category constraints only). Never block the user from getting *some* result.

---

**14. How would you test the advisor — unit, integration, and live?**

- **Unit**: question branching logic, attribute constraint evaluation, ranking formula.
- **Integration**: end-to-end session: given a sequence of answers, assert that the correct product set is returned, ranked correctly, with correct attribute highlights.
- **Regression tests for catalog changes**: when a new product is added or an attribute changes, run the full test suite of canonical answer sequences and assert the recommendation set hasn't broken.
- **Live evaluation**: acceptance rate, completion rate, conversion rate in production. Run A/B experiments for any change to question ordering or ranking logic.
- **Adversarial testing**: what happens if a user answers contradictory questions (budget under €500, then requests a product that costs €800)? What happens if they submit empty answers? What if the catalog has zero matching products?

---

## Part 2 — Questions to Ask Them

These signal depth of thought and respect for complexity. Ask 3–5 depending on time.

---

### On Their Core Architecture

**1. How do you represent product attributes internally — structured attribute vectors, embeddings, or both — and how do you decide when to use semantic matching vs. hard-constraint filtering?**

*Why ask:* This gets at the heart of their ML stack. Pure embedding matching can be too fuzzy for hard constraints (budget ceiling must not be violated). Pure rule filtering misses semantic similarity. The interesting engineering is in the combination.

---

**2. What's your strategy for question sequence — static decision tree, rule-based with information gain, or ML-driven branching — and how do you handle editorial override for sensitive categories?**

*Why ask:* Shows you've thought about the tradeoffs between explainability and ML lift, and about the governance problem for categories like baby products.

---

**3. When the advisor session ends, does the advisor-derived user profile flow into the rest of the shopping experience — PLP sort order, PDP spec highlights, search ranking, cart suggestions — or is the advisor a bounded interaction?**

*Why ask:* This is the AURA gap question. It's non-confrontational and genuinely curious. Their answer tells you how they think about the future of their product. If they say "not yet, but we want to" — that's the conversation to have.

---

**4. How do you handle catalog schema normalization across brands in very different categories — an appliance brand with 12 technical attributes vs. a fashion brand with 6 stylistic attributes?**

*Why ask:* This is operationally the hardest part of a multi-tenant guided selling platform. Their answer reveals how mature their data engineering is.

---

**5. What does your feedback loop look like — do purchase signals from the OMS flow back to update recommendation model weights, and on what cadence?**

*Why ask:* Separates a static recommendation system from a continuously improving one. If they don't have this loop closed, it's a significant gap — and you know exactly why.

---

**6. How do you coordinate the advisor's surface adaptations with any A/B testing the brand is running on their PLP or PDP? How do you prevent the advisor from corrupting a treatment assignment?**

*Why ask:* This is a real operational problem that every experimentation team faces when adding adaptive middleware. Shows you've thought about production integration complexity.

---

### On Their Tech Stack & Engineering Culture

**7. What does your model evaluation pipeline look like — how do you know a change to the question model or ranking model is an improvement before you ship it to production?**

*Why ask:* Probes for offline evaluation rigor. A company without a clear offline evaluation pipeline ships changes by gut feel, which is dangerous at scale.

---

**8. You're in categories where a wrong recommendation has real consequences — infant safety equipment, high-cost appliances, e-bikes for road use. How do you calibrate governance for those categories vs. lower-stakes ones?**

*Why ask:* Tests whether they have a formal risk model or are handling it ad hoc. Their answer also tells you about their product philosophy.

---

**9. Where do you see the boundary between the advisor interaction and the broader store experience? Do you think of yourselves as a widget or as middleware?**

*Why ask:* Strategic question that reveals their product roadmap ambitions. If they say "we want to be middleware" — that's the AURA discussion. If they say "widget is our focus" — good to know their scope.

---

### On Integration & UX Intrusiveness

**10. You support three integration modes — banner, delayed popup, and inline. How do you decide when and whether to surface the advisor, and how do you measure whether the advisor is helping users or getting in their way?**

*Why ask:* The integration mode question is deceptively deep. A banner is passive; a delayed popup (triggered by scroll depth or time-on-page) is a deliberate interruption; an inline block becomes part of the page's information architecture. Each has a different intrusiveness profile, and a company that hasn't thought carefully about this will default to "whatever drives advisor starts" rather than "whatever helps users." The follow-up probes whether they treat intrusiveness as an outcome metric at all.

What a strong answer looks like from them:
- They track **advisor dismissal rate** alongside start rate — high dismissals on a popup trigger means it's firing at the wrong moment.
- They use **scroll depth and dwell time** as trigger heuristics, not just time elapsed: a user who has already scrolled to the bottom of the PLP has demonstrated they can't find what they want via browse; that's a much better moment to interrupt than 3 seconds after page load.
- They give brands **trigger configuration controls** (delay threshold, scroll %, page type) rather than a one-size-fits-all rule.
- For inline integrations, they think about **layout stability**: the inline block must reserve space at render time to avoid cumulative layout shift when the advisor widget initializes.
- They consider **session context**: don't show the advisor popup to a user who just completed an advisor session 10 minutes ago. Profile state should suppress re-triggering.

What a weak answer sounds like: "We A/B test the trigger timing per brand." This is true but insufficient — it optimizes for conversion lift without accounting for whether users who dismissed the popup had a worse shopping experience as a result.

The governance angle: in high-stakes categories (baby, medical), a popup that interrupts a user mid-browse with "need help finding the right product?" is a marketing intervention, not a neutral utility. The trigger logic should be held to the same intent-class standard as any other adaptation — `assistive` (surface when the user is demonstrably stuck) vs. `persuasive` (surface to maximize advisor starts, regardless of user need).

---

## Part 3 — Things to Know Cold

### Their four case studies (key numbers to know)

| Brand | Category | Metric |
|---|---|---|
| Emma & Noah | Baby / maternity | 2× conversion rate |
| Paulmann Licht | Lighting | +26.5% AOV; "20 filters → 8 questions" |
| Miele | Premium appliances | +76% conversion, +19% AOV, +266 monthly advisor sessions |
| Rebike | E-bikes | 250% conversion improvement; CMO: "advisor became customer-insight hub" |

### Their product framing

- **"Shop Agent"** / **"product finder"** / **"quiz"** / **"configurator/bundler"** — multiple product forms, same underlying pattern.
- **"AI-native"** — they emphasize not retrofitting AI onto legacy, building AI-first.
- **"1-to-1 experience"** — their marketing language for personalization.
- Their angle is **replacing filter-and-browse** with **goal-and-situation questioning**.

### The architectural gap (your edge)

Neocom's current positioning is a **bounded advisor widget**. The gap is:
> A customer who told the advisor their budget and use case still sees the same default PLP, same filter sidebar, and same PDP as an unauthenticated first-time visitor.

AURA proposes being the middleware layer that closes this gap — extending advisor-derived explicit attributes (budget, use case, expertise level, consideration stage) into governed, multi-surface adaptation across the full shopping journey. This is not a criticism of neocom; it's the natural next architectural step. Use this framing if it comes up: *"the advisor generates incredibly high-quality explicit signal — the open question is how that signal extends beyond the widget."*

### Key terms to use fluently

- **Guided selling** — their term for the advisor pattern
- **High-consideration categories** — their frame for complex product domains
- **AOV (average order value)** — the metric they optimize alongside conversion
- **Shop Agent** — their premium product tier (implies conversational, not just quiz)
- **Product finder / quiz** — simpler flow forms
- **1-to-1 personalization** — their aspiration language
