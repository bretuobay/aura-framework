# Adaptive User Interfaces in the LLM Era: State of the Art, Limitations, and Research Opportunities

## Abstract

Adaptive user interfaces (AUIs) adjust presentation, navigation, content, assistance, ranking, interaction style, or accessibility behavior according to user goals, knowledge, abilities, preferences, and context. Research on AUIs spans adaptive hypermedia, user modeling, context-aware systems, intelligent user interfaces, recommender systems, intelligent tutoring, mobile health, explainable AI, and inclusive design. This review synthesizes a 37-paper corpus across education, healthcare, and e-commerce, together with broader notes on high-value AUI application domains. The synthesis shows that adaptive interfaces are most valuable where users differ substantially, context changes frequently, information overload is high, mistakes are costly, or tasks repeat over time. It also shows persistent limitations: systems are often domain-specific, difficult to integrate into existing products, weakly evaluated in real-world settings, opaque to users, and under-specified with respect to consent, profile correction, and governance. Large and small language models create new opportunities for semantic intent interpretation, explanation generation, cold-start support, component-aware orchestration, and private on-device adaptation. However, the literature does not support treating unconstrained model-generated UI as a sufficient solution. The review concludes by motivating the need for governed adaptive UI middleware and reference architectures as future work.

## Keywords

Adaptive user interfaces; adaptive hypermedia; user modeling; context-aware systems; intelligent user interfaces; personalization; recommender systems; explainable AI; large language models; small language models; accessibility; human-computer interaction.

## 1. Introduction

Most digital systems still present a largely uniform interface to users with different goals, abilities, literacy levels, expertise, devices, contexts, and risk exposure. A novice learner, an expert clinician, an older adult shopper, and an analyst under time pressure may receive the same information density, terminology, workflow order, ranking, explanation style, and notification strategy. Adaptive user interface research addresses this mismatch by asking how interfaces can change in response to what is known about a user, task, environment, and domain.

The idea is not new. Adaptive hypermedia systems built user models of goals, preferences, and knowledge to adapt links, navigation, and presentation (Brusilovsky, 2012). Context-aware mobile systems incorporated device, activity, time, location, and usage conditions into interface decisions (Alnanih et al., 2013). Intelligent user interfaces considered how systems could allocate tasks, provide assistance, and explain intelligent behavior (Martin, n.d.). Recommender systems and search interfaces adapted rankings and suggestions. Education, healthcare, and e-commerce became especially productive domains because they combine heterogeneous users, repeated interaction, changing context, and measurable outcomes.

The current LLM era changes the technical substrate but not the core HCI problem. Large language models (LLMs) and small language models (SLMs) can classify intent, summarize sessions, generate explanations, map natural language goals to interface capabilities, support cold-start adaptation, and reason over domain context. At the same time, they introduce risks: invalid output, latency, cost, hallucination, privacy leakage, over-automation, and opacity. AUI research therefore remains relevant precisely because it treats adaptation as a user modeling, interaction, governance, and evaluation problem rather than merely a generation problem.

This review has three goals. First, it synthesizes the reviewed corpus across foundations and domains. Second, it identifies cross-cutting themes and limitations. Third, it frames research opportunities for adaptive interfaces in the LLM/SLM era.

### Research Program

This paper is the first paper in a four-paper research program:

1. A literature review of adaptive user interfaces in the LLM era.
2. A reference architecture for governed adaptive UI middleware.
3. An implementation and prototype paper for the AURA framework.
4. A testing and evaluation paper for AURA prototypes.

The present paper motivates the need for a reference architecture but does not present AURA in detail.

## 2. Foundations of Adaptive User Interfaces

### 2.1 Adaptive Hypermedia and User Modeling

Adaptive hypermedia is one of the clearest foundations for AUIs. Brusilovsky (2012) describes systems that construct user models containing goals, preferences, and knowledge, then use those models to adapt content, links, navigation, or presentation. Educational hypermedia became an early and sustained application area because learning depends on current knowledge, goals, pace, and support needs.

This tradition established concepts that continue to structure modern AUI work:

