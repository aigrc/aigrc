# Level 2: Core Skills

> **Duration:** 2-3 hours total
> **Prerequisites:** Level 1 complete

## Overview

Level 2 builds practical proficiency with the three main AIGRC tools. Each module provides deep coverage of one tool with hands-on labs.

## Modules

| Module | Duration | Tool | Key Skills |
|--------|----------|------|------------|
| [2.1 CLI Mastery](./01-cli-mastery.md) | 45-60 min | `@aigrc/cli` | All CLI commands, workflows |
| [2.2 VS Code Extension](./02-vscode-extension.md) | 30-45 min | `aigrc-vscode` | IDE integration, real-time governance |
| [2.3 GitHub Actions](./03-github-actions.md) | 45-60 min | `@aigrc/github-action` | CI/CD enforcement, PR checks |

## Learning Path

```
Module 2.1: CLI Mastery
         ↓
         ├── If using VS Code → Module 2.2
         │
         └── If setting up CI/CD → Module 2.3
```

## Key Commands Reference

```bash
# Discovery
aigrc scan <directory>

# Initialization
aigrc init

# Registration
aigrc register
aigrc classify

# Validation
aigrc validate
aigrc status

# Policy (I2E)
aigrc policy lock
aigrc policy check
aigrc policy status

# Compliance
aigrc compliance check --profile <profile>
aigrc compliance gap-analysis
```

## After This Level

You'll be able to:
- Perform complete governance workflows via CLI
- Configure real-time IDE feedback
- Set up automated CI/CD policy enforcement
- Integrate governance into your development process

---

*Level 2 - AIGRC Training Program v1.0*
