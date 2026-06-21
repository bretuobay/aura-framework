# Relationship and Differences: MOSAIC PhD Proposal vs. AURA Reference Architecture

## Executive Summary

MOSAIC and AURA are independently developed documents that converge on the same foundational architectural principle — **bounded, governed, LLM-assisted interface adaptation over a declared action space** — but they approach it from opposite directions, at different levels of generality, and with different engineering philosophies. MOSAIC is a domain-specialized research programme rooted in pedagogy; AURA is a general-purpose production middleware architecture rooted in engineering practice. Together they form a coherent intellectual landscape around bounded adaptive UI, but they make divergent tradeoffs that would need to be reconciled before either could inform the other.

---

## 1. Shared Intellectual Foundation

The two documents share a striking convergence of first principles, arrived at independently.

### 1.1 The Bounded Action Space Principle

Both documents independently reject unrestricted LLM UI generation and arrive at the same architectural commitment: constrain the LLM's output to a pre-declared action space.

- **MOSAIC** calls this the *Multimodal Component Catalogue* — a set of pedagogically validated, annotated UI components the LLM may compose.
- **AURA** calls this the *Capability Manifest* — a typed declaration of components, slots, variants, props, constraints, and risk classes the host application exposes to the middleware.

Both cite the same empirical evidence motivating this choice: unconstrained LLM generation produces inconsistent, inaccessible, and context-inappropriate outputs (Sawicki et al. in MOSAIC; implicit in AURA's problem statement).

### 1.2 Prescription Over Generation

Both architectures treat the LLM's role as *advisory* rather than *authoritative rendering*. MOSAIC's LLM emits a "component-activation specification (JSON)" validated against the catalogue schema. AURA's LLM produces a `UIPrescription` validated against the Capability Registry. Both describe the same pattern: the model recommends, a deterministic validator gates, the application renders.

### 1.3 Governance and Transparency as First-Class Concerns

Neither document treats explanation or override as optional UX polish. MOSAIC has a dedicated Transparency and Agency Layer with plain-language explanations and learner override controls, motivated by the agency findings of Song et al. (ExploreSelf). AURA has an Explainability Layer with three audience tiers (user, developer, auditor) and four display modes. Both have audit logs and human-override mechanisms.

### 1.4 Rejection of the Same Two Failure Modes

Both explicitly name and reject the same two architectural anti-patterns:

1. Unrestricted LLM UI generation (unbounded, unauditable).
2. LLMs as content engines only (underuses reasoning capacity for the interface itself).

This is a notable independent convergence. Neither document appears to be derived from the other.

---

## 2. Core Differences

### 2.1 Domain Specificity vs. Generality

This is the fundamental divergence.

**MOSAIC** is a *domain-specialized system* for remedial mathematics education. Its entire architecture is shaped by a specific user population (fragile self-efficacy, heterogeneous knowledge gaps, affective sensitivity) and a specific theoretical apparatus (Universal Design for Learning, Cognitive Load Theory, misconception tagging, prerequisite chains). The Component Catalogue carries pedagogical metadata — UDL principle, cognitive-load class (intrinsic/extraneous/germane), contraindications, known-uses provenance — that has no direct analogue in AURA.

**AURA** is a *domain-agnostic middleware layer*. Its Capability Manifest carries engineering metadata — risk class, reversibility, consent requirements, latency class — that is semantically neutral with respect to any domain. The same AURA framework is positioned for e-commerce filter highlighting, healthcare clinical emphasis, enterprise dashboard density, and educational resource panels. Domain knowledge is pushed to the host application and its data sources (LMS, EHR, CRM), not embedded in the middleware.

**Consequence:** MOSAIC would need to specialize heavily to instantiate as an AURA-compliant system. AURA's manifest schema would need to be extended with pedagogical fields before it could adequately express MOSAIC's catalogue semantics.

### 2.2 The LLM's Position in the Decision Pipeline

This is the sharpest architectural difference.

**MOSAIC** places the LLM *centrally and primarily*: it is the Adaptation Engine. The LLM ingests the structured learner context and catalogue schema, reasons over pedagogical needs, and emits the component selection. A fallback rule layer exists for reliability, but the LLM is the dominant decision mechanism.

**AURA** places the LLM *last in a tiered fallback pipeline*: Rules → Recommender → SLM → LLM. The LLM is explicitly *not on the hot path* for routine returning-user adaptation. It is reserved for cold-start onboarding, grounded explanation generation, semantic mapping, and complex adaptation proposals. AURA even introduces a **Small Language Model (SLM)** tier — fast semantic classification and reranking — that MOSAIC does not mention at all.

**Consequence:** MOSAIC assumes LLM reasoning is the primary mechanism whose quality determines adaptation quality (citing Gajos et al.'s accuracy-first finding). AURA treats LLM reasoning as the expensive, opaque, last resort whose use must be justified by latency and risk constraints. These are compatible in principle — MOSAIC's LLM-centric approach makes sense in a research prototype evaluating decision quality; AURA's tiered approach makes sense in production. But they reflect genuinely different assumptions about when LLM reasoning is *warranted*.

### 2.3 Rendering Authority

**MOSAIC** owns its own renderer. The Multimodal Component Catalogue + Renderer is an internal MOSAIC layer; MOSAIC instantiates components in declared modality variants and arranges them in the LMS layout. The host LMS is not given rendering authority — MOSAIC takes it.

**AURA** explicitly and emphatically does *not own rendering*. The defining principle is: "the host application retains rendering authority." AURA emits prescriptions; the host app decides how a valid prescription maps to rendered components, and may reject a prescription if local state has changed.

**Consequence:** This reflects different deployment assumptions. MOSAIC is a research prototype that controls its own frontend. AURA is middleware designed to be added to *existing* production applications without a rewrite. The two are architecturally compatible as a prototype strategy vs. a production middleware strategy, but they are not interchangeable.

### 2.4 User/Learner State Model

**MOSAIC** defines a rich, domain-specific *LearnerContext*: error history, time-on-task, click and modality-engagement paths, assessment scores, affect signals, curriculum position. These signals carry pedagogical meaning — the LLM reasons about "exposing a misconception" or "consolidating a prerequisite" rather than generic engagement.

**AURA** defines a general *UserModel*: explicit and inferred preferences, expertise, goals, accessibility needs, recent behavior, confidence, provenance, expiry, and consent state. This is a superset in some dimensions (provenance, expiry, confidence scoring) but lacks the domain-semantic structure MOSAIC requires.

**Consequence:** MOSAIC's LearnerContext is arguably AURA's `UserModel` extended with a domain-specific schema. AURA's architecture accommodates this through its `ContextModel` and domain data sources layer, but the extension would need to be explicit.

### 2.5 Nature of the Document and Empirical Claims

**MOSAIC** is a *PhD research proposal*. It has a 4-year methodology, a planned empirical evaluation programme (expert-annotated benchmark in Phase 2, prototype evaluation with learners in Phase 3), and explicit research questions. It will produce validated claims about decision quality, learner experience, and governance calibration.

**AURA** is a *reference architecture paper* — the second of a four-paper series. It explicitly disclaims empirical validation: "This paper is an architectural proposal, not an empirical validation." Its evaluation is reserved for Papers 3 and 4. AURA's claims are therefore design claims, not empirical ones.

**Consequence:** At this stage, neither document is empirically validated, but MOSAIC has a concrete evaluation plan while AURA is further from one. AURA's contribution is the architectural definition; MOSAIC's contribution is the full research arc including a benchmark.

### 2.6 Engineering Depth vs. Pedagogical Depth

These documents trade off depth in complementary directions.

**AURA** has significant engineering depth that MOSAIC lacks: a formal frontend protocol (AUIP) with nine REST/SSE endpoints, a TypeScript SDK integration pattern, a prescriptions streaming model, a complete failure-mode and degradation table, a conflict resolution priority order, explicit latency-budget handling, developer experience guidance, and a risk-class governance table mapping each risk tier to default behavior.

**MOSAIC** has significant pedagogical depth that AURA lacks: UDL principle tagging, CLT cognitive-load classification, misconception and prerequisite tagging, compositional contraindications, pedagogical-function declarations, and a detailed account of why the remedial learner population demands each architectural choice.

### 2.7 Transparency Audience and Motivation

**MOSAIC's** transparency layer is primarily motivated by *learner psychology*: remedial learners are at risk of trust-calibration failure — over-reliance or reflexive blame-self responses. Transparency exists to protect learner agency and support calibrated trust.

**AURA's** explanation model is motivated by *multi-stakeholder governance*: different explanation content for end users (plain-language factors, undo path), developers (scores, rejected candidates, model versions), and auditors (consent state, data classes, policy version, model hashes). The governance motivation is broader and institutionally oriented.

---

## 3. Structural Analogy Table

| Dimension | MOSAIC | AURA | Relationship |
|---|---|---|---|
| Bounded action space | Multimodal Component Catalogue | Capability Manifest | Structurally identical principle; different content semantics |
| LLM output format | Component-activation specification (JSON) | `UIPrescription` | Same pattern; AURA adds more constraint types |
| Decision mechanism | LLM-primary, fallback rules | Rules → Recommender → SLM → LLM | Inverted emphasis |
| User/learner model | LearnerContext (pedagogical signals) | UserModel (general behavioral + explicit) | MOSAIC is a domain-specific extension of AURA's model |
| Rendering authority | MOSAIC owns the renderer | Host application owns rendering | Prototype vs. middleware model |
| Transparency layer | Learner-facing + educator audit | User + developer + auditor tiers | MOSAIC subset of AURA's multi-audience model |
| Risk governance | Contraindications + fallback rules | Explicit risk classes (low/medium/high/critical) | AURA more formalized |
| Frontend protocol | Not defined | AUIP (9 REST/SSE endpoints) | AURA only |
| SLM tier | Not mentioned | Explicit (SLM as mid-tier classifier) | AURA only |
| Domain scope | Remedial mathematics | General (e-commerce, health, enterprise, education) | Complementary |
| Empirical validation | Planned (Phases 2–3) | Deferred (Papers 3–4) | Both pre-validation |
| Theoretical grounding | UDL, CLT, DSR | Architecture patterns, production engineering | Complementary |

---

## 4. How They Could Inform Each Other

### What AURA Offers MOSAIC

- The tiered pipeline (Rules → SLM → LLM) is a production-readiness upgrade MOSAIC does not address. MOSAIC's future production hardening work could adopt AURA's pipeline to reduce cost and latency of the LLM on the hot path.
- AUIP provides a concrete protocol specification that MOSAIC's Phase 1 architecture work could adopt or adapt, avoiding the need to re-design an event and prescription protocol from scratch.
- AURA's risk classification model is more formalized than MOSAIC's contraindication tags and could inform how MOSAIC governs high-stakes adaptation decisions (e.g., preventing a low-cognitive-load component from being applied when the learner needs higher-order challenge).
- The multi-audience explanation model (user/developer/auditor) extends MOSAIC's single-audience transparency layer in ways relevant to institutional deployment.

### What MOSAIC Offers AURA

- MOSAIC's domain-specific catalogue semantics (UDL, CLT, misconception tags, prerequisite chains) demonstrate how AURA's generic manifest schema must be extended for high-stakes educational deployment. This is a direct instantiation that could serve as a case study for Paper 3 of AURA's programme.
- MOSAIC's expert-annotated benchmark (Phase 2) for LLM component-selection quality is exactly the kind of evaluation evidence AURA's Paper 4 will need, scoped to a specific domain. The benchmark methodology could transfer.
- MOSAIC's theoretical framework — Gajos et al.'s accuracy-over-predictability finding as the dominant evaluation criterion — provides a principled rationale for why decision quality matters in adaptive UI that AURA's engineering-centric framing does not foreground.
- MOSAIC's learner agency and transparency findings (motivated by Song et al.'s ExploreSelf tension findings) could inform AURA's active and confirmation explanation modes.

---

## 5. Key Tensions

**1. LLM centrality vs. LLM as last resort.** MOSAIC's empirical programme is designed to evaluate whether LLMs can be good enough to be the primary adaptation mechanism. AURA's architecture assumes they cannot be trusted as primary mechanisms in production and places them last. These are not contradictory — they reflect different contexts (research prototype vs. production middleware) — but they represent a genuine design philosophy difference that would need to be resolved if MOSAIC moved toward production.

**2. Rendering ownership.** MOSAIC controls its own frontend; AURA must not. A MOSAIC system integrated via AURA would require the LMS to be the host application and MOSAIC to issue prescriptions rather than render directly. This is architecturally feasible but would require MOSAIC to redesign its Renderer layer as an AURA-compliant prescription consumer.

**3. Catalogue semantics vs. manifest agnosticism.** AURA deliberately keeps its manifest semantically neutral to remain domain-agnostic. MOSAIC's catalogue is semantically rich because pedagogical meaning *is* the adaptation signal. Integrating MOSAIC's catalogue into AURA's manifest would require either extending AURA's manifest schema with domain-specific fields or encoding pedagogical metadata as opaque domain context — neither of which AURA currently specifies.

---

## 6. Summary Assessment

MOSAIC and AURA are intellectually compatible and mutually reinforcing, but they are not the same system at different scales. MOSAIC is a focused, empirically grounded research programme that will produce validated claims about one class of adaptive UI problem (educational, LLM-primary, pedagogically bounded). AURA is a general architectural framework that defines how adaptive UI middleware should be structured in production across any domain.

The most accurate framing is: **MOSAIC is a candidate domain instantiation of the AURA middleware pattern, with a research contribution AURA does not make (benchmark, failure-mode taxonomy, learner evaluation), and a set of pedagogical semantics AURA does not carry.** Conversely, AURA provides the engineering infrastructure and production governance model that MOSAIC's future work will eventually need but explicitly defers.

Neither document is ready to be collapsed into the other. They operate at different levels of the system stack, with different empirical ambitions, different audiences, and different definitions of what "good" adaptation looks like. The productive relationship between them is complementary specialization, not subsumption.