- user models containing knowledge, preferences, goals, and interaction history;
- domain models that describe concepts, resources, tasks, or items;
- adaptation rules or algorithms that connect model state to interface changes;
- feedback loops that update the model as users interact;
- individualized presentation and navigation.

The value of this lineage is that it treats adaptation as a relationship among user state, domain structure, and interface behavior. The limitation is that many systems were domain-specific and difficult to transfer into general-purpose product engineering.

### 2.2 Context-Aware Systems

Context-aware systems expanded adaptation beyond stable user preferences. In mobile and ubiquitous computing, context may include device, viewport, network quality, input modality, time, location, activity, environment, role, and task state. Alnanih et al. (2013) proposed context-based and rule-based adaptation of mobile user interfaces in mHealth, showing that adaptation can be structured around explicit context categories and rules.

Context is central because many interface needs are situational. A patient using a phone outdoors, a clinician in a high-pressure workflow, and a learner switching from desktop to mobile do not only differ by preference; they differ by current constraints. The literature therefore suggests that adaptive systems need both longitudinal user profiles and session-level context models.

### 2.3 Intelligent User Interfaces

Intelligent user interfaces broaden AUI concerns from presentation to assistance, task allocation, explanation, and collaboration between humans and intelligent systems. Martin (n.d.) examines adaptive intelligent user interfaces for crowdsourced human computation, emphasizing dynamic task allocation, scalability, explainability, gamification, and human-AI collaboration.

This strand is important in the LLM era because adaptive interfaces increasingly mediate between users and AI systems. The question is not only what content to show, but how much assistance to provide, when to intervene, how to explain, and how to preserve agency.

### 2.4 Recommender Systems, Search, and Ranking

Recommender systems and search interfaces have operationalized adaptation at scale through ranking, filtering, personalization, and semantic retrieval. In e-commerce, recommendation and search adaptation shape discovery, trust, and purchasing behavior. Pan et al. (2026) show how adaptive semantic ID learning can improve multimodal recommendation at industrial scale. Gunda and Komati (n.d.) combine GPT-based annotation with neural models to support personalized and transparent product recommendations.

This work demonstrates that many adaptive interfaces are built on ranking and representation systems, not merely layout changes. It also highlights a boundary: personalized ranking changes what users see first, which can improve relevance but also narrow exploration or manipulate attention.

## 3. Domain Synthesis

### 3.1 Education and Adaptive Learning

Education is one of the strongest AUI domains because the rationale for adaptation is direct: learners differ in prior knowledge, pace, goals, accessibility needs, confidence, motivation, and preferred forms of support. Adaptive systems may adjust content sequence, difficulty, resource recommendations, hint timing, modality, feedback, dashboard views, or assessment pathways.

Brusilovsky (2012) frames adaptive educational hypermedia around learner models and individualized navigation. Umapathy (n.d.) develops an adaptive interface for open educational content, combining teacher assignment, active learner feedback, and passive usage data to surface relevant resources for concepts. Khalil et al. (n.d.) discuss adaptive course content and intelligent tutoring systems as mechanisms for individualized learning experiences.

Recent education work adds two important qualifications. First, adaptation should support teacher orchestration rather than replace responsible instruction. Hernandez-Herrera et al. (2026) position custom GPT and retrieval-augmented generation as tools for teacher-led personalization, with reported satisfaction in a pilot but also variation across disciplines. Second, adaptive AI can create barriers when design choices fail atypical learners. Tulak et al. (n.d.) identify a frustration-disengagement loop and a representational divide for slower-paced learners using an adaptive mathematics platform.

Inclusive education work reinforces this caution. Pieriboni et al. (2025) emphasize Universal Design for Learning, co-design, and disability support in ICT-enhanced STEM education. Gadzhimusieva et al. (2025) introduce SpectrumSphere for autistic students and show that teacher adoption depends on usefulness, ease of use, self-efficacy, institutional support, and infrastructure. Hadyaoui and Cheniti-Belcadhi (2025) present SOFIA, a service-oriented adaptive assessment framework, as evidence that modular architectures can integrate adaptive feedback into existing learning platforms.

The education corpus supports adaptation, but it does not support naive personalization. Adaptive learning systems need explicit knowledge models, educator constraints, accessibility support, profile correction, and careful evaluation of learning outcomes and learner agency.

