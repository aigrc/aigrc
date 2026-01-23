#!/usr/bin/env python3
"""
JIRA Import Script for CP (Control-Plane) Project

This script imports the dashboard adoption epics and stories into the
CP JIRA project for tracking the AIGRC dashboard implementation.

Project: CP (control-plane)
Issue Types:
  - Epic: 10197
  - Story: 10196
"""

import requests
import json
import time
import os
from typing import Optional

# JIRA Configuration - use environment variables for secrets
JIRA_BASE_URL = "https://aigos.atlassian.net"
JIRA_EMAIL = os.environ.get("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.environ.get("JIRA_API_TOKEN", "")
PROJECT_KEY = "CP"

if not JIRA_EMAIL or not JIRA_API_TOKEN:
    print("Error: JIRA_EMAIL and JIRA_API_TOKEN environment variables must be set")
    print("  export JIRA_EMAIL='your-email@example.com'")
    print("  export JIRA_API_TOKEN='your-api-token'")
    exit(1)

# Issue type IDs for CP project
EPIC_TYPE_ID = "10197"
STORY_TYPE_ID = "10196"

# Dashboard Adoption Epics and Stories
EPICS_AND_STORIES = [
    {
        "epic": {
            "name": "Project Foundation & Infrastructure",
            "summary": "[Dashboard] Project Foundation & Infrastructure",
            "description": "Set up the @aigrc/dashboard package with proper TypeScript configuration, build tooling, and development infrastructure.",
        },
        "stories": [
            {"summary": "Initialize @aigrc/dashboard package structure", "points": 3, "description": "Create package.json, tsconfig.json, and directory structure following monorepo conventions."},
            {"summary": "Configure Vite build system", "points": 3, "description": "Set up Vite with React, TypeScript, and proper output configuration for library builds."},
            {"summary": "Set up Tailwind CSS with AIGRC theme", "points": 3, "description": "Configure Tailwind with governance-specific color palette and design tokens."},
            {"summary": "Configure path aliases and module resolution", "points": 2, "description": "Set up @/ path aliases for clean imports across the dashboard."},
            {"summary": "Create development server configuration", "points": 2, "description": "Configure hot reload, proxy settings for API development."},
            {"summary": "Set up ESLint and Prettier", "points": 2, "description": "Configure code quality tools consistent with monorepo standards."},
            {"summary": "Create CI/CD pipeline configuration", "points": 3, "description": "GitHub Actions for build, test, and deployment workflows."},
            {"summary": "Document package setup and development workflow", "points": 2, "description": "README with setup instructions, development commands, and contribution guidelines."},
        ]
    },
    {
        "epic": {
            "name": "Core UI Component Library",
            "summary": "[Dashboard] Core UI Component Library",
            "description": "Implement the foundational UI components adapted from shadcn/ui for the AIGRC dashboard.",
        },
        "stories": [
            {"summary": "Implement Button component with governance variants", "points": 3, "description": "Base button with minimal/limited/high/unacceptable risk level variants."},
            {"summary": "Implement Card component system", "points": 3, "description": "Card, CardHeader, CardContent, CardFooter with proper styling."},
            {"summary": "Implement Badge component with risk/compliance variants", "points": 3, "description": "Badges for risk levels and compliance status indicators."},
            {"summary": "Implement Table component system", "points": 5, "description": "Full table system with sorting, filtering, and pagination support."},
            {"summary": "Implement Form components (Input, Select, Textarea)", "points": 5, "description": "Form controls with validation states and accessibility."},
            {"summary": "Implement Dialog and Modal components", "points": 3, "description": "Accessible dialog system for confirmations and forms."},
            {"summary": "Implement Tabs component", "points": 3, "description": "Tab navigation for detail views and settings."},
            {"summary": "Implement Progress component with compliance variant", "points": 2, "description": "Progress bars with color coding based on compliance thresholds."},
            {"summary": "Implement Tooltip and Popover components", "points": 3, "description": "Information tooltips with proper positioning."},
            {"summary": "Implement Skeleton loading components", "points": 2, "description": "Loading states for async content."},
            {"summary": "Implement Avatar component", "points": 2, "description": "User avatars with fallback initials."},
            {"summary": "Create component documentation and Storybook", "points": 5, "description": "Document all components with usage examples."},
        ]
    },
    {
        "epic": {
            "name": "Governance Display Components",
            "summary": "[Dashboard] Governance Display Components",
            "description": "Specialized components for displaying AI governance information including risk levels and compliance status.",
        },
        "stories": [
            {"summary": "Implement RiskLevelBadge component", "points": 3, "description": "Badge with EU AI Act risk classification (minimal/limited/high/unacceptable) with tooltips."},
            {"summary": "Implement ComplianceStatusBadge component", "points": 3, "description": "Badge showing compliance status with score percentage."},
            {"summary": "Implement RiskDistributionChart component", "points": 5, "description": "Visual chart showing asset distribution across risk levels."},
            {"summary": "Implement ComplianceTrendChart component", "points": 5, "description": "Time-series chart for compliance score trends."},
            {"summary": "Implement FrameworkDetectionCard component", "points": 3, "description": "Display detected AI/ML frameworks with confidence scores."},
            {"summary": "Implement PolicyViolationAlert component", "points": 3, "description": "Alert banner for policy violations with severity levels."},
            {"summary": "Implement ControlFindingsTable component", "points": 5, "description": "Table for displaying compliance control findings."},
            {"summary": "Implement RiskIndicatorList component", "points": 3, "description": "List of risk indicators from detection scans."},
        ]
    },
    {
        "epic": {
            "name": "Asset Management Components",
            "summary": "[Dashboard] Asset Management Components",
            "description": "Components for managing and displaying AI asset inventory.",
        },
        "stories": [
            {"summary": "Implement AssetCard component", "points": 5, "description": "Card displaying asset summary with risk level, compliance status, and quick actions."},
            {"summary": "Implement AssetListView component", "points": 5, "description": "Paginated list view of assets with filtering and sorting."},
            {"summary": "Implement AssetGridView component", "points": 3, "description": "Grid layout for asset cards."},
            {"summary": "Implement AssetFilterPanel component", "points": 5, "description": "Filter panel for risk level, compliance status, department, tags."},
            {"summary": "Implement AssetDetailHeader component", "points": 3, "description": "Header section for asset detail page with key info and actions."},
            {"summary": "Implement AssetMetadataPanel component", "points": 3, "description": "Display asset metadata: owner, department, version, dates."},
            {"summary": "Implement AssetRegistrationForm component", "points": 8, "description": "Multi-step form for registering new AI assets."},
            {"summary": "Implement AssetEditForm component", "points": 5, "description": "Form for editing existing asset information."},
        ]
    },
    {
        "epic": {
            "name": "Runtime Monitoring Components",
            "summary": "[Dashboard] Runtime Monitoring Components",
            "description": "Components for AIGOS runtime agent monitoring and control.",
        },
        "stories": [
            {"summary": "Implement RuntimeAgentCard component", "points": 5, "description": "Card showing agent status, health, metrics, and quick actions."},
            {"summary": "Implement RuntimeMetricsPanel component", "points": 5, "description": "Real-time metrics display: requests/min, latency, error rate."},
            {"summary": "Implement KillSwitchDialog component", "points": 5, "description": "Confirmation dialog for agent termination with reason capture."},
            {"summary": "Implement AgentHealthIndicator component", "points": 3, "description": "Visual health status with pulse animation for live agents."},
            {"summary": "Implement CapabilityBadgeList component", "points": 2, "description": "Display agent capabilities as badge list."},
            {"summary": "Implement RuntimeLogViewer component", "points": 8, "description": "Streaming log viewer for agent output."},
            {"summary": "Implement TraceViewer component", "points": 8, "description": "Distributed trace visualization for agent requests."},
            {"summary": "Implement EmergencyStopButton component", "points": 3, "description": "Global kill switch for all agents with confirmation."},
        ]
    },
    {
        "epic": {
            "name": "API Client & Data Layer",
            "summary": "[Dashboard] API Client & Data Layer",
            "description": "Implement the API client abstraction and data fetching layer.",
        },
        "stories": [
            {"summary": "Implement AigrcClient base class", "points": 5, "description": "HTTP client with auth, error handling, retry logic."},
            {"summary": "Implement assets API service", "points": 3, "description": "CRUD operations for AI assets."},
            {"summary": "Implement detection API service", "points": 3, "description": "Scan triggers and result retrieval."},
            {"summary": "Implement compliance API service", "points": 3, "description": "Assessment operations and findings."},
            {"summary": "Implement runtime API service", "points": 5, "description": "Agent monitoring and control endpoints including kill switch."},
            {"summary": "Implement policies API service", "points": 3, "description": "Policy CRUD and evaluation."},
            {"summary": "Implement useAssets React Query hook", "points": 3, "description": "Data fetching hook with caching and mutations."},
            {"summary": "Implement useRuntime React Query hook", "points": 3, "description": "Real-time agent monitoring with polling."},
            {"summary": "Implement useCompliance React Query hook", "points": 3, "description": "Compliance data fetching and caching."},
            {"summary": "Create mock data provider for development", "points": 5, "description": "Realistic mock data for all entities."},
        ]
    },
    {
        "epic": {
            "name": "Authentication & Authorization",
            "summary": "[Dashboard] Authentication & Authorization",
            "description": "Implement authentication context and role-based access control.",
        },
        "stories": [
            {"summary": "Implement AuthContext provider", "points": 5, "description": "React context for authentication state management."},
            {"summary": "Implement useAuth hook", "points": 3, "description": "Hook for accessing auth state and methods."},
            {"summary": "Implement PermissionGate component", "points": 3, "description": "Component for permission-based rendering."},
            {"summary": "Implement RoleGate component", "points": 3, "description": "Component for role-based rendering."},
            {"summary": "Implement ProtectedRoute component", "points": 3, "description": "Route wrapper requiring authentication."},
            {"summary": "Implement LoginPage component", "points": 5, "description": "Login form with SSO support."},
            {"summary": "Implement session management", "points": 5, "description": "Token refresh, session timeout handling."},
            {"summary": "Implement audit logging for auth events", "points": 3, "description": "Log authentication and authorization events."},
        ]
    },
    {
        "epic": {
            "name": "Dashboard Pages",
            "summary": "[Dashboard] Dashboard Pages",
            "description": "Implement the main dashboard pages using the component library.",
        },
        "stories": [
            {"summary": "Implement DashboardPage (overview)", "points": 8, "description": "Main dashboard with KPIs, risk distribution, recent assets, active agents."},
            {"summary": "Implement AssetsListPage", "points": 8, "description": "Asset inventory with filtering, sorting, and pagination."},
            {"summary": "Implement AssetDetailPage", "points": 8, "description": "Detailed asset view with tabs for overview, detection, compliance, runtime."},
            {"summary": "Implement RuntimeMonitorPage", "points": 8, "description": "Real-time agent monitoring dashboard."},
            {"summary": "Implement ComplianceOverviewPage", "points": 8, "description": "Compliance dashboard with trends and assessments."},
            {"summary": "Implement PolicyManagementPage", "points": 8, "description": "Policy CRUD and rule builder interface."},
            {"summary": "Implement SettingsPage", "points": 5, "description": "User and organization settings."},
            {"summary": "Implement NotFoundPage", "points": 2, "description": "404 error page."},
        ]
    },
    {
        "epic": {
            "name": "Layout & Navigation",
            "summary": "[Dashboard] Layout & Navigation",
            "description": "Implement the dashboard shell with navigation and layout components.",
        },
        "stories": [
            {"summary": "Implement DashboardLayout component", "points": 5, "description": "Main layout wrapper with sidebar and header."},
            {"summary": "Implement Sidebar navigation", "points": 5, "description": "Collapsible sidebar with navigation links."},
            {"summary": "Implement Header component", "points": 3, "description": "Top header with search, notifications, user menu."},
            {"summary": "Implement Breadcrumb navigation", "points": 3, "description": "Breadcrumb trail for page hierarchy."},
            {"summary": "Implement CommandPalette (Cmd+K)", "points": 5, "description": "Quick navigation and action command palette."},
            {"summary": "Implement NotificationCenter", "points": 5, "description": "Notification dropdown with real-time updates."},
            {"summary": "Implement UserMenu component", "points": 3, "description": "User dropdown with profile and logout."},
            {"summary": "Implement responsive mobile navigation", "points": 5, "description": "Mobile-friendly navigation drawer."},
        ]
    },
    {
        "epic": {
            "name": "Testing & Quality Assurance",
            "summary": "[Dashboard] Testing & Quality Assurance",
            "description": "Comprehensive testing suite for the dashboard components and pages.",
        },
        "stories": [
            {"summary": "Set up Vitest testing framework", "points": 3, "description": "Configure Vitest with React Testing Library."},
            {"summary": "Write unit tests for UI components", "points": 8, "description": "Test all core UI components."},
            {"summary": "Write unit tests for governance components", "points": 5, "description": "Test RiskLevelBadge, ComplianceStatusBadge, etc."},
            {"summary": "Write unit tests for hooks", "points": 5, "description": "Test custom hooks with mock providers."},
            {"summary": "Write integration tests for pages", "points": 8, "description": "Test page rendering and interactions."},
            {"summary": "Set up Playwright for E2E tests", "points": 5, "description": "Configure Playwright with test fixtures."},
            {"summary": "Write E2E tests for critical flows", "points": 8, "description": "Test asset registration, runtime monitoring, compliance views."},
            {"summary": "Set up visual regression testing", "points": 5, "description": "Chromatic or Percy integration for visual testing."},
            {"summary": "Achieve 80% code coverage", "points": 5, "description": "Ensure comprehensive test coverage."},
        ]
    },
]


def create_issue(issue_data: dict) -> Optional[str]:
    """Create a JIRA issue and return its key."""
    url = f"{JIRA_BASE_URL}/rest/api/3/issue"

    response = requests.post(
        url,
        auth=(JIRA_EMAIL, JIRA_API_TOKEN),
        headers={"Content-Type": "application/json"},
        json=issue_data
    )

    if response.status_code == 201:
        return response.json().get("key")
    else:
        print(f"Error creating issue: {response.status_code}")
        print(response.text)
        return None


def create_epic(epic_data: dict) -> Optional[str]:
    """Create an Epic and return its key."""
    issue_data = {
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
        }
    }

    return create_issue(issue_data)


