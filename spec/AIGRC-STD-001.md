# AIGRC-STD-001
# The AIGRC Standard Charter
### Governance, Conformance, and Institutional Framework
### for the AI Governance, Risk, and Compliance Open Standard

---

| Field | Value |
|---|---|
| **Standard ID** | AIGRC-STD-001 |
| **Title** | The AIGRC Standard Charter |
| **Status** | DRAFT — Not yet ratified. Subject to material revision. |
| **Version** | 0.1.0 |
| **Date** | February 2026 |
| **Authors** | PangoLabs Autonomous Systems Architecture Team |
| **License** | Apache License, Version 2.0 |
| **Repository** | aigrc.dev · github.com/aigrc/aigrc |
| **Supersedes** | None — inaugural version of this document |
| **Depends On** | None — foundational specification |
| **Classification** | Public — intended for external publication and community review |
| **Contact** | spec@aigrc.dev |

---

> **⚠ STATUS OF THIS MEMO**
>
> This document is a DRAFT specification. It has not yet been ratified by any governance body, submitted to an external standards organization, or adopted by any third party. It represents the founding intentions of the AIGRC specification effort, published openly to invite scrutiny, correction, and contribution.
>
> Implementors SHOULD NOT treat any part of this specification as stable until it reaches version 1.0.0 and is marked RATIFIED. The authors welcome disagreement, alternative framings, and evidence-based challenges to any claim made herein.
>
> The authoritative version of this document is always the most recent at `aigrc.dev/spec/std-001`.

---

## Table of Contents