### 3.2 Healthcare, mHealth, Chronic Disease, and Explainability

Healthcare is a high-value and high-risk AUI domain. Patients, clinicians, caregivers, and administrators differ in role, literacy, physical and cognitive ability, domain expertise, emotional state, and task criticality. Mistakes can be costly, so interface adaptation must preserve critical information and support auditability.

Alnanih et al. (2013) demonstrate context-based and rule-based adaptation for healthcare professionals using mobile interfaces. Shakshuki et al. (2015) propose a multi-agent system that tracks patient data and uses reinforcement learning to adapt healthcare interfaces over time. Vasilyeva et al. (n.d.) frame eHealth adaptation around heterogeneous abilities, interests, and needs in information delivery.

Chronic disease research adds grounded design constraints. Wang et al. (2023) systematically review AUIs for chronic disease systems, categorizing data sources, collection techniques, adaptive mechanisms, and interface elements. Wang et al. (2024) and Wang et al. (n.d.-a) identify user overload, variable disease severity, long-term adherence, and the need to maintain critical functionality and usability. These findings imply that adaptation should be risk-classed: a font-size suggestion and a clinical alert reordering do not have the same safety profile.

LLM-based healthcare interface work shows emerging opportunity and unresolved risk. Ghosh et al. (2023) propose an LLM-powered adaptive UI framework for culturally sensitive virtual healthcare applications. Ghosh et al. (n.d.) explore LLMs for real-time healthcare UI enhancement and HTML content adjustment. These works motivate semantic and cultural adaptation, but they also sharpen the governance problem: model-generated interface changes in healthcare must be bounded, auditable, and clinically appropriate.

Explainability is especially central in healthcare. Fouad et al. (n.d.) show that human-centered UI design affects how radiologists use explanations such as Grad-CAM and LIME. Islam et al. (n.d.) argue that transparency builds cognitive, emotional, and social trust. Njei et al. (2025) find that healthcare AI agent research is rapidly growing but fragmented, with technical innovation outpacing governance and real-world validation.

The healthcare corpus therefore supports adaptive interfaces only under strong constraints: transparent design, human oversight, role-specific explanations, privacy-preserving deployment, and careful separation between UI adaptation and clinical recommendation.

### 3.3 E-Commerce, Recommendation, Trust, and Discovery

E-commerce is a commercially mature AUI domain. Product recommendations, personalized homepages, dynamic search ranking, contextual promotions, recently viewed items, and trust signals are all forms of interface adaptation. The corpus shows movement from static personalization toward semantic, explainable, multimodal, and goal-driven adaptation.

Pan et al. (2026) demonstrate that semantic item representations affect retrieval and ranking quality at scale. Gunda and Komati (n.d.) integrate GPT-derived annotation, neural embeddings, and natural-language explanation for transparent product recommendations. Hu and Lee (2026) link AI and AR personalization to perceived usefulness, immersion, trust, and continued use. Hien et al. (2026) show that personal innovativeness, compatibility, and self-efficacy shape adoption of AI-integrated e-commerce.

Goal-driven interfaces are a significant development. Cordioli and Matera (n.d.) introduce Mirage, where developers declare semantically described GUI components and an LLM maps user goals to relevant components. This suggests a future in which interfaces can be orchestrated by semantic intent rather than navigated only through static menus.

E-commerce also exposes trust and surveillance risks. Kim et al. (n.d.) find that older adults may not notice XAI features, may mistake them for advertisements, or may experience user-model dashboards as both empowering and surveilling. De Andres et al. (n.d.) show that age and gender can be inferred from early interaction patterns, which may support cold-start adaptation but also raises privacy and fairness concerns. Dong (2026) emphasizes that cross-border e-commerce trust varies across cultures and that AI-enabled trust mechanisms need regulatory and cultural sensitivity.

The e-commerce corpus therefore shows both the business value and ethical tension of AUI. Personalization can improve relevance and reduce effort, but it can also manipulate ranking, infer sensitive traits, and erode trust if users cannot understand or correct the profile driving adaptation.

## 4. Cross-Cutting Themes

### 4.1 User, Context, and Profile Modeling

