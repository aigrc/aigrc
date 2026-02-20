# Contributing to AIGRC

Thank you for your interest in AIGRC. We're building the open specification and developer toolkit for AI governance engineering, and contributions from engineers, architects, compliance professionals, and anyone who cares about AI accountability are welcome.

This guide covers everything you need to know to contribute effectively.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Specification Contributions](#specification-contributions)
- [Documentation Contributions](#documentation-contributions)
- [Reporting Issues](#reporting-issues)
- [Community](#community)
- [License](#license)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All participants are expected to:

- **Be respectful.** Disagreements are fine — personal attacks are not.
- **Be constructive.** Critique ideas, not people. Offer alternatives when pointing out problems.
- **Be inclusive.** AI governance affects everyone. We welcome perspectives from all backgrounds and experience levels.
- **Be honest.** We value intellectual honesty over performative agreement. If something doesn't work, say so.

Violations can be reported to [conduct@pangolabs.io](mailto:conduct@pangolabs.io).

---

## Ways to Contribute

AIGRC is a multi-faceted project. There are meaningful contributions for every skill set:

### 🛠️ Code

| Area | Package | Good For |
|------|---------|----------|
| CLI commands | [`packages/cli`](packages/cli/) | Node.js/TypeScript developers |
| Detection engine | [`packages/core`](packages/core/) | Anyone who works with AI/ML frameworks |
| VS Code extension | [`packages/vscode`](packages/vscode/) | VS Code extension developers |
| GitHub Action | [`packages/github-action`](packages/github-action/) | CI/CD and DevOps engineers |
| MCP server | [`packages/mcp`](packages/mcp/) | Model Context Protocol developers |
| I2E bridge | [`packages/i2e-bridge`](packages/i2e-bridge/) | Policy engine / compiler developers |
| I2E firewall | [`packages/i2e-firewall`](packages/i2e-firewall/) | Runtime enforcement / security engineers |
| SDK | [`packages/sdk`](packages/sdk/) | Python and Go developers |

### 📐 Specification

The AIGRC specification is an open standard under active development. Contributions include:

- Reviewing and commenting on draft specs
- Proposing new specification sections
- Reporting ambiguities or contradictions
- Mapping to existing standards (ISO 42001, NIST AI RMF)
- Providing implementation feedback that improves the spec

See [Specification Contributions](#specification-contributions) for the process.

### 📚 Documentation & Education

- Improving the [Field Guide](guide/) chapters
- Writing tutorials and how-to guides
- Adding framework detection patterns
- Translating content into other languages
- Reporting unclear or outdated documentation

### 🐛 Issues & Feedback

- Reporting bugs with clear reproduction steps
- Requesting features with use-case context
- Sharing real-world governance challenges that AIGRC should address
- Answering questions from other community members

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **pnpm** | 8+ | Package manager |
| **Git** | 2.30+ | Version control |

### Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/aigrc.git
cd aigrc
```

### Install Dependencies

```bash
pnpm install
```

### Build All Packages

```bash
pnpm run build
```

### Run Tests

```bash
pnpm run test
```

### Verify Everything Works

```bash
pnpm run typecheck
pnpm run lint
```

---

## Development Setup

AIGRC is a **monorepo** managed with [Turborepo](https://turbo.build/) and [pnpm workspaces](https://pnpm.io/workspaces). Changes to shared packages like `@aigrc/core` will propagate to dependent packages automatically during builds.

### Useful Commands

| Command | What It Does |
|---------|-------------|
| `pnpm run build` | Build all packages |
| `pnpm run dev` | Start development mode (watch) |
| `pnpm run test` | Run all tests (Vitest) |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run lint` | ESLint across all packages |
| `pnpm run format` | Format with Prettier |
| `pnpm run clean` | Clean build artifacts |

### Working on a Specific Package

```bash
# Build only the CLI
cd packages/cli
pnpm run build

# Run CLI tests
pnpm run test

# Test the CLI locally
pnpm run dev -- scan
```

### Environment Variables

No API keys or external services are required for local development. The test suite uses fixtures and mocks.

---

## Project Structure

```
aigrc/
├── packages/
│   ├── cli/              # @aigrc/cli — Command-line interface
│   ├── core/             # @aigrc/core — Detection, classification, Golden Thread
│   ├── github-action/    # @aigrc/github-action — CI/CD governance gates
│   ├── vscode/           # aigrc-vscode — VS Code extension
│   ├── mcp/              # @aigrc/mcp — Model Context Protocol server
│   ├── i2e-bridge/       # @aigrc/i2e-bridge — Intent-to-Enforcement compiler
│   ├── i2e-firewall/     # @aigrc/i2e-firewall — Runtime policy enforcement
│   └── sdk/              # @aigrc/sdk — Language SDKs (Python, Go)
├── docs/
│   ├── aigos_master_specs/   # Formal specification documents
│   ├── concepts/             # Conceptual guides
│   ├── getting-started/      # Onboarding docs
│   ├── guides/               # Tool-specific guides
│   └── kinetic/              # Kinetic Governance (Layer 3) docs
├── guide/                # Field Guide — educational content
├── spec/                 # Specification overview (linked from README)
├── roadmaps/             # Role-based learning paths
├── resources/            # Curated papers, regulations, tools
├── test-environment/     # Integration test fixtures
├── .aigrc/               # This repo's own governance config (dogfooding)
├── .github/workflows/    # CI/CD pipelines
└── .changeset/           # Changesets for versioning
```

---

## Making Changes

### 1. Create a Branch

```bash
git checkout -b <type>/<short-description>
```

Branch naming convention:

| Prefix | When To Use | Example |
|--------|-------------|---------|
| `feat/` | New feature | `feat/add-huggingface-detection` |
| `fix/` | Bug fix | `fix/classify-crash-on-empty-dir` |
| `docs/` | Documentation | `docs/golden-thread-guide` |
| `spec/` | Specification change | `spec/asset-card-v2-fields` |
| `refactor/` | Code refactoring | `refactor/core-detection-engine` |
| `test/` | Test improvements | `test/cli-scan-edge-cases` |
| `chore/` | Build, CI, tooling | `chore/update-turbo-config` |

### 2. Make Your Changes

- Keep commits focused and atomic
- Write meaningful commit messages (see below)
- Add or update tests for code changes
- Run `pnpm run format` before committing

### 3. Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Examples:**

```
feat(core): add CrewAI framework detection

Adds detection patterns for the CrewAI multi-agent framework,
including @crew decorator, Agent/Task/Crew class usage, and
crewai.yaml configuration files.

Closes #42
```

```
fix(cli): handle missing .aigrc directory gracefully

Previously, `aigrc status` would crash if the .aigrc/ directory
didn't exist. Now it prints a helpful message suggesting `aigrc init`.
```

```
docs(guide): add Chapter 05 — The Orphan Agent Problem
```

**Scopes:** `core`, `cli`, `vscode`, `github-action`, `mcp`, `i2e-bridge`, `i2e-firewall`, `sdk`, `spec`, `guide`, `docs`

### 4. Add a Changeset (for Code Changes)

We use [Changesets](https://github.com/changesets/changesets) for versioning. If your change affects a published package:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages changed
2. Choose the semver bump type (patch, minor, major)
3. Write a human-readable summary

Changesets are **not required** for documentation-only changes.

---

## Pull Request Process

### Before Submitting

- [ ] Code builds: `pnpm run build`
- [ ] Tests pass: `pnpm run test`
- [ ] Types check: `pnpm run typecheck`
- [ ] Code is formatted: `pnpm run format`
- [ ] Changeset added (if applicable): `pnpm changeset`
- [ ] Branch is up to date with `main`

### PR Template

When you open a PR, include:

```markdown
## Summary
What this PR does and why.

## Changes
- Bullet list of specific changes

## Testing
How you verified the changes work.

## Related Issues
Closes #<issue-number>
```

### Review Process

1. **Automated checks** — CI runs build, typecheck, lint, and tests across Node 18, 20, and 22.
2. **Maintainer review** — A maintainer will review your code, usually within a few business days.
3. **Feedback loop** — We may request changes. This is normal and collaborative, not adversarial.
4. **Merge** — Once approved and CI passes, a maintainer will merge your PR.

### What Makes a Good PR

- **Focused scope** — One logical change per PR. Large PRs are harder to review and more likely to stall.
- **Context** — Explain *why*, not just *what*. Link to issues, reference spec sections, describe the use case.
- **Tests** — If you changed behavior, show it works. If you fixed a bug, add a test that would have caught it.
- **Documentation** — If you added a feature, update the relevant docs.

---

## Coding Standards

### TypeScript

- **Strict mode** — All packages use `strict: true` in tsconfig
- **No `any`** — Use proper types. `unknown` is acceptable when narrowed.
- **Named exports** — Prefer named exports over default exports
- **Explicit return types** — For public API functions

### Formatting

Formatting is enforced by [Prettier](https://prettier.io/) with this configuration:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Run `pnpm run format` before committing or configure your editor to format on save.

### Testing

- We use [Vitest](https://vitest.dev/) as the test runner
- Tests live next to the source files as `*.test.ts` or in a `__tests__/` directory
- Aim for meaningful coverage — test behavior, not implementation details
- Use fixtures from `test-environment/` for integration tests

### Linting

- ESLint is configured at the workspace level
- Run `pnpm run lint` to check
- CI will flag lint issues (currently non-blocking, moving to strict)

---

## Specification Contributions

The AIGRC specification is an open standard. Contributing to the spec has a slightly different process than contributing code, because specification changes have broader impact.

### Spec Status Levels

| Status | Meaning | Can I Change It? |
|--------|---------|-----------------|
| 📗 **Stable** | Implemented and in use | Breaking changes need an RFC |
| 📙 **Draft** | Under active development | Open to significant changes |
| 📋 **Planned** | Not yet started | Proposals welcome |

### How to Propose a Spec Change

1. **Open an issue** with the `spec` label describing the change and its rationale.
2. **Discussion** — The community and maintainers discuss the proposal.
3. **Draft PR** — If there's consensus, submit a PR with the spec changes.
4. **Review** — Spec PRs require maintainer approval with attention to backward compatibility.

### Spec Document Format

All specifications follow a consistent structure:

```markdown
# SPEC-<LAYER>-<NUMBER>: <Title>

## Document Information
| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-XXX-NNN |
| **Version** | X.Y.Z-draft |
| **Status** | Draft |
| **Last Updated** | YYYY-MM-DD |

## Abstract
One paragraph summary.

## 1. Introduction
### 1.1 Purpose
### 1.2 Scope

## 2. Specification
(the normative content)

## 3. Examples

## 4. Security Considerations

## 5. References
```

### Specification Layers

| Layer | Prefix | Covers |
|-------|--------|--------|
| CLI | `CLI` | Command-line interface behavior |
| Format | `FMT` | File formats, schemas |
| Protocol | `PRT` | Wire protocols, data exchange |
| Runtime | `RT` | Runtime enforcement components |
| License | `LIC` | License key format and validation |

---

## Documentation Contributions

Good documentation is as valuable as good code. Here's how to contribute to different documentation areas:

### Field Guide (`guide/`)

The Field Guide teaches AI governance as an engineering discipline. Chapters should:

- Start with a real problem, not a definition
- Include concrete examples and code where relevant
- End with actionable takeaways
- Use a conversational but precise tone
- Target a technically literate audience (developers, architects, CTOs)

### Concept Docs (`docs/concepts/`)

Explain foundational ideas like risk classification, the Golden Thread, and the Truth Tax. These are reference material for people who need to understand the "why."

### Tool Guides (`docs/guides/`)

Step-by-step guides for specific tools (CLI, VS Code extension, GitHub Action, MCP server). These should be task-oriented: "How to scan a monorepo," not "The scan command reference."

### Specification Docs (`docs/aigos_master_specs/`)

Formal specification documents. See [Specification Contributions](#specification-contributions) for the process and format.

### Style Guidelines

- Use **American English** spelling
- Write in **second person** ("you") for guides and tutorials
- Use **present tense** ("the CLI scans" not "the CLI will scan")
- Keep paragraphs short — 3-4 sentences max
- Use code blocks with language identifiers (` ```bash `, ` ```yaml `, ` ```typescript `)
- Avoid jargon without explanation — define terms on first use

---

## Reporting Issues

### Bug Reports

A good bug report includes:

```markdown
**What happened:**
Describe the unexpected behavior.

**What you expected:**
Describe the behavior you expected.

**Steps to reproduce:**
1. Run `aigrc scan` in a directory with...
2. Observe that...

**Environment:**
- OS: macOS 14.2 / Ubuntu 22.04 / Windows 11
- Node.js: 20.11.0
- pnpm: 8.15.0
- @aigrc/cli: 0.4.0

**Logs/Output:**
(paste relevant terminal output)
```

### Feature Requests

Feature requests should include:

- **The problem you're solving** — What governance challenge does this address?
- **Your proposed solution** — How should it work?
- **Alternatives considered** — What else did you think about?
- **Context** — Are you an engineer? Compliance officer? CISO? This helps us understand the perspective.

### Labels

| Label | Meaning |
|-------|---------|
| `bug` | Something broken |
| `feature` | New functionality |
| `spec` | Specification related |
| `docs` | Documentation |
| `good first issue` | Good for newcomers |
| `help wanted` | We'd love community help here |
| `framework-detection` | New AI/ML framework support |
| `regulation` | Regulatory mapping (EU AI Act, etc.) |

---

## Community

- **GitHub Issues** — For bugs, features, and spec discussions: [github.com/aigrc/aigrc/issues](https://github.com/aigrc/aigrc/issues)
- **GitHub Discussions** — For questions and open-ended conversation: [github.com/aigrc/aigrc/discussions](https://github.com/aigrc/aigrc/discussions)
- **AIGOS Platform** — See the tools in action: [aigos.dev](https://aigos.dev)

---

## Recognition

All contributors are recognized in release notes. Significant contributions (new spec sections, major features, framework detection patterns) are credited in the relevant documentation.

---

## License

By contributing to AIGRC, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

This means:
- Your contributions can be used commercially
- Modified versions must state changes
- You grant a patent license for your contributions
- The Apache 2.0 license is preserved in derivative works

---

<div align="center">

**Questions?** Open an issue or start a discussion. There are no bad questions.

**[Back to README →](README.md)**

</div>