- [Abstract](#abstract)
- [1. Introduction and Motivation](#1-introduction-and-motivation)
- [2. The Problem This Standard Addresses](#2-the-problem-this-standard-addresses)
- [3. Scope and Applicability](#3-scope-and-applicability)
- [4. Foundational Axioms](#4-foundational-axioms)
- [5. Definitions and Terminology](#5-definitions-and-terminology)
- [6. Standard Architecture](#6-standard-architecture)
- [7. Relationship to Existing Frameworks](#7-relationship-to-existing-frameworks)
- [8. Conformance and Implementation Claims](#8-conformance-and-implementation-claims)
- [9. The Open/Commercial Distinction](#9-the-opencommercial-distinction)
- [10. Governance of This Standard](#10-governance-of-this-standard)
- [11. Versioning Policy](#11-versioning-policy)
- [12. Contribution and Community Process](#12-contribution-and-community-process)
- [13. Known Limitations and Honest Challenges](#13-known-limitations-and-honest-challenges)
- [14. Mitigations and Ongoing Work](#14-mitigations-and-ongoing-work)
- [15. Intellectual Property](#15-intellectual-property)
- [16. The Path to Institutional Recognition](#16-the-path-to-institutional-recognition)
- [Appendix A. Glossary of Terms](#appendix-a-glossary-of-terms)
- [Appendix B. Regulatory Framework Index](#appendix-b-regulatory-framework-index)
- [Appendix C. RFC 2119 Keyword Usage](#appendix-c-rfc-2119-keyword-usage)
- [Appendix D. Document History and Change Log](#appendix-d-document-history-and-change-log)

---

## Abstract

The AI Governance, Risk, and Compliance specification — AIGRC — is an open standard for the governance of artificial intelligence systems across all domains where AI solutions and AI agents are implemented to serve people, organizations, and society. This document, AIGRC-STD-001, is the Standard Charter: the foundational specification that defines what AIGRC is, who governs it, how it relates to existing frameworks, and under what terms it may be implemented, extended, or referenced.

AIGRC addresses a structural gap that existing AI governance frameworks do not: the absence of governance infrastructure that operates at the moment AI systems are built and continues operating at runtime, rather than being applied retrospectively at audit. The standard is organized around three axioms — Verification Asymmetry, the Golden Thread, and Runtime Physics — which together establish that governance must be a property of an AI system, not a process that system passes through.

This document is intended to be read by standards practitioners, compliance professionals, enterprise architects, regulators, and the developers who will implement AIGRC-conformant tools. It is written with awareness that the standard will be scrutinized by parties with legitimate reasons to be skeptical of vendor-originated specifications, and it addresses those concerns directly rather than avoiding them.

**Keywords:** AI governance; autonomous agents; agentic AI; risk classification; EU AI Act; NIST AI RMF; ISO 42001; open standard; shift-left governance; runtime enforcement; AI Asset Card; Golden Thread; compliance infrastructure

---

## 1. Introduction and Motivation

### 1.1 The Occasion for This Standard

Enterprise software has developed mature disciplines for managing risk in production systems. Security has DevSecOps. Reliability has Site Reliability Engineering. Financial risk has model risk management. Each discipline emerged when the cost of failure exceeded the cost of prevention, and when the failure modes became systematic rather than isolated.

AI systems across every domain — healthcare, financial services, education, media, logistics, civic infrastructure, consumer services, and beyond — have reached that threshold. The deployment of autonomous and agentic AI is accelerating faster than the governance infrastructure that should accompany it. The consequences of misaligned, ungoverned, or simply undocumented AI behavior are no longer theoretical — they accumulate in consequential decisions made without accountability, in operational failures with no recoverable audit trail, and in the erosion of public and institutional trust in AI deployment generally. These consequences do not respect industry boundaries. They follow the presence of consequential AI, wherever it operates.

The frameworks that exist to address this — NIST AI RMF, ISO 42001, the EU AI Act's risk classification requirements — provide essential conceptual scaffolding. What they do not provide is the technical infrastructure that makes governance operational at the level of individual systems, individual deployments, and individual decisions made by autonomous agents at runtime. This gap between governance concept and governance execution is the occasion for the AIGRC standard.

### 1.2 What AIGRC Is

AIGRC is a technical specification for AI governance infrastructure. It defines *what* governance artifacts AI systems must carry, *how* those artifacts are structured, *when* governance enforcement must occur, and *what* a third party may legitimately verify about a system that claims AIGRC conformance. It is not a risk management philosophy, an ethics framework, or a compliance checklist. It is an engineering specification for governance-as-infrastructure.

AIGRC is organized as a family of specifications. AIGRC-STD-001 (this document) is the charter: it establishes governance of the standard itself. AIGRC-STD-002 defines the core schema library. AIGRC-STD-003 provides the multi-jurisdiction regulatory mapping. AIGRC-STD-004 defines conformance and certification levels. Together, these four documents constitute the AIGRC Standard.

### 1.3 What AIGRC Is Not

> **ℹ Important Distinction**
>
> AIGRC is not a compliance framework. Compliance frameworks describe obligations. AIGRC describes infrastructure for meeting those obligations. The distinction matters: an organization can be compliant with the EU AI Act without using AIGRC, just as a building can meet fire safety codes without using any particular fire suppression brand.
>
> AIGRC is not a product. PangoLabs operates AIGOS, a commercial platform that implements AIGRC. AIGRC itself is not a product — it is a standard that any tool, platform, or implementation may conform to independently of any commercial relationship with PangoLabs.

AIGRC is also not a substitute for legal counsel, regulatory advice, or the substantive expertise required to assess whether a specific AI deployment meets specific regulatory requirements. The standard provides infrastructure for governance; the judgment about what governance is required in a specific context remains the responsibility of qualified professionals.

### 1.4 The Audience for This Document

This document is written for multiple audiences simultaneously, which creates tension that the authors have chosen to accept rather than resolve by writing separate documents:

- **Standards practitioners** who will evaluate AIGRC against established criteria for what constitutes a legitimate technical standard.
- **Compliance and legal professionals** across all domains who need to assess whether AIGRC-conformant tools satisfy their governance obligations, whether those obligations arise from regulation, organizational policy, contractual commitment, or ethical accountability.
- **Enterprise architects and engineers** who will implement AIGRC-conformant tooling or build against AIGRC schemas.
- **Regulators and policy makers** who may reference or incorporate AIGRC in regulatory guidance.
- **Skeptics and critics** who have legitimate questions about the origin, objectivity, and limitations of a standard produced by a commercial entity. Section 13 is written specifically for this audience.

The authors hold that intellectual honesty requires acknowledging uncertainty, naming weaknesses, and engaging with challenges rather than dismissing them. A standard that cannot withstand its own honest examination is not yet ready to be published. This document is being published in draft precisely because it benefits from external scrutiny before reaching the claims that ratification implies.

### 1.5 Normative Language

This specification uses the key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in accordance with **RFC 2119** (Bradner, 1997). See Appendix C for the complete definitions. These keywords appear in **bold** throughout the document to distinguish normative requirements from explanatory prose.

---

## 2. The Problem This Standard Addresses

### 2.1 The Governance Gap

Current AI governance practice clusters at two extremes: organizations that treat AI governance as a documentation exercise — producing policy documents that describe intended behavior while running deployed systems without systematic behavioral constraints — and organizations that have deferred AI deployment entirely pending clarity on what adequate governance requires. This pattern repeats across healthcare and financial services, but equally across media companies making editorial decisions by algorithm, logistics operators routing consequential outcomes by model output, and consumer platforms shaping behavior at scale. The domain varies; the structural governance gap does not.

Between these extremes, a middle position is largely absent: organizations operating AI systems with governance infrastructure that is proportionate to the risk those systems represent, embedded in the systems themselves rather than stored in policy repositories, and verifiable by parties other than the deploying organization. AIGRC is designed to make this middle position occupiable at scale.

### 2.2 The Verification Asymmetry

> **Foundational Observation**
>
> The cost of verifying that an AI system behaves within declared governance boundaries is lowest at the moment of creation and increases by orders of magnitude at each subsequent stage — code review, pre-deployment testing, post-deployment audit, regulatory examination. This asymmetry is structural, not incidental. It follows from the nature of complex systems: the further a decision point is from the original design, the more context must be reconstructed to evaluate it.

This observation — which the authors term the Verification Asymmetry — has a direct implication for governance infrastructure: governance mechanisms embedded at creation time are not merely more convenient than governance applied at audit time. They are fundamentally different in kind. A system that was built with its governance constraints embedded produces verifiable evidence of governance as a byproduct of operation. A system that is governed retrospectively at audit produces documentation that describes intended behavior, which may or may not correspond to actual behavior.

Most existing AI governance tools are optimized for retrospective verification. They provide dashboards, audit logs, and compliance reports — all of which describe what happened. AIGRC is concerned with what *will* happen: with the enforcement infrastructure that constrains AI behavior in the first place, making the audit log a secondary artifact of operation rather than the primary governance instrument.

### 2.3 The Orphan Agent Problem

As organizations deploy increasingly autonomous AI systems — particularly in multi-agent architectures where agents spawn subordinate agents, invoke external tools, and operate across extended time horizons — a structural accountability problem emerges: AI systems that were authorized to exist for a specific purpose continue to operate after that purpose has expired, after the team that built them has disbanded, or after the business conditions that justified them have changed. These systems — which the AIGRC standard terms **Orphan Agents** — represent a governance failure that no post-deployment monitoring tool can fully address, because the authorization context required to evaluate their ongoing operation no longer exists in recoverable form.

AIGRC addresses the Orphan Agent problem through the **Golden Thread** requirement: the cryptographic linkage of every AI system to the specific business intent that authorized its creation, maintained as a tamper-evident record across the system's operational lifetime. An agent without a Golden Thread cannot be deployed in an AIGRC-governed environment. An agent whose Golden Thread links to a closed or expired business authorization triggers an automatic lifecycle review.

### 2.4 The Agentic Explosion

The governance problem addressed by AIGRC is not static. The market for autonomous AI agents is growing at a rate that makes the development of governance infrastructure urgent rather than merely advisable. Research and industry projections consistently anticipate multi-billion-scale deployment of autonomous agents across enterprise environments by the end of this decade. These agents will exhibit characteristics that make traditional governance approaches insufficient:

- **Non-determinism:** Agent behavior at inference time cannot be predicted from static code analysis. Governance must operate at runtime, not only at build time.
- **Recursive spawning:** Agents that spawn subordinate agents create governance lineage problems that compound with each generation unless lineage tracking is built into the foundational infrastructure.
- **Extended autonomy:** Agents operating over hours, days, or weeks on complex tasks require governance mechanisms that persist and adapt, not single-point authorization decisions.
- **Cross-organizational trust:** Multi-agent systems increasingly span organizational boundaries, requiring trust infrastructure analogous to TLS for web services — without which, inter-agent interactions cannot be governed.

AIGRC is designed to govern this class of AI system, not the simpler class of batch inference pipelines or single-turn language model integrations that most existing governance tools address.

### 2.5 Why Existing Standards Are Insufficient (and Why That Matters)

The authors wish to be precise here, because imprecision on this point would undermine the credibility of the entire specification: existing frameworks are not insufficient because they are poorly designed. NIST AI RMF, ISO 42001, and the EU AI Act represent genuine advances in how organizations think about AI governance. They are insufficient for AIGRC's purposes for a specific structural reason: they define obligations and principles without specifying the technical infrastructure that fulfills those obligations.

The NIST AI RMF tells organizations to "monitor" their AI systems and to "govern" their AI lifecycle. It does not specify what monitoring infrastructure is required, what governance artifacts must be produced, or how conformance with its recommendations can be verified by a third party. ISO 42001 establishes an AI management system standard with auditable requirements — a genuine contribution — but focuses on organizational processes rather than technical implementation. The EU AI Act imposes specific obligations on high-risk AI systems but delegates technical specification to harmonized standards that are still being developed.

AIGRC's role in this landscape is not to compete with these frameworks but to implement them: to provide the technical specification layer that sits between regulatory obligation and operational deployment, making the obligations of NIST, ISO, and the EU AI Act technically fulfillable in a verifiable, consistent, and audit-ready way.

---

## 3. Scope and Applicability

### 3.1 In Scope

The AIGRC standard applies to the following classes of AI systems and deployment contexts:

- **Autonomous AI agents:** Systems that perceive their environment, make decisions, and take actions without continuous human direction. This includes both single-agent systems and multi-agent architectures.
- **AI systems deployed across all applicable domains:** Financial services, healthcare, government, legal, insurance, education, media, logistics, civic infrastructure, consumer services, and any other domain where AI system behavior has consequential impact on the people it serves. AIGRC's scope is defined by the presence of consequential impact, not by the existence of a formal regulatory regime.
- **AI systems with consequential outputs:** Systems whose outputs directly influence decisions that affect human welfare, financial position, legal standing, or access to services.
- **Organizations building AI governance tooling:** Tools, platforms, and frameworks that claim to support AI governance and wish to use AIGRC conformance claims to substantiate those capabilities.

### 3.2 Out of Scope

The following are explicitly outside the scope of the AIGRC standard at this version:

- **AI research systems:** Experimental systems not deployed to production environments with real consequential impact are not within scope. AIGRC governs deployed systems, not research prototypes.
- **Embedded AI in consumer products:** Recommendation systems, content feeds, and similar applications at consumer scale are not currently addressed. The standard may be extended to this domain in future versions.
- **Foundation model training:** The governance of model training processes, pre-training safety procedures, and model alignment during development is not within AIGRC's scope. AIGRC governs the deployment and operation of trained models, not their production.
- **Ethics certification:** AIGRC does not certify that an AI system is "ethical" in any substantive sense. Ethical certification requires judgment that cannot be reduced to conformance with a technical specification. AIGRC certifies that governance infrastructure is present and operational.

### 3.3 Applicability by Jurisdiction

AIGRC is designed to be jurisdiction-agnostic at its core while supporting jurisdiction-specific policy mapping through AIGRC-STD-003. The core schemas and conformance requirements defined in AIGRC-STD-001 and AIGRC-STD-002 impose no jurisdiction-specific obligations. The regulatory mapping layer in AIGRC-STD-003 provides mappings between AIGRC policy primitives and specific regulatory frameworks, which implementors may selectively incorporate based on their deployment context.

This architecture means that a tool or platform can conform to the AIGRC core standard without implementing any specific jurisdiction's regulatory mapping — and can add jurisdiction-specific compliance capabilities incrementally without breaking core conformance.

---

## 4. Foundational Axioms

The AIGRC standard is organized around three axioms. These are not arbitrary design choices — they are empirical observations about how AI governance fails and what infrastructure is required to prevent that failure. Implementors who understand these axioms will understand why specific normative requirements exist; implementors who do not may find individual requirements difficult to justify in isolation.

### Axiom I — Verification Asymmetry

> **The cost of verifying governance conformance is lowest at creation and increases by at least one order of magnitude at each subsequent stage of the AI lifecycle. Governance infrastructure MUST therefore be embedded at creation time.** Post-hoc governance — the application of governance analysis to systems that were not built with governance infrastructure — is not merely expensive; it is structurally incomplete because the decision context that would make verification meaningful no longer exists in recoverable form.

The practical implication of Verification Asymmetry is that AIGRC requires governance artifacts to be produced at the time AI systems are created, not at the time they are audited. An AI Asset Card produced retroactively is not equivalent to an AI Asset Card produced at design time — the retroactive artifact describes what a developer believes they built; the design-time artifact constrains what they are allowed to build.

### Axiom II — The Golden Thread

> **Every AI system deployed in a governed environment MUST be cryptographically linked to the specific business intent that authorized its creation.** This linkage — the Golden Thread — MUST be tamper-evident, MUST be verifiable by parties other than the deploying organization, and MUST remain accessible for the operational lifetime of the system plus the applicable records-retention period for the deployment jurisdiction. An AI system without a Golden Thread is an orphan: it has no organizational accountability anchor, and its continued operation cannot be justified to any external examiner.

The Golden Thread concept is operationalized through the **AI Asset Card** — a structured document (defined in AIGRC-STD-002) that records the purpose, risk classification, ownership, business justification, and operational constraints of an AI system. Asset Cards are produced at design time, updated at each significant lifecycle event, and signed cryptographically at each update to produce a tamper-evident history. The business justification field **MUST** reference an auditable business record — typically a work item in a project management system — that establishes organizational authorization for the system's existence.

### Axiom III — Runtime Physics

> **Static analysis — the examination of AI systems prior to deployment — is insufficient governance for autonomous agents.** Systems that reason, plan, and act in response to dynamic environmental inputs cannot be fully characterized by examining their code, their training data, or their pre-deployment test results. Governance **MUST** therefore include a runtime enforcement layer: a mechanism that constrains AI system behavior in real time, against declared policy, at the moment of each consequential decision.

Runtime Physics does not imply that static analysis is worthless — it is a necessary complement to runtime governance, and AIGRC requires both. The axiom establishes that static analysis alone is insufficient: a system that passes all pre-deployment governance checks but has no runtime constraint mechanism is not a governed system. It is a system with documented intentions and no enforcement.

---

## 5. Definitions and Terminology

The following definitions apply throughout the AIGRC specification family. Where a term appears elsewhere in industry literature with a different meaning, the AIGRC definition takes precedence within this specification.

| Term | Definition |
|---|---|
| **AI Asset Card** | A structured document produced at AI system design time that records the system's identity, purpose, ownership, risk classification, business justification, operational constraints, and governance history. Defined in AIGRC-STD-002. Analogous to a technical data package for a physical asset. |
| **AI System** | Any software component that uses machine learning inference to produce outputs that influence decisions, actions, or recommendations in a production environment. Includes but is not limited to language models, autonomous agents, classification systems, and recommendation engines. |
| **Agentic AI / Agent** | An AI system that perceives its environment, maintains state across multiple inference steps, selects actions, and executes those actions with some degree of autonomy. Distinguished from single-turn inference systems by persistence, action-taking, and non-deterministic behavior over time. |
| **AIGRC** | AI Governance, Risk, and Compliance. The open standard defined by this specification family. |
| **AIGRC-Conformant** | A tool, platform, system, or organization that implements the normative requirements of the AIGRC specification at the claimed conformance level (see AIGRC-STD-004). Conformance is always claimed at a specific level and must be substantiated by verifiable evidence. |
| **Capability Decay** | The structured reduction of an AI system's authorized capabilities over time as its operational context changes. An agent authorized to access a database in support of a specific project loses that authorization when the project closes, unless the authorization is explicitly renewed. |
| **Certified Governed Agent (CGA)** | An AI agent that has been certified to AIGRC-STD-004 by a recognized Certification Authority. CGAs carry cryptographically signed certificates that attest to their governance posture, analogous to TLS certificates for web servers. |
| **Conformance Level** | One of four levels (BRONZE, SILVER, GOLD, PLATINUM) defined in AIGRC-STD-004 that describe the depth and verifiability of governance implementation. Each level is a superset of all lower levels. |
| **Consequential Output** | An output of an AI system that directly influences a decision affecting human welfare, financial position, legal standing, access to services, or any outcome subject to regulatory oversight. |
| **Detection Engine** | A toolchain component that automatically identifies AI frameworks, model calls, and agent definitions in a codebase. The first surface at which AIGRC governance enforcement occurs. |
| **Golden Thread** | The cryptographic linkage between an AI system and the business intent that authorized its creation. Implemented as a tamper-evident chain of signed records connecting an AI Asset Card to an auditable business record. |
| **Governed Environment** | A deployment environment in which the AIGRC Runtime is active, policy bundles are enforced, and AI systems without valid Golden Thread linkage cannot operate. |
| **I2E Engine** | Intent-to-Enforcement Engine. The semantic bridge between human-language policy documents and machine-executable runtime enforcement constraints. Defined in SPEC-I2E-001. |
| **Kill Switch** | A mechanism by which an authorized human or governance system can immediately suspend the operation of an AI system and prevent its re-activation without explicit re-authorization. MUST be implemented for all AI systems at SILVER conformance and above. |
| **Orphan Agent** | An AI system operating in a production environment without a valid, current business authorization. Orphan Agents are the primary target of the Golden Thread requirement. |
| **Policy Bundle** | The compiled, machine-readable representation of governance constraints applicable to a specific AI system. Produced by the I2E Engine from human-language policy documents. Enforced by the AIGRC Runtime. |
| **Runtime Enforcement** | The application of governance constraints to AI system behavior at the moment of execution, not merely at pre-deployment review. Implemented by the AIGRC Runtime SDK. |
| **Shift-Left Governance** | The principle of applying governance mechanisms as early as possible in the AI development lifecycle — at design time and build time — rather than at review, deployment, or audit time. |
| **Verification Asymmetry** | The structural relationship between governance cost and lifecycle stage: the cost of verifying governance conformance increases by at least one order of magnitude at each stage after creation. See Axiom I. |

---

## 6. Standard Architecture

### 6.1 Overview

The AIGRC Standard is a family of four specifications, each addressing a distinct layer of the governance infrastructure. These specifications are hierarchically ordered: each depends on its predecessors but adds independent normative content. A tool or platform may conform to any subset of specifications, provided it does not claim conformance at a level that requires a specification it has not implemented.

| Specification | Title | Audience | Status |
|---|---|---|---|
| AIGRC-STD-001 | The Standard Charter | Governance bodies, standards practitioners, legal | DRAFT |
| AIGRC-STD-002 | Core Schema Library | Engineers, tool builders, platform developers | BUILDING |
| AIGRC-STD-003 | Multi-Jurisdiction Regulatory Mapping | Compliance professionals, regulators, legal | SPECIFIED |
| AIGRC-STD-004 | Conformance and Certification Levels | Auditors, procurement teams, enterprise architects | SPECIFIED |

### 6.2 AIGRC-STD-001: The Standard Charter (This Document)

The Standard Charter defines the governance of the AIGRC specification itself. It is the foundational document that must be ratified before any other specification in the family acquires normative force. It establishes: the governing body for the standard, the versioning policy, the conformance claim framework, the contribution process, and the relationship between the open standard and any commercial implementations.

### 6.3 AIGRC-STD-002: Core Schema Library

The Core Schema Library defines the canonical data structures that constitute AIGRC governance artifacts. Its primary normative content is the AI Asset Card schema: the structured record that every AI system under AIGRC governance must carry. It also defines risk taxonomy vocabularies, policy primitive types, and the governance configuration schema. AIGRC-STD-002 is implemented by the `@aigrc/core` npm package.

### 6.4 AIGRC-STD-003: Multi-Jurisdiction Regulatory Mapping

The Regulatory Mapping specification provides a maintained corpus of mappings between AIGRC policy primitives and the requirements of specific regulatory frameworks. For each supported jurisdiction and framework, it defines: which AIGRC policy primitives correspond to which regulatory obligations, what evidence an AIGRC-conformant system produces that satisfies each obligation, and the confidence level of each mapping (HIGH, MEDIUM, or PROVISIONAL).

The Regulatory Mapping is the most operationally complex specification in the family because it must track regulatory change continuously. Its governance model includes a standing Technical Committee responsible for monitoring regulatory developments and issuing mapping updates.

### 6.5 AIGRC-STD-004: Conformance and Certification Levels

The Conformance specification defines what it means to claim AIGRC conformance at each of four levels — BRONZE, SILVER, GOLD, and PLATINUM — and what verification is required to substantiate each claim. Each level is a superset of all lower levels. The specification also defines the Certification Authority architecture through which SILVER and above certifications are issued by bodies independent of the claiming organization.

---

## 7. Relationship to Existing Frameworks

### 7.1 The Positioning Problem

A new technical standard in a space already occupied by established frameworks from NIST, ISO, and the EU carries an inherent credibility burden. The burden is reasonable: the world does not need more governance frameworks. It needs governance infrastructure that makes existing frameworks operational. AIGRC's relationship to established frameworks is therefore complementary, not competitive — and this section describes that relationship with precision.

### 7.2 NIST AI Risk Management Framework (AI RMF)

The NIST AI RMF (2023) provides a voluntary framework for managing AI risk organized around four functions: GOVERN, MAP, MEASURE, and MANAGE. It is the most widely referenced AI governance framework in US enterprise contexts. AIGRC complements NIST AI RMF as follows:

- **GOVERN:** AIGRC-STD-001 and the AIGRC governance model address organizational AI governance policies. AI Asset Cards provide the documented evidence of governance decisions that GOVERN requires.
- **MAP:** AIGRC-STD-003's regulatory mapping provides the structured risk context documentation that MAP requires. Risk classification at the level of specific system attributes — not just categorical assessment — is built into the AI Asset Card schema.
- **MEASURE:** AIGRC's runtime enforcement layer and audit stream provide continuous behavioral measurement against declared policy constraints. This operationalizes MEASURE more completely than monitoring dashboards alone can achieve.
- **MANAGE:** The Kill Switch, Capability Decay, and CGA revocation mechanisms provide the MANAGE function's requirement for response capabilities, including the ability to immediately suspend non-conforming systems.

> **ℹ Conformance Note**
>
> Implementing AIGRC at GOLD conformance level provides documented evidence that addresses a significant proportion of NIST AI RMF guidance. The precise mapping is documented in AIGRC-STD-003. AIGRC does not claim to be a substitute for NIST AI RMF compliance assessment; it claims to provide infrastructure that makes that assessment substantive rather than documentary.

### 7.3 ISO/IEC 42001: AI Management Systems

ISO 42001 (2023) establishes requirements for an AI management system — an organizational framework for responsible AI development and use. It follows the ISO high-level structure shared with ISO 27001 and ISO 9001, and is designed to be used as the basis for third-party certification of organizational AI governance practices.

AIGRC's relationship to ISO 42001 is analogous to the relationship between security tooling and ISO 27001: ISO 42001 certifies that the right processes exist; AIGRC provides the technical infrastructure that those processes operate through. An organization certified to ISO 42001 that also implements AIGRC at GOLD level has both the management system (what ISO 42001 certifies) and the technical infrastructure that makes that system operational (what AIGRC provides). The AI Asset Card produced by AIGRC tooling constitutes documented evidence for multiple ISO 42001 requirements.

### 7.4 EU Artificial Intelligence Act

The EU AI Act (2024) imposes binding obligations on providers and deployers of AI systems based on a risk classification tiering — Unacceptable Risk (prohibited), High Risk (subject to conformity assessment and registration requirements), Limited Risk (transparency obligations), and Minimal Risk. AIGRC's risk classification in AIGRC-STD-002 is designed to align with the EU AI Act's risk categories while providing finer-grained classification at the technical level.

For High Risk AI systems under the EU AI Act, AIGRC-conformant tooling addresses several specific obligations: Article 9 (risk management systems) through the policy bundle and runtime enforcement architecture; Article 12 (logging) through the tamper-evident audit stream; Article 13 (transparency) through the AI Asset Card and public-facing documentation requirements; and Article 14 (human oversight) through the Human Gate mechanism and Kill Switch requirements.

> **⚠ Regulatory Caution**
>
> The EU AI Act's implementing regulations and harmonized standards are still being developed as of this writing. AIGRC-STD-003's EU AI Act mapping will be updated as implementing guidance is published. Organizations relying on AIGRC for EU AI Act compliance MUST verify that the applicable mapping version reflects current regulatory guidance and MUST consult qualified legal counsel for jurisdiction-specific compliance assessment.

### 7.5 Financial Services Regulations

In financial services, AI governance intersects with multiple regulatory frameworks that vary by jurisdiction: SR 11-7 (Model Risk Management, US Federal Reserve); EBA Guidelines on Internal Governance; MiFID II algorithmic trading requirements; and Basel III operational risk frameworks. AIGRC-STD-003 provides mappings for each of these frameworks where AIGRC policy primitives can be mechanically mapped to specific regulatory requirements.

The Federal Reserve's SR 11-7 guidance on model risk management is particularly well-aligned with AIGRC's architecture: its requirements for model documentation, independent validation, and ongoing monitoring correspond closely to the AI Asset Card, CGA certification, and runtime audit stream respectively.

### 7.6 Other AI Governance Initiatives

Several other governance initiatives deserve acknowledgment. The Partnership on AI's ABOUT ML project focuses on documentation practices for machine learning systems. The IEEE's work on Ethically Aligned Design addresses values in AI system design. The Model Cards methodology (Mitchell et al., 2019) pioneered structured documentation for AI models. AIGRC draws on these initiatives — particularly the documentation practices developed by ABOUT ML and Model Cards — while extending them with normative enforcement requirements and a runtime governance layer.

---

## 8. Conformance and Implementation Claims

### 8.1 What Conformance Means

AIGRC conformance is always a specific claim, not a general one. A conformance claim MUST specify: (a) which specification in the AIGRC family the claim refers to; (b) which conformance level is being claimed (for AIGRC-STD-004 claims); (c) what evidence substantiates the claim; and (d) whether the claim has been verified by an independent Certification Authority or is self-attested.

Vague conformance claims — "this product supports AIGRC" or "we are AIGRC-compliant" — are not legitimate AIGRC conformance claims. They fail the specificity requirement and MUST NOT be made.

> **✅ Conformance Claim Template**
>
> "[Product/System Name] conforms to AIGRC-STD-002 Core Schema Library at version [X.Y.Z], as verified by [self-attestation / CA Name] on [date]. Evidence package available at [URI]."

### 8.2 Conformance Levels

| Level | Verification | Key Requirements | Appropriate For |
|---|---|---|---|
| **BRONZE** | Self-attestation | AI Asset Cards produced; risk classification applied; Golden Thread linkage documented; basic audit logging | Internal tooling; development environments; initial compliance posture |
| **SILVER** | CA-verified | All BRONZE requirements; runtime enforcement active; Kill Switch implemented; independent CA review of governance artifacts | Production systems; consequential AI deployment; vendor attestation to clients and partners |
| **GOLD** | CA-verified + audit | All SILVER requirements; AIGRC-STD-003 regulatory mapping applied; periodic independent audit of runtime behavior; CGA certificate maintained | High-risk AI systems; enterprise procurement; regulatory examination contexts |
| **PLATINUM** | Full third-party | All GOLD requirements; continuous third-party monitoring; public attestation; recursive governance (governing systems that govern other systems) | Critical infrastructure; sovereign AI deployment; reference implementations |

### 8.3 The Self-Attestation Problem

The authors acknowledge directly that BRONZE self-attestation — where an organization certifies its own conformance without external verification — creates a verification gap. A BRONZE-conformant system has produced AI Asset Cards and applied risk classification, but the accuracy and completeness of those artifacts has not been verified by any party independent of their producer.

This gap is not unique to AIGRC. Every standard with a self-attestation tier faces it. The authors' position is that incomplete governance infrastructure, honestly documented through self-attestation, is preferable to either false claims of rigor or no documentation at all. BRONZE conformance is designed to be a genuine starting point — one that produces real governance artifacts with real value — not a governance theater endpoint.

Organizations for whom BRONZE conformance is the appropriate compliance posture should be transparent with their stakeholders about what self-attestation does and does not certify. Organizations operating AI systems with significant consequential impact on the people they serve should consider SILVER or above as their target, regardless of whether a formal regulatory requirement currently mandates it.

---

## 9. The Open/Commercial Distinction

### 9.1 Why This Section Exists

AIGRC is published by PangoLabs Autonomous Systems, a commercial entity that develops AIGOS — an AI governance platform that implements AIGRC. This creates a potential conflict of interest that the authors believe must be addressed directly rather than by assertion.

The concern is legitimate: a standard produced by a vendor whose commercial success depends on adoption of that standard has incentives to write the standard in ways that favor the vendor's implementation. This is a well-documented problem in the history of technical standardization. The authors do not ask readers to accept PangoLabs' good intentions as a sufficient answer to this concern. Instead, this section describes the structural safeguards that govern the relationship between AIGRC and AIGOS.

### 9.2 The Structural Separation

The AIGRC standard and the AIGOS platform are structurally separate in the following ways, each of which is binding on PangoLabs:

- **Independent licensing:** AIGRC is licensed under Apache 2.0. PangoLabs irrevocably grants the right to implement, extend, and commercially deploy AIGRC-conformant tools and platforms without royalty or license fee to PangoLabs.
- **Schema neutrality:** AIGRC-STD-002 schemas are published as JSON Schema and are not tied to any PangoLabs API, data model, or product architecture. Any implementation that conforms to the schemas is equally AIGRC-conformant regardless of its commercial relationship with PangoLabs.
- **Certification independence:** The AIGRC Certification Authority framework (AIGRC-STD-004) is designed to support multiple independent CAs. PangoLabs operates one CA; the standard explicitly supports and encourages additional CAs operated by independent organizations, academic institutions, and regulatory bodies.
- **Governance representation:** The AIGRC Technical Steering Committee (see Section 10) is constituted with seats allocated to non-PangoLabs members. PangoLabs holds a permanent seat and initial chair position for the founding period, with a mandatory transition to neutral governance within 24 months of ratification.

### 9.3 What PangoLabs Retains

Intellectual honesty requires stating what PangoLabs retains as well as what it relinquishes. PangoLabs retains:

- **Commercial advantage through implementation quality:** The AIGOS platform is PangoLabs' commercial implementation of AIGRC. Its quality, support, and feature set relative to other implementations is a legitimate competitive differentiator.
- **The initial authorship advantage:** As the author of the specification, PangoLabs has the deepest knowledge of the design decisions and their rationale. This is a real, temporary advantage.
- **The right to charge for services:** AIGRC tooling, Certification Authority services, regulatory mapping updates, and advisory services are not free. PangoLabs charges for these; nothing in the standard prevents this.

> **ℹ The Honest Framing**
>
> The history of technical standards includes many successful specifications that began as vendor proposals — TCP/IP, Ethernet, HTML, OpenAPI. What distinguishes successful open standards from vendor lock-in dressed as openness is not the absence of commercial interest but the presence of structural safeguards that prevent the commercial interest from distorting the standard. This section describes those safeguards. Readers who find them insufficient are encouraged to engage with the governance process described in Section 10 to propose additional ones.

---

## 10. Governance of This Standard

### 10.1 Governing Body

The AIGRC standard is governed by the AIGRC Technical Steering Committee (TSC). The TSC is responsible for: ratifying new versions of specifications in the AIGRC family; adjudicating disputes about conformance claim legitimacy; approving new Certification Authorities; and managing the transition from PangoLabs-led governance to neutral governance.

### 10.2 TSC Composition (Founding Period)

During the founding period — defined as the 24 months following initial ratification of AIGRC-STD-001 at version 1.0.0 — the TSC is constituted as follows:

- **Three seats:** PangoLabs representatives (including the initial chair).
- **Two seats:** Representatives nominated by organizations that have implemented AIGRC-conformant tooling and are not affiliated with PangoLabs.
- **Two seats:** Representatives from academic institutions with AI governance research programs, nominated by the implementing organization seats.
- **One seat:** Representative from a regulatory body or government agency, invited to participate in an advisory capacity.

Voting on specification changes requires a simple majority of filled seats. PangoLabs votes are not treated as a block — each PangoLabs seat votes independently. No single organization may hold more than three seats.

### 10.3 Transition to Neutral Governance

No later than 24 months after ratification of AIGRC-STD-001 at version 1.0.0, the TSC MUST initiate a governance transition process. The target state is stewardship by a neutral standards body — either an existing organization (such as the Linux Foundation, OASIS, or W3C) or a purpose-created AIGRC Foundation. The transition MUST result in PangoLabs holding no more than 20% of TSC voting seats.

> **✅ Accountability Mechanism**
>
> If the governance transition has not been initiated within 24 months of version 1.0.0 ratification, the Apache 2.0 license terms that already apply to the specification provide any party with the right to fork the specification and pursue their own governance structure. This is not a theoretical backstop — it is an intentional accountability mechanism. The community's ability to fork removes PangoLabs' ability to block the transition indefinitely.

### 10.4 Decision-Making Process

The AIGRC specification uses a consensus-seeking, vote-if-necessary process for significant decisions:

1. A specification change is proposed as a GitHub Pull Request against the relevant specification document.
2. The proposal is open for community comment for a minimum of 30 days.
3. The TSC reviews the proposal and community feedback in a public meeting.
4. The TSC attempts to reach consensus. If consensus is not reached within 14 days of the review meeting, a formal vote is held.
5. Approved changes are merged and tagged with a new version number following the versioning policy in Section 11.

---

## 11. Versioning Policy

### 11.1 Semantic Versioning for Standards

AIGRC specifications use a versioning scheme adapted from Semantic Versioning (SemVer) for the specific constraints of open standards. The version number has the form MAJOR.MINOR.PATCH, with the following meanings in the standards context:

- **MAJOR version increment:** A change that breaks backwards compatibility in conformance claims. Implementations conformant with version N.x.x are not guaranteed to be conformant with version (N+1).x.x. MAJOR increments REQUIRE a deprecation period of at least 12 months during which both versions are simultaneously supported.
- **MINOR version increment:** A change that adds new normative requirements without breaking conformance for existing implementations. All implementations conformant with version N.0.0 MUST remain conformant with version N.M.0 for any M > 0, unless they choose to adopt new optional requirements.
- **PATCH version increment:** Editorial clarifications, correction of errors in non-normative text, and corrections to clearly unintended normative text. No implementation changes are required.

### 11.2 Pre-Ratification Versioning

Specifications in DRAFT status use the version prefix 0.x.x. No conformance claims may be based on specifications at version 0.x.x. The transition from DRAFT (0.x.x) to RATIFIED (1.0.0) requires explicit TSC ratification vote.

### 11.3 Long-Term Support Versions

MAJOR versions that are designated Long-Term Support (LTS) versions receive security-relevant PATCH updates for a minimum of five years after their designation. The TSC designates LTS versions at the time of MAJOR version release. At least one LTS version MUST be supported at all times.

### 11.4 Deprecation Policy

Normative requirements deprecated in a MINOR version MUST be removed no earlier than the next MAJOR version. Organizations relying on deprecated requirements MUST migrate before the MAJOR version release. The deprecation notice MUST include a migration path specification.

---

## 12. Contribution and Community Process

### 12.1 Who May Contribute

The AIGRC specification is openly developed. Any individual or organization may contribute to any specification in the AIGRC family, subject to the Contributor License Agreement described in Section 12.3. Contributions are evaluated on technical merit, clarity, and alignment with the foundational axioms — not on the contributor's commercial relationship with any party.

### 12.2 Types of Contribution

The following types of contribution are recognized and welcomed:

- **Specification amendments:** Proposed changes to normative requirements, submitted as pull requests with supporting rationale.
- **Regulatory mapping updates:** Additions or corrections to AIGRC-STD-003 jurisdiction mappings, particularly from practitioners with direct regulatory expertise in specific jurisdictions.
- **Implementation reports:** Documentation of AIGRC implementation experiences — including failures, unexpected obstacles, and required clarifications — which inform specification improvements.
- **Conformance test cases:** Test specifications that allow implementors to verify their conformance independently.
- **Scholarly critique:** Peer-reviewed analysis of the specification's design decisions, theoretical foundations, or empirical adequacy. The authors regard rigorous critique as a contribution of the highest value.

### 12.3 Contributor License Agreement

All contributors to the AIGRC specification MUST agree to the AIGRC Contributor License Agreement (CLA) before their contributions can be merged. The CLA grants PangoLabs (and subsequently, the neutral governance body) the right to use, modify, and relicense contributions under Apache 2.0. Contributors retain copyright in their contributions. The CLA is designed to prevent patent encumbrance of the specification and is based on the Apache Software Foundation's individual and corporate CLA templates.

### 12.4 Community Channels

The AIGRC community operates through the following channels, all publicly accessible:

- **Primary repository:** `github.com/aigrc/aigrc`
- **Issue tracker:** `github.com/aigrc/aigrc/issues`
- **Discussion forum:** `github.com/aigrc/aigrc/discussions`
- **Specification website:** `aigrc.dev/spec`
- **Mailing list:** `spec@aigrc.dev`

---

## 13. Known Limitations and Honest Challenges

This section is written for the skeptic, the regulator, the procurement professional, and the academic researcher who approaches any vendor-originated specification with appropriate critical distance. The authors believe that a standard which cannot honestly account for its own limitations is not yet ready to be taken seriously. What follows is the most complete accounting we can offer of what AIGRC does not yet solve, may never solve, or solves imperfectly.

> **ℹ A Note on Tone**
>
> This section deliberately avoids the softening language common in standard disclaimers. "Limitations" are stated as limitations, not as "areas for future work." "Challenges" are acknowledged as challenges, not reframed as "opportunities." The authors believe this directness is more useful to potential implementors than diplomatic hedging.

### 13.1 The Vendor-Originated Standard Problem

**The Challenge**

AIGRC is authored by a company with commercial interests in its adoption. No structural safeguard fully eliminates the resulting conflict of interest. Even with the governance commitments described in Sections 9 and 10, PangoLabs wrote the first version of this document, made the foundational design decisions, and will benefit commercially from the standard's adoption. The community should verify these design decisions against its own assessment of the problem, not simply accept PangoLabs' framing.

**Our Assessment**

This limitation is real and cannot be argued away. We offer the following partial responses, which we believe are substantive but do not claim are complete: the Apache 2.0 license removes any barriers to forking or competing implementations; the governance transition commitment removes long-term control; the publication of this document in draft specifically invites the external critique that can correct our blind spots. The ultimate test of a vendor-originated standard is whether independent parties find it useful independently of the vendor. We do not yet know the answer to that question.

### 13.2 The Self-Attestation Adequacy Problem

**The Challenge**

BRONZE conformance — the entry level — is self-attested. An organization can produce AI Asset Cards that contain inaccurate or incomplete information, apply incorrect risk classifications, and claim BRONZE conformance. No external party verifies BRONZE claims. This means the floor of the conformance pyramid is structurally similar to the status quo: organizations documenting what they intend to do without external verification that they are doing it.

**Our Assessment**

BRONZE is designed as a genuine starting point, not a governance theater endpoint. Its value is not in external verification — it has none — but in forcing the creation of structured governance artifacts that can subsequently be audited. An organization with 50 AI systems and 50 BRONZE-certified Asset Cards is in a demonstrably better governance position than an organization with 50 AI systems and no structured documentation, even without external verification. That said, organizations should be transparent with their stakeholders about what BRONZE does and does not certify, and any organization deploying AI with significant consequential impact on people should treat SILVER or above as the appropriate target.

### 13.3 The Regulatory Mapping Confidence Problem

**The Challenge**

AIGRC-STD-003 provides mappings between AIGRC policy primitives and specific regulatory requirements. These mappings are produced by the AIGRC team through legal analysis and regulatory reading, not by the regulatory bodies themselves. Regulators have not endorsed these mappings. A regulator examining an AIGRC-conformant system is not obligated to accept the AIGRC mapping as a valid demonstration of compliance with their requirements.

**Our Assessment**

This is perhaps the most significant limitation in the current specification. The mappings in AIGRC-STD-003 are the authors' best good-faith interpretation of regulatory requirements and are explicitly marked with confidence levels. Organizations using AIGRC for regulatory compliance MUST verify the applicable mappings with qualified legal counsel and SHOULD engage directly with their regulators about whether AIGRC-conformant tools satisfy specific regulatory examination requirements. We are actively seeking regulatory engagement to validate and, where possible, co-produce mappings that regulatory bodies will recognize formally.

### 13.4 The Runtime Physics Implementation Gap

**The Challenge**

Axiom III requires runtime governance enforcement — constraints applied to AI behavior at the moment of execution. Implementing this for truly autonomous agents presents unsolved technical challenges: agents that operate over extended time horizons, across multiple execution environments, with dynamic tool access, and with emergent capability combinations are difficult to constrain reliably through a policy enforcement layer. The AIGRC Runtime SDK architecture addresses well-defined constraint types; it is less adequate for novel constraint types that emerge from agent capability combinations that were not anticipated at policy-writing time.

**Our Assessment**

The AIGRC Runtime is not a complete solution to the problem of governing advanced autonomous agents. It is the best practical implementation of runtime governance currently available, and it addresses the constraint types most commonly encountered in production deployments across enterprise, civic, and consumer contexts. The authors do not claim that a PLATINUM-certified system is immune to governance failures caused by unanticipated agent behavior. What PLATINUM certification can claim is that the governance infrastructure that current technical knowledge can provide is present and operational.

### 13.5 The Adoption Bootstrap Problem

**The Challenge**

For AIGRC to function as a standard, it must be adopted by multiple independent parties. At the time of publication, the only significant implementation is PangoLabs' own AIGOS platform, plus the open-source tools published at aigrc.dev. With seven stars on the primary repository, no independent CAs in operation, and no regulatory body referencing AIGRC in formal guidance, the standard has not yet demonstrated cross-organizational adoption. Claiming "standard ownership" as a competitive moat before demonstrating standard adoption is premature.

**Our Assessment**

This is accurate and we do not contest it. AIGRC is a specification in search of adoption, not a standard with established community. The gap between "well-designed specification" and "industry standard" is measured in years of adoption work, not months of specification drafting. We publish AIGRC-STD-001 in draft because the adoption work cannot begin until the specification is public, and the specification cannot become a standard until the adoption work succeeds. This is the correct order of operations, but it means that claims of "standard ownership" should be understood as statements of intent and direction, not present reality.

### 13.6 The Enforcement Scope Problem

**The Challenge**

AIGRC governance applies to AI systems that are deployed within a governed environment — one running the AIGRC Runtime. AI systems deployed outside governed environments are unaffected by AIGRC conformance requirements regardless of what their Asset Cards claim. An organization can be GOLD-certified for its governed fleet while operating ungoverned shadow AI in parallel. AIGRC has no mechanism to detect or prevent this.

**Our Assessment**

No governance standard can govern what it cannot see. AIGRC relies on organizational commitment to deploy AI systems through governed environments. The developer toolchain — VS Code extension, CLI, GitHub Action — creates enforcement points in the development workflow that make ungoverned deployment structurally harder. But "structurally harder" is not "structurally impossible." The ultimate defense against shadow AI is organizational culture and management accountability, which AIGRC supports but cannot substitute for.

---

## 14. Mitigations and Ongoing Work

Each challenge identified in Section 13 is accompanied here by the current and planned mitigations. These are stated as honestly as the limitations were: where mitigations are incomplete or unproven, that is said directly.

### 14.1 Vendor Conflict Mitigation

**Primary mitigation:** Governance transition commitment (Section 10.3) with Apache 2.0 fork rights as accountability backstop. **Secondary mitigation:** Publication of this document in draft specifically to attract the external critique that corrects vendor blind spots. **Tertiary mitigation:** Explicit design decision documentation in each specification, so reviewers can evaluate decisions on their merits rather than accepting them on authority.

**What remains unresolved:** The first version of each specification will bear the imprint of PangoLabs' perspective on the problem. Community engagement and external review are the only mitigations for this.

### 14.2 Self-Attestation Adequacy Mitigation

**Primary mitigation:** The conformance level structure makes the absence of external verification explicit. BRONZE is not described as "verified" — it is described as "self-attested," with explicit documentation of what self-attestation does and does not mean. **Secondary mitigation:** Conformance test cases (planned for Q3 2026) that allow BRONZE implementors to verify their own artifact quality against machine-readable criteria.

**What remains unresolved:** Self-attestation at BRONZE will always carry verification uncertainty. This is a design choice, not an oversight — the alternative is requiring external verification for all claims, which would create a significant barrier to adoption.

### 14.3 Regulatory Mapping Confidence Mitigation

**Primary mitigation:** Confidence level tagging in AIGRC-STD-003 (HIGH/MEDIUM/PROVISIONAL) communicates the authors' assessment of mapping reliability. Provisional mappings are flagged explicitly and require legal review before reliance. **Secondary mitigation:** Active regulatory engagement program — we are in discussions with regulatory bodies in the US, EU, and UK about mapping validation and, where possible, formal recognition. **Tertiary mitigation:** Community contribution process that allows domain practitioners across all sectors to correct and improve mappings based on direct implementation experience.

**Planned work:** A regulatory mapping Technical Committee with dedicated standing membership from practitioners in each mapped jurisdiction, tasked with quarterly review of mapping currency.

### 14.4 Runtime Physics Mitigation

**Primary mitigation:** The AIGRC Runtime architecture is designed for extensibility — new constraint types can be added without rebuilding the enforcement layer. The constraint type library will grow with the community's understanding of what autonomous agents do in production. **Secondary mitigation:** The Human Gate mechanism provides a fallback for scenarios where automated enforcement cannot be reliably specified — requiring human review for consequential decisions where automated constraint is inadequate.

**What remains unresolved:** The fundamental epistemological problem of governing systems that can reason about their own constraints remains open. AIGRC does not claim to have solved this; it claims to provide the best practical infrastructure currently available.

### 14.5 Adoption Bootstrap Mitigation

**Current actions:** Open-source tooling published under Apache 2.0; developer toolchain providing immediate practical value independent of commercial relationship; active engagement with enterprise early adopters in financial services and healthcare; developer community building through aigrc.dev. **Planned actions:** Formal submission to a neutral standards body (target: 12 months after AIGRC-STD-001 v1.0.0 ratification); academic partnership program with AI governance research institutions.

**What determines success:** The adoption bootstrap problem resolves when independent parties implement AIGRC-conformant tools because doing so is useful to them, not because of a relationship with PangoLabs. The authors are aware that this is not yet the case and that claiming otherwise would be false.

### 14.6 Enforcement Scope Mitigation

**Primary mitigation:** The developer toolchain creates detection points that surface AI assets at creation time, making shadow deployment harder to sustain accidentally. The GitHub Action governance gate blocks deployment of ungoverned assets in CI/CD pipelines — a meaningful friction point even if not an absolute barrier. **Secondary mitigation:** Organizational deployment policies that require all AI system deployments to pass through governed environments — a management accountability lever that AIGRC supports but cannot impose.

---

## 15. Intellectual Property

### 15.1 License

The AIGRC specification is published under the Apache License, Version 2.0. The full license text is available at `apache.org/licenses/LICENSE-2.0`. This license permits: use, reproduction, distribution, modification, sublicensing, and commercial use of the specification, without royalty or permission, subject to the attribution requirements of the license.

### 15.2 Patent Policy

PangoLabs commits to a royalty-free patent license for any patents owned or controlled by PangoLabs that are necessarily infringed by a conformant implementation of the AIGRC specification. This commitment is irrevocable for the lifetime of the specification and applies to all implementors regardless of their commercial relationship with PangoLabs.

Contributors to the specification are required to disclose known patents that would be necessarily infringed by their proposed contributions. The TSC may decline contributions where patent encumbrance cannot be resolved.

### 15.3 Trademark

The names "AIGRC" and the AIGRC logo are trademarks of PangoLabs Autonomous Systems. Use of these marks to describe conformant implementations is permitted under the following conditions:

- **BRONZE claims:** May describe a tool or system as "AIGRC-conformant (BRONZE, self-attested)" without further permission.
- **SILVER and above:** Require current certification from a recognized AIGRC Certification Authority.
- **The AIGRC standard itself:** May be referenced by name in any publication, regulation, or specification without permission.

---

## 16. The Path to Institutional Recognition

### 16.1 What Recognition Means and Doesn't Mean

The authors are frequently asked whether AIGRC will be submitted to ISO, NIST, IETF, or another established standards body for formal recognition. The honest answer is: we intend to pursue formal recognition, and we believe it is achievable, but we do not currently know which body is the right home or whether the standard will be adopted in its current form.

Formal recognition by an established body would substantially increase the regulatory and enterprise legitimacy of AIGRC-conformant tools. It is not, however, a prerequisite for value. OWASP is not a formal ISO standard; it is widely referenced in regulatory guidance. RFC specifications are not ISO standards; they govern the internet. Useful technical specifications can achieve significant institutional recognition without formal standards body adoption.

### 16.2 The Adoption Prerequisite

No standards body will adopt a specification that lacks demonstrable community adoption. The path to institutional recognition therefore runs through adoption, not directly through standards body engagement. The sequence is:

1. Publish AIGRC-STD-001 v1.0.0 (Ratified). Target: Q4 2026.
2. Achieve five or more independent implementations of AIGRC-conformant tools by organizations with no commercial relationship with PangoLabs. Target: 18 months post-ratification.
3. Achieve formal reference in regulatory guidance from at least one jurisdiction (EU, US, UK, or Canada). Target: 24 months post-ratification.
4. Submit to a neutral standards body for adoption. Target: after milestones 2 and 3 are met.

### 16.3 Regulatory Engagement Strategy

The regulatory engagement that leads to formal reference in guidance documents requires a different approach from developer community building. It requires: sustained relationship-building with regulatory staff (not just formal comment submissions); practical demonstration of how AIGRC-conformant tools satisfy specific examination requirements; and the patience to operate on regulatory timescales, which are measured in years rather than quarters.

PangoLabs is pursuing regulatory engagement through two channels: direct engagement with financial services regulators where the observability background provides established relationships, and academic partnership with AI governance research programs whose work regulators already read and cite.

### 16.4 The Standard's Honest Ambition

The vision for AIGRC, stated plainly, is to become the technical infrastructure layer that AI governance operates through — in every domain where AI systems make consequential decisions. The way TLS became the infrastructure layer for web security without most users knowing what it is or who wrote it. Not a brand. Not a compliance checklist. Not a framework restricted to domains with existing regulatory regimes. Infrastructure for any organization that builds AI to serve people and wants to do so accountably.

That vision is genuinely ambitious, and the gap between the current state — a draft specification with seven GitHub stars and one commercial implementation — and that vision is large. The authors hold it because we believe the problem it addresses is structurally important and because we have seen, in fifteen years of working at the intersection of institutions and complex technical systems, what happens when governance infrastructure arrives too late.

We are building the infrastructure. We are publishing it openly. We are inviting the scrutiny and contribution that turns a specification into a standard. Whether that effort succeeds depends on whether the problem we are solving is real enough, and our solution good enough, to earn adoption on its merits. We believe both are true. We welcome the examination that will test whether we are right.

---

## Appendix A. Glossary of Terms

*See Section 5 for primary definitions. This appendix provides additional terms used in the AIGRC specification family that are defined in referenced external documents.*

| Term | Definition |
|---|---|
| **AI RMF** | NIST Artificial Intelligence Risk Management Framework (NIST AI 100-1, 2023). |
| **EU AI Act** | Regulation (EU) 2024/1689 of the European Parliament and of the Council on Artificial Intelligence. |
| **ISO 42001** | ISO/IEC 42001:2023 — Information technology — Artificial intelligence — Management system. |
| **JSON Schema** | A vocabulary for annotating and validating JSON documents. IETF draft-bhutton-json-schema. |
| **MCP** | Model Context Protocol. An open protocol for tool integration with language model agents. |
| **RFC 2119** | Key words for use in RFCs to Indicate Requirement Levels. S. Bradner, 1997. |
| **SARIF** | Static Analysis Results Interchange Format. OASIS standard for static analysis tool output. |
| **SemVer** | Semantic Versioning 2.0.0. A versioning specification at semver.org. |
| **SR 11-7** | Guidance on Model Risk Management. US Federal Reserve and OCC, 2011. |
| **TLS** | Transport Layer Security. The cryptographic protocol securing internet communications. |

---

## Appendix B. Regulatory Framework Index

*The following regulatory frameworks are addressed in AIGRC-STD-003. This index provides the current mapping status and confidence level for each framework.*

| Framework | Jurisdiction | STD-003 Section | Mapping Status | Confidence |
|---|---|---|---|---|
| EU AI Act | European Union | STD-003 §4.1 | PARTIAL — implementing regulations pending | MEDIUM |
| NIST AI RMF | United States | STD-003 §4.2 | COMPLETE | HIGH |
| ISO/IEC 42001 | International | STD-003 §4.3 | COMPLETE | HIGH |
| SR 11-7 (Model Risk) | United States (FS) | STD-003 §5.1 | COMPLETE | HIGH |
| EBA AI Guidelines | European Union (FS) | STD-003 §5.2 | PARTIAL | MEDIUM |
| MiFID II Algo Trading | European Union (FS) | STD-003 §5.3 | PARTIAL | MEDIUM |
| HIPAA / HITECH | United States (HC) | STD-003 §6.1 | COMPLETE | HIGH |
| FDA SaMD Guidance | United States (HC) | STD-003 §6.2 | PARTIAL | MEDIUM |
| OMB M-24-10 | United States (Gov) | STD-003 §7.1 | COMPLETE | HIGH |
| UK AI Principles | United Kingdom | STD-003 §8.1 | PROVISIONAL | MEDIUM |
| Canada AIDA | Canada | STD-003 §8.2 | PROVISIONAL | LOW |
| DPDP Act | India | STD-003 §9.1 | PLANNED | — |

---

## Appendix C. RFC 2119 Keyword Usage

*This specification uses the following keywords as defined by RFC 2119 (Bradner, 1997). These keywords appear in **bold** in normative text.*

| Keyword | Definition |
|---|---|
| **MUST / REQUIRED / SHALL** | This word, or the terms REQUIRED or SHALL, means that the definition is an absolute requirement of the specification. |
| **MUST NOT / SHALL NOT** | This phrase means that the definition is an absolute prohibition of the specification. |
| **SHOULD / RECOMMENDED** | This word, or the adjective RECOMMENDED, means that there may exist valid reasons in particular circumstances to ignore a particular item, but the full implications must be understood and carefully weighed before choosing a different course. |
| **SHOULD NOT / NOT RECOMMENDED** | This phrase means that there may exist valid reasons in particular circumstances when the particular behavior is acceptable or even useful, but the full implications should be understood and the case carefully weighed before implementing any behavior described with this label. |
| **MAY / OPTIONAL** | This word, or the adjective OPTIONAL, means that an item is truly optional. One vendor may choose to include the item because a particular marketplace requires it or because the vendor feels that it enhances the product while another vendor may omit the same item. |

---

## Appendix D. Document History and Change Log

| Version | Date | Status | Summary |
|---|---|---|---|
| 0.1.0 | February 2026 | DRAFT | Initial publication. All 16 sections and 4 appendices. Scope broadened from regulated industries to all applicable domains where AI serves people, organizations, and society. Open for community review and comment. |

---

*End of AIGRC-STD-001 v0.1.0*

*The authoritative version of this document is at `aigrc.dev/spec/std-001`*

*Comments and corrections: `spec@aigrc.dev`*

*© 2026 PangoLabs Autonomous Systems · Licensed under Apache 2.0 · `aigrc.dev` · `aigos.dev`*