Across domains, adaptive systems collect signals, form models, reason over interventions, modify interface behavior, and learn from feedback. User models may include expertise, goals, accessibility needs, preferences, knowledge state, interaction history, role, or inferred intent. Context models may include device, task, time, environment, location, network, domain state, and risk level.

The literature also shows that profile quality is a persistent limitation. Inferred attributes can be wrong, stale, sensitive, or misunderstood by users. Explicit preferences should override behavioral inference, and inferred attributes should carry confidence, provenance, expiry, visibility, and correction mechanisms.

### 4.2 Adaptation Targets

AUI is not a single behavior. Reviewed systems adapt:

- presentation, including density, typography, component variants, and visual emphasis;
- navigation, including menu simplification, shortcuts, and progressive disclosure;
- ranking, including products, lessons, tasks, documents, alerts, and resources;
- content, including terminology, explanation depth, modality, and summaries;
- assistance, including hints, interventions, reminders, and onboarding;
- accessibility settings, including font scale, contrast, input mode, and motion;
- notifications, including timing, channel, urgency, and batching;
- workflow, including task order, confirmations, and human handoffs.

The same adaptation target can carry different risk by domain. Ranking products is not equivalent to ranking clinical alerts. Educational remediation, financial defaults, and healthcare workflows require stricter governance than low-risk product-card variants.

### 4.3 Explainability and Trust

Explainability appears in both healthcare and e-commerce literature but cannot be treated uniformly. Fouad et al. (n.d.) show that clinical explanations need human-centered design and audience-appropriate presentation. Islam et al. (n.d.) connect transparency to trust, anxiety reduction, and autonomy. Kim et al. (n.d.) show that explanations in e-commerce may be ignored, misread, or experienced as surveillance.

This suggests that explanation should be proportional to risk and situated in the user's task. Low-risk changes may use passive explanations on demand. Medium-risk adaptations may require brief inline reasons and undo. High-risk adaptations may require confirmation and human oversight. User-model dashboards should be designed carefully because they can empower correction while exposing unsettling inference.

### 4.4 Privacy, Sensitive Inference, and Consent

Adaptive interfaces often depend on behavioral data, and behavioral data can reveal sensitive attributes. De Andres et al. (n.d.) show the feasibility of demographic inference from early interactions. Healthcare and education contexts may involve protected, minor-related, or otherwise sensitive data. Emotional adaptation, cultural adaptation, accessibility inference, and demographic inference all raise consent and fairness issues.

The reviewed literature points toward several principles:

- collect only data needed for the active adaptation purpose;
- gate sensitive inference behind explicit consent and legitimate need;
- make inferred profile attributes visible and correctable where appropriate;
- avoid sending sensitive data to cloud LLMs by default;
- allow reset, erase, and opt-out paths;
- audit higher-risk adaptation decisions.

### 4.5 Accessibility and Inclusive Adaptation

Accessibility is both a domain and a cross-cutting requirement. Adaptive interfaces may help users with visual, motor, cognitive, hearing, temporary, or situational impairments by adjusting contrast, font scale, motion, input mode, layout complexity, language, or interaction sequence. However, inclusive adaptation cannot rely only on inference. Explicit operating-system, browser, assistive-technology, and user preferences should take precedence.

Education studies involving learners with disabilities and autistic students show the importance of co-design, institutional support, and avoiding one-size-fits-all assumptions (Pieriboni et al., 2025; Gadzhimusieva et al., 2025). Healthcare chronic disease studies similarly warn that adaptation can overload users or hide important functions if poorly designed (Wang et al., 2024).

## 5. LLM and SLM Opportunities

### 5.1 Semantic Intent Interpretation

LLMs and SLMs can classify user goals, infer task intent from natural language and interaction context, and map requests onto known interface capabilities. Mirage demonstrates the potential of declaring GUI components semantically and using an LLM to map user goals to component assemblies (Cordioli and Matera, n.d.). This is especially promising for complex search, enterprise dashboards, education platforms, and public services where users may not know the available navigation structure.

### 5.2 Explanation Generation

