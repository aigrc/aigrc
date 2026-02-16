#!/usr/bin/env python3
"""
JIRA Import Script for AIGRC Dashboard Adoption

This script imports the dashboard adoption epics and stories into JIRA.
It uses the same authentication and API patterns as the CMMC import.

Usage:
    python jira_import_dashboard.py

Requirements:
    pip install requests
"""

import requests
from requests.auth import HTTPBasicAuth
import json
import time
import os

# =============================================================================
# Configuration - use environment variables for secrets
# =============================================================================

JIRA_URL = "https://aigos.atlassian.net"
JIRA_EMAIL = os.environ.get("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.environ.get("JIRA_API_TOKEN", "")

if not JIRA_EMAIL or not JIRA_API_TOKEN:
    print("Error: JIRA_EMAIL and JIRA_API_TOKEN environment variables must be set")
    print("  export JIRA_EMAIL='your-email@example.com'")
    print("  export JIRA_API_TOKEN='your-api-token'")
    exit(1)

# Project key - change this if using a different project
PROJECT_KEY = "AP"  # Using AIGOS-Python project for now

# Issue type IDs (from JIRA project configuration)
# AP Project: Epic=10049, Story=10048, Task=10046
EPIC_TYPE_ID = "10049"
STORY_TYPE_ID = "10048"

# Custom field for story points
STORY_POINTS_FIELD = "customfield_10016"

# =============================================================================
# Epic and Story Definitions
# =============================================================================

EPICS = [
    {
        "key": "AD-1",
        "summary": "[P0] Dashboard Foundation & Package Setup",
        "description": "Set up the @aigrc/dashboard package structure, build configuration, and core dependencies. This epic establishes the foundation for the entire dashboard adoption project.",
        "labels": ["dashboard", "foundation", "p0"],
    },
    {
        "key": "AD-2",
        "summary": "[P0] UI Component Library",
        "description": "Adopt and adapt shadcn/ui components from aftrbell for AIGRC use cases. Includes governance-specific variants for risk levels and compliance status.",
        "labels": ["dashboard", "components", "ui", "p0"],
    },
    {
        "key": "AD-3",
        "summary": "[P0] Authentication & Authorization",
        "description": "Implement authentication context and permission-based access control. Replace Supabase auth with AIGRC-native authentication.",
        "labels": ["dashboard", "auth", "security", "p0"],
    },
    {
        "key": "AD-4",
        "summary": "[P1] Asset Management UI",
        "description": "Build the asset card management interface including list, detail, create, and edit views.",
        "labels": ["dashboard", "assets", "p1"],
    },
    {
        "key": "AD-5",
        "summary": "[P1] Detection Results UI",
        "description": "Build the framework detection results interface for viewing scan results and creating assets from suggestions.",
        "labels": ["dashboard", "detection", "p1"],
    },
    {
        "key": "AD-6",
        "summary": "[P1] Compliance Dashboard",
        "description": "Build the compliance tracking and assessment interface with support for multiple compliance profiles (EU AI Act, NIST AI RMF, CMMC).",
        "labels": ["dashboard", "compliance", "p1"],
    },
    {
        "key": "AD-7",
        "summary": "[P1] Runtime Governance UI",
        "description": "Build the AIGOS runtime monitoring and control interface including agent monitoring, kill switch controls, and policy decision logging.",
        "labels": ["dashboard", "runtime", "aigos", "p1"],
    },
    {
        "key": "AD-8",
        "summary": "[P2] Dashboard Analytics",
        "description": "Build the executive dashboard with metrics and analytics for C-suite visibility.",
        "labels": ["dashboard", "analytics", "p2"],
    },
    {
        "key": "AD-9",
        "summary": "[P2] Air-Gap Variant",
        "description": "Create the air-gapped deployment variant with local backend for stand-alone installations.",
        "labels": ["dashboard", "air-gap", "deployment", "p2"],
    },
    {
        "key": "AD-10",
        "summary": "[P2] Testing & Documentation",
        "description": "Comprehensive testing and documentation for the dashboard package.",
        "labels": ["dashboard", "testing", "documentation", "p2"],
    },
]

STORIES = [
    # Epic 1: Foundation
    {"epic": "AD-1", "summary": "Create package.json with dependencies", "points": 3,
     "description": "Set up the package.json file with all required dependencies including React, Radix UI, TanStack Query, and workspace dependency on @aigrc/core."},
    {"epic": "AD-1", "summary": "Configure TypeScript for dashboard", "points": 3,
     "description": "Create tsconfig.json with strict mode, path aliases, and composite project references."},
    {"epic": "AD-1", "summary": "Set up Vite build configuration", "points": 5,
     "description": "Configure Vite for development server and production builds with library mode for CJS/ESM output."},
    {"epic": "AD-1", "summary": "Configure Tailwind CSS with AIGRC theme", "points": 5,
     "description": "Set up Tailwind with shadcn base theme and AIGRC governance-specific colors."},
    {"epic": "AD-1", "summary": "Create core utility functions", "points": 3,
     "description": "Implement utility functions including cn() for class merging, date formatting, and risk/compliance color helpers."},
    {"epic": "AD-1", "summary": "Set up ESLint and Prettier", "points": 3,
     "description": "Configure linting and formatting to match monorepo standards."},
    {"epic": "AD-1", "summary": "Create type definitions", "points": 5,
     "description": "Define all TypeScript types for AIGRC dashboard, matching @aigrc/core schemas."},
    {"epic": "AD-1", "summary": "Configure package exports", "points": 5,
     "description": "Set up package exports for components, hooks, and types."},

    # Epic 2: UI Components
    {"epic": "AD-2", "summary": "Adopt Button component with governance variants", "points": 3,
     "description": "Copy and adapt Button component with risk level and compliance variants."},
    {"epic": "AD-2", "summary": "Adopt Card component", "points": 2,
     "description": "Copy Card, CardHeader, CardContent, CardFooter components."},
    {"epic": "AD-2", "summary": "Adopt Badge component with risk variants", "points": 3,
     "description": "Copy Badge with risk level and compliance status variants."},
    {"epic": "AD-2", "summary": "Adopt Table components", "points": 3,
     "description": "Copy full table primitives with sortable headers and pagination support."},
    {"epic": "AD-2", "summary": "Adopt Form components (Input, Select, Textarea)", "points": 5,
     "description": "Copy all form primitives with validation states."},
    {"epic": "AD-2", "summary": "Adopt Dialog and Modal components", "points": 5,
     "description": "Copy Dialog primitives and create confirmation/form dialog variants."},
    {"epic": "AD-2", "summary": "Adopt Navigation components (Tabs, Menu)", "points": 5,
     "description": "Copy Tabs, dropdown menu, and navigation menu components."},
    {"epic": "AD-2", "summary": "Adopt Feedback components (Toast, Alert)", "points": 5,
     "description": "Copy Toast notifications, alerts, and progress indicators."},
    {"epic": "AD-2", "summary": "Adopt Data display components (Skeleton, Avatar)", "points": 3,
     "description": "Copy loading skeletons, avatar, and empty state components."},
    {"epic": "AD-2", "summary": "Create RiskLevelBadge component", "points": 5,
     "description": "Build governance-specific risk level badge with tooltip and animations."},
    {"epic": "AD-2", "summary": "Create ComplianceStatusBadge component", "points": 5,
     "description": "Build compliance status badge with score display and trend indicator."},
    {"epic": "AD-2", "summary": "Create component documentation with Storybook", "points": 5,
     "description": "Document all components with interactive examples."},

    # Epic 3: Auth
    {"epic": "AD-3", "summary": "Create AuthContext provider", "points": 5,
     "description": "Implement authentication context with user state management and token persistence."},
    {"epic": "AD-3", "summary": "Implement login/logout flow", "points": 5,
     "description": "Build login form, logout handling, and token storage."},
    {"epic": "AD-3", "summary": "Create ProtectedRoute component", "points": 3,
     "description": "Implement route protection with redirect and loading states."},
    {"epic": "AD-3", "summary": "Create PermissionGate component", "points": 3,
     "description": "Build permission-based rendering component."},
    {"epic": "AD-3", "summary": "Create RoleGate component", "points": 3,
     "description": "Build role-based rendering with hierarchy support."},
    {"epic": "AD-3", "summary": "Implement organization switching", "points": 5,
     "description": "Add multi-organization support with context updates."},
    {"epic": "AD-3", "summary": "Create permission hook (usePermissions)", "points": 5,
     "description": "Build hook for checking single and multiple permissions."},
    {"epic": "AD-3", "summary": "Add MFA support infrastructure", "points": 3,
     "description": "Add MFA state handling and challenge flow."},

    # Epic 4: Asset Management
    {"epic": "AD-4", "summary": "Create AssetList component", "points": 5,
     "description": "Build asset table with sorting, filtering, and search."},
    {"epic": "AD-4", "summary": "Create AssetCard display component", "points": 5,
     "description": "Build asset card display with risk factors and technical details."},
    {"epic": "AD-4", "summary": "Create AssetCardForm component", "points": 8,
     "description": "Build comprehensive asset card form with validation."},
    {"epic": "AD-4", "summary": "Create AssetCreationWizard", "points": 8,
     "description": "Build step-by-step asset creation with detection import."},
    {"epic": "AD-4", "summary": "Implement asset filtering and search", "points": 3,
     "description": "Add multi-filter support with URL state sync."},
    {"epic": "AD-4", "summary": "Create AssetDetailPage", "points": 5,
     "description": "Build full asset detail view with actions."},
    {"epic": "AD-4", "summary": "Implement asset archival flow", "points": 3,
     "description": "Add archive with reason and restore capability."},
    {"epic": "AD-4", "summary": "Create Golden Thread visualization", "points": 5,
     "description": "Display hash, verification status, and documentation links."},

    # Epic 5: Detection
    {"epic": "AD-5", "summary": "Create ScanResultsList component", "points": 5,
     "description": "Build scan results list with status and actions."},
    {"epic": "AD-5", "summary": "Create ScanResultDetail component", "points": 5,
     "description": "Show frameworks detected, model files, and risk indicators."},
    {"epic": "AD-5", "summary": "Create FrameworkCard component", "points": 3,
     "description": "Display framework name, version, confidence, and location."},
    {"epic": "AD-5", "summary": "Create ScanInitiator component", "points": 5,
     "description": "Build scan trigger with path input and progress."},
    {"epic": "AD-5", "summary": "Create AssetSuggestionView", "points": 3,
     "description": "Show suggested asset card with edit and create."},
    {"epic": "AD-5", "summary": "Implement scan history pagination", "points": 3,
     "description": "Add paginated list with date filter and export."},

    # Epic 6: Compliance
    {"epic": "AD-6", "summary": "Create ComplianceOverview component", "points": 5,
     "description": "Build summary cards with profile selector."},
    {"epic": "AD-6", "summary": "Create ComplianceProfileCard component", "points": 3,
     "description": "Display profile details and control count."},
    {"epic": "AD-6", "summary": "Create ControlStatusGrid component", "points": 8,
     "description": "Build control grid with status indicators and filters."},
    {"epic": "AD-6", "summary": "Create AssessmentResultView component", "points": 5,
     "description": "Show assessment details, findings, and remediation."},
    {"epic": "AD-6", "summary": "Create ComplianceTrendChart component", "points": 5,
     "description": "Build time series chart with multi-profile support."},
    {"epic": "AD-6", "summary": "Implement assessment runner UI", "points": 5,
     "description": "Add asset/profile selection with progress tracking."},
    {"epic": "AD-6", "summary": "Create ComplianceReportExport", "points": 3,
     "description": "Add PDF and CSV export with date range."},
    {"epic": "AD-6", "summary": "Create EvidenceAttachment component", "points": 2,
     "description": "Add evidence upload and control linking."},

    # Epic 7: Runtime
    {"epic": "AD-7", "summary": "Create AgentList component", "points": 5,
     "description": "Build active agents table with status and actions."},
    {"epic": "AD-7", "summary": "Create AgentDetailView component", "points": 5,
     "description": "Show full agent details with capabilities and budget."},
    {"epic": "AD-7", "summary": "Create KillSwitchControl component", "points": 8,
     "description": "Build terminate/pause/resume controls with confirmation."},
    {"epic": "AD-7", "summary": "Create CapabilityManifestViewer", "points": 5,
     "description": "Display tool permissions and resource restrictions."},
    {"epic": "AD-7", "summary": "Create BudgetGauge component", "points": 3,
     "description": "Show current/total budget with warning thresholds."},
    {"epic": "AD-7", "summary": "Create PolicyDecisionLog component", "points": 5,
     "description": "Display decision history with filters and metrics."},
    {"epic": "AD-7", "summary": "Create AgentHierarchyTree component", "points": 5,
     "description": "Build parent/child tree with capability decay visualization."},
    {"epic": "AD-7", "summary": "Create RealTimeAgentMonitor", "points": 8,
     "description": "Add WebSocket connection with live updates and alerts."},

    # Epic 8: Analytics
    {"epic": "AD-8", "summary": "Create DashboardMetricsCards component", "points": 5,
     "description": "Build summary cards for total assets, agents, score, violations."},
    {"epic": "AD-8", "summary": "Create RiskDistributionChart component", "points": 5,
     "description": "Build pie/donut chart with click-to-filter."},
    {"epic": "AD-8", "summary": "Create RecentActivityFeed component", "points": 3,
     "description": "Display activity timeline with type icons."},
    {"epic": "AD-8", "summary": "Create AssetTrendChart component", "points": 5,
     "description": "Show assets over time by risk level."},
    {"epic": "AD-8", "summary": "Create ComplianceScorecard component", "points": 5,
     "description": "Display multi-profile scores with trends."},
    {"epic": "AD-8", "summary": "Create ExecutiveSummaryExport", "points": 5,
     "description": "Add PDF report with key metrics and trends."},

    # Epic 9: Air-Gap
    {"epic": "AD-9", "summary": "Create BackendAdapter interface", "points": 5,
     "description": "Define abstract backend operations interface."},
    {"epic": "AD-9", "summary": "Implement CloudAdapter (Supabase-like)", "points": 5,
     "description": "Build cloud backend adapter with full API coverage."},
    {"epic": "AD-9", "summary": "Implement LocalAdapter (Express/PostgreSQL)", "points": 8,
     "description": "Build local backend adapter with direct DB access."},
    {"epic": "AD-9", "summary": "Create Express API server template", "points": 8,
     "description": "Build all endpoints with middleware and error handling."},
    {"epic": "AD-9", "summary": "Implement local authentication (Passport.js)", "points": 5,
     "description": "Add JWT strategy with session and password handling."},
    {"epic": "AD-9", "summary": "Create offline asset bundler", "points": 3,
     "description": "Bundle all dependencies and assets offline."},
    {"epic": "AD-9", "summary": "Create installation scripts", "points": 2,
     "description": "Add Windows installer and PostgreSQL setup."},
    {"epic": "AD-9", "summary": "Document air-gap deployment", "points": 2,
     "description": "Write deployment guide with security considerations."},

    # Epic 10: Testing
    {"epic": "AD-10", "summary": "Set up Vitest for component testing", "points": 3,
     "description": "Configure test runner with coverage and CI integration."},
    {"epic": "AD-10", "summary": "Write unit tests for hooks", "points": 5,
     "description": "Test all hooks with mock API client."},
    {"epic": "AD-10", "summary": "Write integration tests for auth flow", "points": 5,
     "description": "Test login/logout and permission checks."},
    {"epic": "AD-10", "summary": "Create API client tests", "points": 3,
     "description": "Test all methods with error handling."},
    {"epic": "AD-10", "summary": "Write component accessibility tests", "points": 3,
     "description": "Test ARIA compliance and keyboard navigation."},
    {"epic": "AD-10", "summary": "Create comprehensive README and docs", "points": 5,
     "description": "Write installation guide, API reference, and examples."},
]

# =============================================================================
# JIRA API Functions
# =============================================================================

auth = HTTPBasicAuth(JIRA_EMAIL, JIRA_API_TOKEN)
headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
}