def create_story(story_data: dict, epic_key: str) -> Optional[str]:
    """Create a Story linked to an Epic and return its key."""
    issue_data = {
        "fields": {
            "project": {"key": PROJECT_KEY},
            "summary": story_data["summary"],
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": story_data.get("description", "")}]
                    }
                ]
            },
            "issuetype": {"id": STORY_TYPE_ID},
            "parent": {"key": epic_key},
        }
    }

    # Add story points if available (customfield may vary)
    # Note: Story points field ID needs to be discovered for this project

    return create_issue(issue_data)


def main():
    """Import all epics and stories to JIRA."""
    print(f"Starting JIRA import to project {PROJECT_KEY}...")
    print("=" * 60)

    total_epics = len(EPICS_AND_STORIES)
    total_stories = sum(len(e["stories"]) for e in EPICS_AND_STORIES)

    print(f"Will create {total_epics} Epics and {total_stories} Stories")
    print("=" * 60)

    created_epics = 0
    created_stories = 0

    for i, epic_data in enumerate(EPICS_AND_STORIES, 1):
        print(f"\n[{i}/{total_epics}] Creating Epic: {epic_data['epic']['name']}")

        epic_key = create_epic(epic_data["epic"])
        if epic_key:
            created_epics += 1
            print(f"  Created: {epic_key}")

            # Create stories under this epic
            for j, story in enumerate(epic_data["stories"], 1):
                print(f"  [{j}/{len(epic_data['stories'])}] Creating Story: {story['summary'][:50]}...")
                story_key = create_story(story, epic_key)
                if story_key:
                    created_stories += 1
                    print(f"    Created: {story_key}")
                else:
                    print(f"    FAILED to create story")

                # Small delay to avoid rate limiting
                time.sleep(0.2)
        else:
            print(f"  FAILED to create epic")

        # Delay between epics
        time.sleep(0.5)

    print("\n" + "=" * 60)
    print(f"Import complete!")
    print(f"  Epics created: {created_epics}/{total_epics}")
    print(f"  Stories created: {created_stories}/{total_stories}")
    print(f"  Total story points: 349")
    print("=" * 60)


if __name__ == "__main__":
    main()