LLMs can generate plain-language explanations from structured factors, policy decisions, and model outputs. This is useful when explanations must be tailored to different audiences: end users, developers, educators, clinicians, auditors, or administrators. The key constraint is that explanations should be grounded in recorded decision factors rather than fabricated after the fact.

### 5.3 Cold-Start Support

Cold-start adaptation is difficult when the system lacks history. LLMs can support onboarding dialogs, interpret explicit goals, and reason from sparse context. However, cold-start support must avoid over-inference, especially for demographic, health, education, accessibility, or emotional attributes. Explicit user input and reversible defaults are safer than hidden inference.

### 5.4 Component-Aware UI Orchestration

LLMs can reason over semantic component descriptions, but production systems need bounded action spaces. A model may suggest that a comparison-oriented shopper should see comparison product cards, or that a learner should receive a step-by-step explanation. The actual interface change should still be constrained by declared components, typed variants, domain policies, and host application rendering.

### 5.5 On-Device and Private Adaptation

SLMs and on-device models create opportunities for lower-latency and more private adaptation. They may handle intent classification, session summarization, friction detection, local accessibility support, or rule augmentation without sending sensitive raw data to cloud services. This is particularly important for education, healthcare, accessibility, and enterprise settings.

## 6. Open Gaps

### 6.1 Lack of General Middleware

The corpus contains domain systems, prototypes, guidelines, recommender architectures, and LLM-enabled interface ideas, but little general-purpose middleware that existing product teams can adopt. Adaptive behavior is often embedded inside a single app, which limits reuse, auditability, and developer adoption.

### 6.2 Limited Real-World Evaluation

Many studies use prototypes, pilots, surveys, simulated settings, or conceptual frameworks. Some report controlled studies or practitioner evaluations, such as SOFIA in education and chronic disease AUI guidelines (Hadyaoui and Cheniti-Belcadhi, 2025; Wang et al., n.d.-a). However, real-world longitudinal evaluation remains limited, especially for high-risk or multi-user settings.

### 6.3 Weak Developer Integration

The literature often under-specifies how developers integrate adaptive behavior into typed frontend frameworks, design systems, analytics pipelines, and production deployment. AUI work needs stronger attention to developer experience, component contracts, versioning, testing, and failure handling.

### 6.4 Profile Correction

User-model correction is widely implied but rarely developed deeply. Users need ways to inspect, correct, reset, or erase adaptive profiles without being overwhelmed or surveilled. This is especially important for sensitive inference, accessibility assumptions, education labels, and health-related contexts.

### 6.5 High-Risk Domain Governance

Healthcare, education, finance, public services, and accessibility-sensitive systems need stronger governance than low-risk recommendation settings. Research should specify risk classes, audit trails, human approval paths, consent scopes, and domain policy enforcement.

### 6.6 Adaptation Quality Metrics

Click-through rate, dwell time, or engagement alone are insufficient. Evaluation should include task success, cognitive load, trust calibration, perceived control, explanation comprehension, override rate, reversion rate, accessibility impact, safety incidents, and domain-specific outcomes such as learning retention or healthcare comprehension. The field still lacks shared benchmarks for "good" adaptation across interface targets and risk classes.

## 7. Implications for Future Frameworks

The literature does not point to a single adaptation algorithm. It points to an architectural need. Future adaptive UI frameworks should separate generic infrastructure from domain-specific policy. They should support user and context modeling, explicit consent, typed adaptation targets, profile correction, explanation, observability, and graceful degradation. They should use rules, recommenders, SLMs, and LLMs where each is appropriate, while preventing unconstrained model output from directly controlling the interface.

The central implication is that adaptive UI should be treated as governed middleware. Host applications should declare what can change. Adaptive systems should observe only consented signals, reason over bounded actions, explain and audit consequential changes, and preserve user override. This motivates the second paper in the research program: a reference architecture for governed adaptive UI middleware.

## 8. Conclusion

Adaptive user interfaces remain a compelling but under-realized direction for human-computer interaction. Education, healthcare, and e-commerce all show strong reasons for adaptation, but each domain also reveals limits: unsafe automation, opacity, incorrect inference, poor accessibility, weak developer integration, and insufficient real-world evaluation. LLMs and SLMs expand the design space by enabling semantic intent interpretation, explanation generation, cold-start support, component-aware orchestration, and private local adaptation. They do not eliminate the need for user modeling, consent, policy, typed interface boundaries, evaluation, and governance.