def create_epic(epic_data):
    """Create an epic in JIRA."""
    url = f"{JIRA_URL}/rest/api/3/issue"

    payload = {
        "fields": {
            "project": {"key": PROJECT_KEY},
            "summary": epic_data["summary"],
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": epic_data["description"]}]
                    }
                ]
            },
            "issuetype": {"id": EPIC_TYPE_ID},
            "labels": epic_data.get("labels", [])
        }
    }

    response = requests.post(url, headers=headers, auth=auth, json=payload)

    if response.status_code == 201:
        data = response.json()
        return data["key"], data["id"]
    else:
        print(f"  [FAIL] Failed to create epic: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        return None, None


def create_story(story_data, parent_key):
    """Create a story in JIRA linked to an epic."""
    url = f"{JIRA_URL}/rest/api/3/issue"

    payload = {
        "fields": {
            "project": {"key": PROJECT_KEY},
            "summary": story_data["summary"],
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": story_data["description"]}]
                    }
                ]
            },
            "issuetype": {"id": STORY_TYPE_ID},
            "parent": {"key": parent_key},
            STORY_POINTS_FIELD: story_data.get("points", 0)
        }
    }

    response = requests.post(url, headers=headers, auth=auth, json=payload)

    if response.status_code == 201:
        data = response.json()
        return data["key"]
    else:
        print(f"  [FAIL] Failed to create story: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        return None


def main():
    """Main function to import all epics and stories."""
    print("=" * 60)
    print("AIGRC Dashboard Adoption - JIRA Import")
    print("=" * 60)
    print(f"Project: {PROJECT_KEY}")
    print(f"Total Epics: {len(EPICS)}")
    print(f"Total Stories: {len(STORIES)}")
    print()

    # Track created epics
    epic_keys = {}

    # Create epics
    print("Creating Epics...")
    print("-" * 40)
    for epic in EPICS:
        key, id = create_epic(epic)
        if key:
            epic_keys[epic["key"]] = key
            print(f"  [OK] {key} - {epic['summary'][:40]}...")
        time.sleep(0.5)  # Rate limiting

    print()
    print(f"Created {len(epic_keys)}/{len(EPICS)} epics")
    print()

    # Create stories
    print("Creating Stories...")
    print("-" * 40)
    created_stories = 0
    total_points = 0

    for story in STORIES:
        parent_epic = epic_keys.get(story["epic"])
        if not parent_epic:
            print(f"  [SKIP] No parent epic for: {story['summary'][:30]}...")
            continue

        key = create_story(story, parent_epic)
        if key:
            created_stories += 1
            total_points += story.get("points", 0)
            print(f"  [OK] {key} ({story['points']}pts) - {story['summary'][:35]}...")
        time.sleep(0.3)  # Rate limiting

    print()
    print("=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"Epics created: {len(epic_keys)}/{len(EPICS)}")
    print(f"Stories created: {created_stories}/{len(STORIES)}")
    print(f"Total story points: {total_points}")
    print()
    print("View the board at:")
    print(f"  {JIRA_URL}/jira/software/projects/{PROJECT_KEY}/boards")


if __name__ == "__main__":
    main()
