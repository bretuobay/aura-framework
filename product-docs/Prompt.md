Here is a refined prompt you can copy:

Act as a senior software architect and HCI researcher.

I want to design a generic reference architecture and framework for integrating Adaptive User Interfaces into modern web and mobile applications.

Context:
I have a corpus of research papers on Adaptive User Interfaces, user modelling, context-aware systems, personalization, adaptive hypermedia, recommender systems, and intelligent interfaces. I want to modernize these ideas using current Large Language Models, Small Language Models, agentic workflows, and protocols such as the Model Context Protocol. The architecture may use MCP or propose a better protocol if needed.

Corpus:
- Index files created:
    - Ecommerce/index.md — 12 papers
    - Education/index.md — 12 papers
    - HealthCare/index.md — 13 papers

Goal:
Design a framework that works as middleware between existing applications, user/context data sources, LLM/SLM services, and frontend UI frameworks. It should allow developers to add adaptive UI capabilities to new or existing products without rewriting the whole application.

Important requirements:

* Framework-agnostic frontend integration: React, Vue, Angular, Svelte, Solid, React Native, Flutter, etc.
* TypeScript-first SDK, but not limited to TypeScript backends.
* Usable with any backend stack.
* Support web and mobile apps.
* Work with existing product UIs, not only greenfield apps.
* Support user modelling, context modelling, adaptation rules, LLM/SLM reasoning, UI component prescription, privacy controls, and explainability.
* Allow applications to expose UI capabilities, available components, user events, domain context, and constraints to the adaptive middleware.
* Allow the middleware to recommend or prescribe adaptive interface changes, such as layout, content, navigation, search ranking, product cards, filters, explanations, accessibility settings, notifications, and interaction modes.
* Include examples for e-commerce, education, healthcare, enterprise dashboards, and search/discovery experiences.

Please produce:

1. A clear name and conceptual model for the framework.
2. The main architectural components.
3. How the frontend app communicates with the adaptive middleware.
4. Whether MCP is sufficient or whether a new protocol is needed.
5. A proposed protocol or API contract if MCP is not enough.
6. Data flow from user interaction to adaptive UI decision.
7. How UI components are registered and prescribed.
8. How LLMs/SLMs are used safely and efficiently.
9. How user profiles and context are built and updated.
10. Privacy, security, consent, and explainability considerations.
11. A TypeScript-oriented developer experience.
12. Example integration flow for an e-commerce search/discovery page.
13. A minimal MVP architecture.
14. A future research/product roadmap.
15. Risks, open questions, and how this framework could become open source and widely adopted.

Be critical and practical. Avoid vague AI hype. Ground the architecture in existing Adaptive UI research concepts, but update it for modern LLM/SLM-based software systems.

Also include Mermaid diagrams throughout the answer.

Required diagrams:

1. High-level reference architecture diagram.
2. Adaptive UI decision pipeline.
3. Frontend integration sequence diagram.
4. Component registry and UI prescription flow.
5. User/context/profile model lifecycle.
6. MCP-based architecture option.
7. Alternative custom protocol architecture option.
8. Example e-commerce search/discovery adaptation flow.
9. MVP architecture diagram.
10. Deployment topology.

Use Mermaid syntax only, so the diagrams can be copied directly into Markdown documentation.

For each diagram:

* Add a short explanation before it.
* Keep the diagram readable.
* Use clear component names.
* Avoid overcomplicated diagrams.
* Show where LLMs, SLMs, rules engines, user profiles, context stores, and frontend SDKs fit.