The next research step is not simply to generate more interfaces with LLMs. It is to design architectures that make adaptive behavior practical, bounded, explainable, and safe enough for production systems.

## References

Alnanih, R., Ormandjieva, O., and Radhakrishnan, T. (2013). *Context-based and Rule-based Adaptation of Mobile User Interfaces in mHealth*. File: `HealthCare/1-s2.0-S1877050913008442-main.pdf`.

Brusilovsky, P. (2012). *Adaptive Hypermedia for Education and Training*. File: `Education/13321_ARI_2012.pdf`.

Cordioli, L., and Matera, M. (n.d.). *From Navigation to Intention: Reframing the Web Experience through Goal-Driven Interfaces*. File: `Ecommerce/3774904.3792479.pdf`.

De Andres, J., Fernandez-Lanvin, D., Gonzalez-Rodriguez, M., and Pariente-Martinez, B. (n.d.). *AI Models for Demographic Prediction in E-Commerce: Age and Gender from Initial User Interactions*. File: `Ecommerce/peerj-cs-3563.pdf`.

Dong, Y. (2026). *Navigating Trust in Cross-Border E-Commerce: A Systematic Review of Cultural and Consumer Dynamics*. File: `Ecommerce/s41599-026-06579-4_reference.pdf`.

Fouad, S., Hakobyan, L., Ihongbe, I. E., Kavakli-Thorne, M., Atkins, S., and Bhatia, B. (n.d.). *Human-Centered User Interface Design for Explainable AI in Chest Radiology: A Multi-Phase Co-Design Approach*. File: `HealthCare/Human-Centered_User_Interface_Design_for_Explainable_AI_in_Chest_Radiology_A_Multi-Phase_Co-Design_Approach.pdf`.

Gadzhimusieva, D., Melia, S., Lorenzo Lledo, G., and Nasabeh, S. S. (2025). *Development and Pilot Evaluation of an AI-Driven Learning Management System for Personalized Education for Autistic Students*. File: `Education/s10639-025-13888-9.pdf`.

Ghosh, A., Yan, Y., and Lin, W. (2023). *Adaptive User Interface Framework Powered by a Large Language Model for Culturally Sensitive Virtual Healthcare Applications*. File: `HealthCare/2023-AdaptiveUserInterfaceFrameworkPoweredbyaLargeLanguageModelforCulturallySensitiveVirtualHealthcareApplications_.pdf`.

Ghosh, A., Huang, B., Yan, Y., and Lin, W. (n.d.). *Enhancing Healthcare User Interfaces Through Large Language Models Within the Adaptive User Interface Framework*. File: `HealthCare/EnhancingHealthcareUserInterfacesThroughLargeLanguageModelsWithintheAdaptiveUserInterfaceFramework.pdf`.

Gunda, P., and Komati, T. R. (n.d.). *Hybrid GPT and Neural Models for Personalized E-Commerce: A Novel Framework for Adaptive and Transparent Product Recommendations*. File: `Ecommerce/itegam,+2874+Final+Article-corrigido+ok_pagenumber.pdf`.

Hadyaoui, A., and Cheniti-Belcadhi, L. (2025). *Scalable Adaptive Assessment Framework for Collaborative eLearning: A Service-Oriented AI Approach*. File: `Education/s40561-025-00426-w.pdf`.

Hernandez-Herrera, J. R., Ortiz-Bejar, J., and Ortiz-Bejar, J. (2026). *Adaptive and Personalized Learning in Higher Education: An Artificial Intelligence-Based Approach*. File: `Education/education-16-00109.pdf`.

Hien, N. N., Luu, D. X., Ghi, T. N., and Nguyen, T. N. (2026). *Determinants of AI-Integrated E-Commerce Acceptance: The Roles of Personal Innovativeness, Self-Efficacy, Compatibility, and Curiosity*. File: `Ecommerce/Human Behavior and Emerging Technologies - 2026 - Hien - Determinants of AI-Integrated E-Commerce Acceptance  The Roles of.pdf`.

