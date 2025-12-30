# AIGOS Development Agents

This command provides an overview of all available development agents and their status.

## Available Agents

| Agent | Command | Epics | Status |
|-------|---------|-------|--------|
| **Scrum Master** | `/scrum-master` | Coordinator | Ready |
| **Core Agent** | `/core-agent` | AIG-1, AIG-2, AIG-3 | Ready |
| **Runtime Agent** | `/runtime-agent` | AIG-4, AIG-5, AIG-6, AIG-7, AIG-8 | Ready |
| **CLI Agent** | `/cli-agent` | AIG-10 | Ready |
| **A2A Agent** | `/a2a-agent` | AIG-9 | Ready |
| **License Agent** | `/license-agent` | AIG-11 | Ready |
| **QA Agent** | `/qa-agent` | AIG-12 | Ready |

## Quick Reference

### Start a Sprint
```
/scrum-master start sprint 1
```

### Check Sprint Status
```
/scrum-master sprint status
```

### Implement a Story
```
/core-agent implement AIG-13
```

### Run Benchmarks
```
/qa-agent run benchmarks
```

## Agent Responsibilities

### Scrum Master Agent
- Sprint planning and backlog grooming
- Assign stories to execution agents
- Monitor progress and blockers
- Coordinate dependencies

### Core Agent (Epics 1, 2, 3)
- Zod schemas for runtime types
- Golden Thread protocol implementation
- Configuration discovery and loading
- Policy file schema and inheritance

### Runtime Agent (Epics 4, 5, 6, 7, 8)
- Identity Manager
- Policy Engine ("The Bouncer")
- OpenTelemetry integration
- Kill Switch
- Capability Decay

### CLI Agent (Epic 10)
- New CLI commands (hash)
- SARIF output format
- Auto-fix functionality
- Exit code coverage

### A2A Agent (Epic 9)
- Governance Token (JWT)
- AIGOS Handshake protocol
- Trust policies
- HTTP middleware

### License Agent (Epic 11)
- JWT license parsing
- Feature gating
- Limit enforcement
- Grace period handling

### QA Agent (Epic 12)
- Integration tests
- Conformance tests
- Performance benchmarks
- Documentation

## Dependency Order
```
Core Agent (E1, E2, E3)
    │
    ├──► Runtime Agent (E4, E5, E6, E7, E8)
    │         │
    │         └──► A2A Agent (E9)
    │
    ├──► CLI Agent (E10)
    │
    └──► License Agent (E11)

QA Agent (E12) runs in parallel, validating all work
```

## JIRA Project
- **URL:** https://aigos.atlassian.net/jira/software/projects/AIG/boards/3
- **Project Key:** AIG
- **Epics:** AIG-1 to AIG-12
- **Stories:** AIG-13 to AIG-114

## Getting Started

1. **Start Sprint 1:**
   ```
   /scrum-master start sprint 1
   ```

2. **Core Agent begins with schemas:**
   ```
   /core-agent implement AIG-13
   ```

3. **Check progress:**
   ```
   /scrum-master sprint status
   ```

## User's Request
$ARGUMENTS
