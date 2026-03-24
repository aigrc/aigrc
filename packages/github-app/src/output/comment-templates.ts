// ─────────────────────────────────────────────────────────────────
// PangoGuard — PR Comment Templates
// Six comment variants by risk tier (L0-L3 + governed)
// ─────────────────────────────────────────────────────────────────

import type { AppScanResult } from "../types.js";
import { TIER_ICONS } from "../types.js";
import {
  renderDetectionTable,
  renderRegulatorySection,
  renderCapabilities,
  renderAgenticWarnings,
} from "./comment-renderer.js";

// ─────────────────────────────────────────────────────────────────
// L0 MINIMAL — Single-line note, merge freely
// ─────────────────────────────────────────────────────────────────

export function renderL0Comment(result: AppScanResult): string {
  const icon = TIER_ICONS.L0;
  const count = result.scanResult.summary.totalDetections;
  const primary = result.scanResult.summary.primaryFramework ?? "AI framework";

  return `## ${icon} PangoGuard \u2014 L0 MINIMAL

**${count} AI component${count !== 1 ? "s" : ""} detected** (${primary}) \u2014 **Minimal risk, no action required.**

This PR introduces AI usage classified as minimal risk. No governance artifacts are required at this tier.

${renderCapabilities(result)}

<details>
<summary>View detections</summary>

${renderDetectionTable(result)}

</details>

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a> \u2014 Layered AI governance that scales with your code</sub>`;
}

// ─────────────────────────────────────────────────────────────────
// L1 LIMITED — Checklist with template links, 30-day window
// ─────────────────────────────────────────────────────────────────

export function renderL1Comment(result: AppScanResult): string {
  const icon = TIER_ICONS.L1;
  const count = result.scanResult.summary.totalDetections;
  const primary = result.scanResult.summary.primaryFramework ?? "AI framework";

  return `## ${icon} PangoGuard \u2014 L1 LIMITED

**${count} AI component${count !== 1 ? "s" : ""} detected** (${primary}) \u2014 **Limited risk, transparency required.**

${renderCapabilities(result)}

### Required Actions (within 30 days)

- [ ] Create an AI Asset Card for this component \u2192 \`aigrc init\`
- [ ] Add transparency notice if this AI interacts with users
- [ ] Link business justification (Jira/ADO ticket) to Asset Card

### Detections

${renderDetectionTable(result)}

### Regulatory Context

${renderRegulatorySection(result)}

${renderAgenticWarnings(result)}

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a> \u2014 Layered AI governance that scales with your code</sub>`;
}

// ─────────────────────────────────────────────────────────────────
// L2 HIGH — Numbered steps, pre-filled templates, auto-instrumentation
// This is the KONG DEMO template
// ─────────────────────────────────────────────────────────────────

export function renderL2Comment(result: AppScanResult): string {
  const icon = TIER_ICONS.L2;
  const count = result.scanResult.summary.totalDetections;
  const primary = result.scanResult.summary.primaryFramework ?? "AI framework";

  return `## ${icon} PangoGuard \u2014 L2 HIGH

**${count} AI component${count !== 1 ? "s" : ""} detected** (${primary}) \u2014 **High risk, governance artifacts required before production.**

${renderCapabilities(result)}

${renderAgenticWarnings(result)}

### Required Steps

1. **Create AI Asset Card** \u2192 Run \`aigrc init\` or copy the YAML stub below
2. **Link Business Justification** \u2192 Add Jira/ADO ticket to the Asset Card's \`intent\` section
3. **Add Human Oversight Plan** \u2192 Document who reviews AI decisions and escalation path
4. **Implement Monitoring** \u2192 Add the auto-instrumentation wrapper (generated below)
5. **Submit for Approval** \u2192 Governance team review required for L2 assets

### Detections

${renderDetectionTable(result)}

### Regulatory Obligations

${renderRegulatorySection(result)}

### Auto-Instrumentation (Generated)

<details>
<summary>View governance wrapper code</summary>

> Auto-instrumentation is generated based on detected framework. Add this wrapper
> to enable runtime governance telemetry.

_Run \`aigrc instrument\` to generate the full wrapper, or review the template above._

</details>

### Asset Card Template

<details>
<summary>View YAML stub</summary>

\`\`\`yaml
# Save as .aigrc/cards/<asset-name>.yaml
id: "aigrc-2024-PLACEHOLDER"
name: "${primary} Integration"
version: "1.0.0"
created: "${new Date().toISOString()}"
updated: "${new Date().toISOString()}"
ownership:
  owner:
    name: "TODO"
    email: "TODO"
technical:
  type: "agent"
  framework: "${primary}"
classification:
  riskLevel: "high"
  riskFactors:
    autonomousDecisions: true
    toolExecution: ${result.detectedCapabilities.includes("tool execution")}
    customerFacing: false
    externalDataAccess: ${result.detectedCapabilities.includes("external API access")}
    piiProcessing: "unknown"
    highStakesDecisions: false
intent:
  linked: false
  ticketSystem: null
  ticketId: null
  businessJustification: null
governance:
  status: "draft"
  approvals: []
\`\`\`

</details>

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a> \u2014 Layered AI governance that scales with your code</sub>`;
}

// ─────────────────────────────────────────────────────────────────
// L3 UNACCEPTABLE — CISO notification, legal review required
// ─────────────────────────────────────────────────────────────────

export function renderL3Comment(result: AppScanResult): string {
  const icon = TIER_ICONS.L3;
  const count = result.scanResult.summary.totalDetections;
  const primary = result.scanResult.summary.primaryFramework ?? "AI framework";

  return `## ${icon} PangoGuard \u2014 L3 UNACCEPTABLE

**${count} AI component${count !== 1 ? "s" : ""} detected** (${primary}) \u2014 **UNACCEPTABLE risk. Immediate review required.**

> **\uD83E\uDD94 PangoGuard has classified this PR as UNACCEPTABLE RISK.**
> A CISO alert has been created. Legal and governance review is mandatory before merge.

${renderCapabilities(result)}

${renderAgenticWarnings(result)}

### Immediate Actions Required

1. **DO NOT MERGE** without explicit CISO/Legal approval
2. **Review detected components** for prohibited AI practices
3. **CISO Alert** has been filed \u2014 check Issues for details
4. **Legal Review** required for regulatory compliance assessment
5. **Consider redesign** to reduce risk tier below L3

### Detections

${renderDetectionTable(result)}

### Regulatory Impact

${renderRegulatorySection(result)}

### Why is this L3?

${result.classification.reasons.map((r) => `- ${r}`).join("\n")}

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a> \u2014 Layered AI governance that scales with your code</sub>`;
}

// ─────────────────────────────────────────────────────────────────
// ALREADY GOVERNED — Governance verified, card reference
// ─────────────────────────────────────────────────────────────────

export function renderGovernedComment(result: AppScanResult): string {
  const icon = TIER_ICONS.L0;
  const cardId = result.existingCard?.id ?? "unknown";
  const primary = result.scanResult.summary.primaryFramework ?? "AI framework";

  return `## ${icon} PangoGuard \u2014 GOVERNED

**AI component verified** (${primary}) \u2014 **Governance artifacts in place.**

| Property | Value |
|----------|-------|
| Asset Card | \`${cardId}\` |
| Risk Tier | ${result.tier} ${result.tierLabel} |
| Governance Status | ${result.governanceStatus} |
| Frameworks | ${result.detectedCapabilities.join(", ") || "N/A"} |

All required governance artifacts are present. This PR can proceed.

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a> \u2014 Layered AI governance that scales with your code</sub>`;
}