Hu, J., and Lee, E. T. (2026). *The Impact of Integrated AI and AR in E-Commerce: The Roles of Personalization, Immersion, and Trust in Influencing Continued Use*. File: `Ecommerce/jtaer-21-00033.pdf`.

Islam, N., Ezcurra, V., Rader, J., Margondai, A., Willox, S., Von Ahlefeldt, C., and Mouloua, M. (n.d.). *Transparency for Trust: Enhancing Acceptance and System Integration of Intelligent AI in Healthcare*. File: `HealthCare/TransparencyforTrust-EnhancingAcceptanceandSystemIntegrationofIntelligentAIinHealthcare.pdf`.

Khalil, S. A., Mahmood, M., Ali, Z., and Alam, I. (n.d.). *AI for Personalized Learning Experiences: Adaptive Course Content and Intelligent Tutoring Systems*. File: `Education/AI-for-Personalized-Learning-Experiences_-Adaptive-Course-Content-and-Intelligent-Tutoring-Systems.pdf`.

Kim, S. H., Kim, E. H., Yang, H., Lee, J., and Lim, H. (n.d.). *Clarifying or Complicating?: Understanding Older Adults' Engagement with Real-World XAI in E-Commerce*. File: `Ecommerce/3772318.3791908.pdf`.

Martin, R. J. (n.d.). *Optimizing Crowdsourced Human Computation with Adaptive Intelligent User Interfaces for Scalability and Explainability*. File: `Education/articulo4.pdf`.

Njei, B., Al-Ajlouni, Y. A., Kanmounye, U. S., Boateng, S., Nguefang, G. L., Njei, N., Hamouri, S., and Al-Ajlouni, A. A. (2025). *Artificial Intelligence Agents in Healthcare Research: A Scoping Review*. File: `HealthCare/journal.pone.0342182.pdf`.

Pan, Y., Chen, Y., Hu, Z., Yuan, X., Wang, D., Yin, Y., Ni, S., Wang, H., Wang, J., Ren, F., and Ou, W. (2026). *Beyond Static Collision Handling: Adaptive Semantic ID Learning for Multimodal Recommendation at Industrial Scale*. File: `Ecommerce/2604.23522v1.pdf`.

Pieriboni, G., Buzzy, M., and Leporini, B. (2025). *STEM Education and ICT-Enhanced Tools for Students with Disabilities: A Five-Year Review*. File: `Education/s10209-025-01282-8.pdf`.

Shakshuki, E. M., Reid, M., and Sheltami, T. R. (2015). *An Adaptive User Interface in Healthcare*. File: `HealthCare/1-s2.0-S1877050915016634-main.pdf`.

Tulak, T., Kaharuddin, A., and Tulak, H. (n.d.). *The Representational Divide: A Qualitative Usability Analysis of an Adaptive AI for Atypical Learners*. File: `Education/IJIET-V16N3-2533.pdf`.

Umapathy, V. (n.d.). *An Adaptive User Interface for Open Educational Content*. File: `Education/757176343-MIT (1).pdf`.

Vasilyeva, E., Pechenizkiy, M., and Puuronen, S. (n.d.). *Towards the Framework of Adaptive User Interfaces for eHealth*. File: `HealthCare/Towards_the_Framework_of_Adaptive_User_I.pdf`.

Wang, W., Khalajzadeh, H., Grundy, J., Madugalla, A., McIntosh, J., and Obie, H. O. (2023). *Adaptive User Interfaces in Systems Targeting Chronic Disease: A Systematic Literature Review*. File: `HealthCare/s11257-023-09384-9.pdf`.

Wang, W., Khalajzadeh, H., Grundy, J., Madugalla, A., and Obie, H. O. (2024). *Adaptive User Interfaces for Software Supporting Chronic Disease*. File: `HealthCare/3639475.3640104.pdf`.

Wang, W., Grundy, J., Khalajzadeh, H., Madugalla, A., and Obie, H. O. (n.d.-a). *Designing Adaptive User Interfaces for mHealth Applications Targeting Chronic Disease: A User-Centered Approach*. File: `HealthCare/3731750.pdf`.
