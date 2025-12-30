# AIGRC/AIGOS Specification Index

## Overview

This directory contains the complete specification suite for the AI Governance, Risk, and Compliance (AIGRC) static governance system and the AI Governance Operating System (AIGOS) kinetic governance runtime.

## Reading Order

### For Newcomers

1. Start with [GLOSSARY.md](./GLOSSARY.md) to understand terminology
2. Read [CONFORMANCE.md](./CONFORMANCE.md) to understand compliance levels
3. Read the Master Specification for overall architecture

### For Implementers

1. Identify which layer you're implementing
2. Read the Layer Overview spec first
3. Read component specs in dependency order (see dependency graphs)
4. Reference Protocol specs as needed

---

## Specification Hierarchy

```
Level 0: Master Specification
    └── Defines overall architecture and terminology
    
Level 1: Layer Specifications  
    └── Defines layer architecture and component relationships
    
Level 2: Component Specifications
    └── Defines individual component behavior and interfaces
    
Level 3: Protocol/Format Specifications
    └── Defines wire formats, file formats, shared protocols
```

---

## Directory Structure

```
spec/
├── README.md                          ◄── You are here
├── GLOSSARY.md                        # Shared terminology
├── CONFORMANCE.md                     # Conformance levels
│
├── master/                            # Level 0
│   └── AIGRC_MASTER_SPECIFICATION.md
│
├── layer-2-static/                    # AIGRC Static Governance
│   ├── STATIC_GOVERNANCE_OVERVIEW.md
│   ├── components/
│   │   ├── SPEC-DET-001_Detection_Engine.md
│   │   ├── SPEC-CLS-001_Risk_Classification.md
│   │   ├── SPEC-GTH-001_Golden_Thread.md
│   │   ├── SPEC-CLI-001_Command_Line_Interface.md
│   │   ├── SPEC-MCP-001_MCP_Server.md
│   │   ├── SPEC-ACT-001_GitHub_Action.md
│   │   └── SPEC-VSC-001_VS_Code_Extension.md
│   └── profiles/
│       ├── SPEC-PRO-001_Profile_Schema.md
│       └── SPEC-PRO-EU_EU_AI_Act.md
│
├── layer-3-kinetic/                   # AIGOS Kinetic Governance
│   ├── KINETIC_GOVERNANCE_OVERVIEW.md
│   ├── components/
│   │   ├── SPEC-RT-001_Runtime_SDK_Overview.md
│   │   ├── SPEC-RT-002_Identity_Manager.md
│   │   ├── SPEC-RT-003_Policy_Engine.md
│   │   ├── SPEC-RT-004_Telemetry_Emitter.md
│   │   ├── SPEC-RT-005_Kill_Switch.md
│   │   ├── SPEC-RT-006_Capability_Decay.md
│   │   └── SPEC-RT-007_Sidecar_Proxy.md
│   └── adapters/
│       ├── SPEC-ADP-001_Adapter_Interface.md
│       └── SPEC-ADP-LC_LangChain.md
│
├── layer-4-sustainability/            # Environmental Layer
│   ├── SUSTAINABILITY_OVERVIEW.md
│   └── components/
│       └── SPEC-ENV-001_Carbon_Attribution.md
│
├── protocols/                         # Shared Protocols
│   ├── SPEC-FMT-001_AIGRC_File_Format.md
│   ├── SPEC-FMT-002_Asset_Card_Schema.md
│   ├── SPEC-PRT-001_Golden_Thread_Protocol.md
│   ├── SPEC-PRT-002_OTel_Semantic_Conventions.md
│   └── SPEC-LIC-001_License_Key_Format.md
│
├── integration/                       # Cross-Layer Integration
│   └── SPEC-INT-001_Static_to_Kinetic_Bridge.md
│
└── adr/                               # Architecture Decision Records
    └── ADR-001_Monorepo_Structure.md
```

---

## Specification Status Legend

| Status | Meaning |
|--------|---------|
| **Draft** | Initial writing, not ready for review |
| **Review** | Ready for technical review |
| **Approved** | Reviewed and approved for implementation |
| **Implemented** | Code exists that conforms to spec |
| **Deprecated** | Superseded by newer spec |

---

## Specification Index

### Layer 2: Static Governance (AIGRC)

| Spec ID | Name | Status | npm Package |
|---------|------|--------|-------------|
| SPEC-DET-001 | Detection Engine | Implemented | @aigrc/core |
| SPEC-CLS-001 | Risk Classification | Implemented | @aigrc/core |
| SPEC-GTH-001 | Golden Thread | Draft | @aigrc/core |
| SPEC-CLI-001 | Command Line Interface | Implemented | @aigrc/cli |
| SPEC-MCP-001 | MCP Server | Implemented | @aigrc/mcp |
| SPEC-ACT-001 | GitHub Action | Draft | @aigrc/github-action |
| SPEC-VSC-001 | VS Code Extension | Draft | aigrc-vscode |

### Layer 3: Kinetic Governance (AIGOS)

| Spec ID | Name | Status | npm Package |
|---------|------|--------|-------------|
| SPEC-RT-001 | Runtime SDK Overview | Draft | @aigos/runtime |
| SPEC-RT-002 | Identity Manager | Draft | @aigos/runtime |
| SPEC-RT-003 | Policy Engine | Draft | @aigos/runtime |
| SPEC-RT-004 | Telemetry Emitter | Draft | @aigos/runtime |
| SPEC-RT-005 | Kill Switch | Draft | @aigos/runtime |
| SPEC-RT-006 | Capability Decay | Draft | @aigos/runtime |
| SPEC-RT-007 | Sidecar Proxy | Draft | @aigos/sidecar |

### Protocols

| Spec ID | Name | Status | Used By |
|---------|------|--------|---------|
| SPEC-FMT-001 | .aigrc File Format | Draft | All |
| SPEC-FMT-002 | Asset Card Schema | Implemented | @aigrc/core |
| SPEC-PRT-001 | Golden Thread Protocol | Draft | @aigrc/core, @aigos/runtime |
| SPEC-PRT-002 | OTel Semantic Conventions | Draft | @aigos/runtime |
| SPEC-LIC-001 | License Key Format | Draft | All paid tiers |

---

## Naming Convention

```
SPEC-{CATEGORY}-{NUMBER}_{Name}.md

Categories:
  DET = Detection
  CLS = Classification
  GTH = Golden Thread
  CLI = Command Line Interface
  MCP = Model Context Protocol
  ACT = GitHub Action
  VSC = VS Code Extension
  PRO = Jurisdiction Profiles
  RT  = Runtime (Kinetic)
  ADP = Framework Adapters
  ENV = Environmental/Sustainability
  FMT = File/Data Formats
  PRT = Wire Protocols
  INT = Integration
  LIC = Licensing
```

---

## Contributing

### Writing a New Spec

1. Copy the template from `_TEMPLATE.md`
2. Follow the naming convention
3. Fill in all required sections
4. Add to this index
5. Submit for review

### Reviewing a Spec

1. Check normative language (MUST/SHOULD/MAY per RFC 2119)
2. Verify dependency references are accurate
3. Confirm examples are correct
4. Test any provided test vectors
5. Mark as "Approved" when complete

---

## License

All specifications are licensed under Apache 2.0.
