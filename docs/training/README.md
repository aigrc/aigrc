# AIGRC Training Program

> **Version:** 1.0
> **Last Updated:** January 2026
> **Target Audience:** Instructors and Self-Paced Learners

## Program Overview

This training program provides comprehensive education on AI Governance, Risk, and Compliance (AIGRC) tools and methodologies. Each module follows a consistent "Why, What, How" structure designed for both instructor-led workshops and self-paced learning.

## Learning Levels

| Level | Duration | Focus | Audience |
|-------|----------|-------|----------|
| [Level 1: Foundations](./level-1-foundations/) | 1-2 hours | Core concepts, risk classification | All stakeholders |
| [Level 2: Core Skills](./level-2-core-skills/) | 2-3 hours | CLI, VS Code, GitHub Actions | Developers, DevOps |
| [Level 3: Advanced](./level-3-advanced/) | 3-4 hours | MCP, Multi-Jurisdiction, I2E | Architects, Compliance |
| [Level 4: Specialization](./level-4-specialization/) | 1-2 hours | Role-specific deep dives | By role |

## Module Structure

Every training module follows this structure:

```
Module Title
├── Overview (5 min)
│   ├── Learning Objectives
│   └── Prerequisites
├── WHY - The Problem & Value (15-20 min)
│   ├── The Challenge
│   ├── Business Impact
│   └── Industry Context
├── WHAT - Concepts & Architecture (20-30 min)
│   ├── Key Concepts
│   ├── Architecture Diagram
│   └── Component Overview
├── HOW - Hands-On Implementation (30-45 min)
│   ├── Step-by-Step Tutorial
│   ├── Code Examples
│   └── Common Patterns
├── Practice Lab (15-30 min)
│   ├── Exercises
│   └── Solutions
├── Assessment (10 min)
│   ├── Knowledge Check
│   └── Practical Challenge
└── Resources
    ├── Further Reading
    └── Reference Links
```

## Instructor Guide

### Preparation Checklist
- [ ] Review module content and hands-on labs
- [ ] Prepare demo environment with sample projects
- [ ] Test all CLI commands and integrations
- [ ] Have fallback slides for network issues
- [ ] Prepare Q&A talking points

### Delivery Tips
1. **Start with "Why"** - Always establish business value before technical details
2. **Live Demo > Slides** - Show real tools whenever possible
3. **Pause for Questions** - After each major section
4. **Hands-On Time** - Ensure 30-40% of session is practical work
5. **Real Examples** - Use the sample asset cards and scenarios provided

### Timing Guidance
- Lecture: 40% of allocated time
- Demo: 20% of allocated time
- Hands-on: 30% of allocated time
- Q&A/Buffer: 10% of allocated time

## Self-Paced Learning Guide

### Recommended Pace
- **Beginner:** 1 module per day
- **Intermediate:** 2-3 modules per day
- **Intensive:** Complete level per day

### Learning Path by Role

| Role | Recommended Path |
|------|------------------|
| Developer | L1 → L2 (all) → L3.1 → L3.3 → L4.1 |
| DevOps/SRE | L1 → L2.3 → L3.3 → L3.1 |
| Product Manager | L1 → L2.1 (overview) → L3.2 → L4.2 |
| CISO/Security | L1 → L3.2 → L3.3 → L4.3 |
| Legal/Compliance | L1 → L3.2 → L4.4 |
| Architect | L1 → L2 (all) → L3 (all) |

## Certification Paths

| Certification | Prerequisites | Assessment |
|---------------|---------------|------------|
| AIGRC Practitioner | Levels 1-2 | Online quiz + practical task |
| AIGRC Developer | Levels 1-3.1, 3.3 | Implementation project |
| AIGRC Compliance Specialist | Levels 1, 3.2 + L4.4 | Compliance audit exercise |
| AIGRC Architect | All Levels | Architecture design project |

## Quick Reference

### Sample Projects for Labs
- `aigrc/test-environment/` - Pre-configured test environment
- `aigrc/test-environment/assets/` - Example asset cards (4 risk levels)
- `aigrc/packages/mcp/profiles/` - Compliance profiles

### Key Commands
```bash
# Install CLI
npm install -g @aigrc/cli

# Basic scan
aigrc scan .

# Initialize governance
aigrc init

# Policy check (I2E)
aigrc policy status
aigrc policy check
```

### Support Resources
- Documentation: https://aigrc.dev/docs
- GitHub Issues: https://github.com/aigrc/aigrc/issues
- Community: https://discord.gg/aigrc (coming soon)

---

*AIGRC Training Program v1.0 - Empowering Responsible AI Development*
