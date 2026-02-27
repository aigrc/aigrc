#!/usr/bin/env node
/**
 * JIRA Import Script for AIGRC Control Plane Project
 *
 * This script creates all Epics and User Stories for the Control Plane
 * Asset Card Management & Organizational Hierarchy project
 *
 * Usage:
 *   Set environment variables:
 *     JIRA_EMAIL=your-email@example.com
 *     JIRA_API_TOKEN=your-api-token
 *
 *   Run:
 *     node scripts/jira-import-control-plane.js
 */

const https = require('https');

// Configuration
const JIRA_HOST = 'aigos.atlassian.net';
const PROJECT_KEY = 'AIG';
const API_TOKEN = process.env.JIRA_API_TOKEN;
const EMAIL = process.env.JIRA_EMAIL;

if (!API_TOKEN || !EMAIL) {
  console.error('Please set JIRA_EMAIL and JIRA_API_TOKEN environment variables');
  process.exit(1);
}

const AUTH = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');

// Control Plane Epics
const EPICS = [
  {
    id: 'AIGRC-CP-E1',
    summary: 'Project Management Foundation',
    description: `Implement the foundational project hierarchy to organize asset cards by business project, enabling scalable management for large organizations.

**Business Value:** Enables organizations with 50+ AI projects to organize, filter, and manage assets at scale. Critical for audit readiness and accountability.

**Acceptance Criteria:**
- Users can create and manage AI projects
- Asset cards can be assigned to projects
- Project-level risk aggregation is visible
- Filtering by project is available across the platform

**Estimated Points:** 37
**Priority:** Highest`,
    priority: 'Highest',
    labels: ['control-plane', 'foundation', 'project-management'],
  },
  {
    id: 'AIGRC-CP-E2',
    summary: 'Asset Card Enhancements',
    description: `Enhance asset card functionality to support project organization and improve usability at scale.

**Business Value:** Improves developer experience and enables efficient asset management for large portfolios.

**Estimated Points:** 21
**Priority:** High`,
    priority: 'High',
    labels: ['control-plane', 'asset-cards', 'enhancements'],
  },
  {
    id: 'AIGRC-CP-E3',
    summary: 'Executive Dashboard',
    description: `Build executive-level dashboards providing organizational risk visibility and compliance status.

**Business Value:** Enables CTO/CISO to monitor AI risk across the organization, essential for board reporting and regulatory compliance.

**Estimated Points:** 26
**Priority:** High`,
    priority: 'High',
    labels: ['control-plane', 'dashboard', 'executive'],
  },
  {
    id: 'AIGRC-CP-E4',
    summary: 'Audit & Compliance Artifacts',
    description: `Implement additional artifacts required for comprehensive AI governance audits.

**Business Value:** Provides complete audit trail and documentation required by EU AI Act, ISO 42001, and internal governance frameworks.

**Estimated Points:** 32
**Priority:** Medium`,
    priority: 'Medium',
    labels: ['control-plane', 'compliance', 'audit'],
  },
  {
    id: 'AIGRC-CP-E5',
    summary: 'Golden Thread Implementation',
    description: `Implement the Intent-to-Evidence (I2E) Golden Thread connecting business justification to deployed systems.

**Business Value:** Core differentiator for AIGRC - provides unbroken chain of accountability from business need to production AI system.

**Estimated Points:** 21
**Priority:** High`,
    priority: 'High',
    labels: ['control-plane', 'golden-thread', 'i2e'],
  },
];

// Control Plane User Stories
const STORIES = [
  // Epic 1: Project Management Foundation
  {
    epicId: 'AIGRC-CP-E1',
    storyId: 'AIGRC-CP-101',
    summary: 'Project Database Schema',
    storyPoints: 3,
    priority: 'Highest',
    description: `**As a** platform administrator
**I want** a database schema for projects
**So that** asset cards can be organized hierarchically

**Acceptance Criteria:**
- [ ] \`projects\` table created with: id, organization_id, name, description, status, owner_id, team, department, created_at, updated_at
- [ ] \`asset_cards.project_id\` foreign key added
- [ ] RLS policies enforce organization isolation
- [ ] Indexes optimized for common queries
- [ ] Migration script tested and documented

**Story Points:** 3
**Priority:** Highest`,
    labels: ['backend', 'database', 'foundation'],
  },
  {
    epicId: 'AIGRC-CP-E1',
    storyId: 'AIGRC-CP-102',
    summary: 'Project CRUD API',
    storyPoints: 5,
    priority: 'Highest',
    description: `**As a** platform engineer
**I want** API functions for project management
**So that** the UI can create, read, update, and delete projects

**Acceptance Criteria:**
- [ ] \`createProject(input)\` - creates new project
- [ ] \`getProjects(organizationId, filters)\` - lists projects with filtering
- [ ] \`getProjectById(id)\` - retrieves single project with stats
- [ ] \`updateProject(id, updates)\` - modifies project details
- [ ] \`deleteProject(id)\` - soft deletes project (archives)
- [ ] \`getProjectStatistics(id)\` - returns asset count, risk breakdown

**Story Points:** 5
**Priority:** Highest
**Dependencies:** AIGRC-CP-101`,
    labels: ['backend', 'api'],
  },
  {
    epicId: 'AIGRC-CP-E1',
    storyId: 'AIGRC-CP-103',
    summary: 'Project List Page',
    storyPoints: 8,
    priority: 'High',
    description: `**As a** governance manager
**I want** a page showing all AI projects
**So that** I can see an overview of all AI initiatives in my organization

**Acceptance Criteria:**
- [ ] Grid view showing project cards
- [ ] Each card displays: name, description, owner, asset count, risk summary
- [ ] Search by project name
- [ ] Filter by: status (active/archived), department, owner
- [ ] Sort by: name, created date, asset count, risk level
- [ ] "New Project" button opens creation modal
- [ ] Click card navigates to project detail

**Story Points:** 8
**Priority:** High
**Dependencies:** AIGRC-CP-102`,
    labels: ['frontend', 'ui'],
  },
  {
    epicId: 'AIGRC-CP-E1',
    storyId: 'AIGRC-CP-104',
    summary: 'Project Detail Page',
    storyPoints: 8,
    priority: 'High',
    description: `**As a** project owner
**I want** a detailed view of my AI project
**So that** I can see all assets, their status, and manage the project

**Acceptance Criteria:**
- [ ] Header: project name, description, status badge, owner, team
- [ ] Stats cards: total assets, by risk level, pending reviews
- [ ] Tabs: Assets | Policies | Activity | Settings
- [ ] Assets tab shows asset cards belonging to this project
- [ ] Edit project button (for owners/admins)
- [ ] Archive project action (with confirmation)

**Story Points:** 8
**Priority:** High
**Dependencies:** AIGRC-CP-102, AIGRC-CP-103`,
    labels: ['frontend', 'ui'],
  },
  {
    epicId: 'AIGRC-CP-E1',
    storyId: 'AIGRC-CP-105',
    summary: 'Create/Edit Project Modal',
    storyPoints: 5,
    priority: 'High',
    description: `**As a** project owner
**I want** to create and edit project details
**So that** I can set up new AI initiatives and maintain accurate information

**Acceptance Criteria:**
- [ ] Form fields: name*, description, department, team, owner, status
- [ ] Validation: name required, max 100 chars
- [ ] Owner dropdown populated from organization users
- [ ] Department/Team can be free text or dropdown (configurable)
- [ ] Save button creates/updates project
- [ ] Cancel closes without saving
- [ ] Loading state during save
- [ ] Error handling with user-friendly messages

**Story Points:** 5
**Priority:** High
**Dependencies:** AIGRC-CP-102`,
    labels: ['frontend', 'ui', 'forms'],
  },
  {
    epicId: 'AIGRC-CP-E1',
    storyId: 'AIGRC-CP-106',
    summary: 'Assign Asset Card to Project',
    storyPoints: 5,
    priority: 'High',
    description: `**As a** developer
**I want** to assign my asset cards to a project
**So that** they are properly organized and visible to project stakeholders

**Acceptance Criteria:**
- [ ] Asset card detail modal shows "Project" field
- [ ] Dropdown lists available projects in organization
- [ ] Can assign/change project from UI
- [ ] \`aigrc push\` CLI supports \`--project\` flag
- [ ] Asset card list can filter by project
- [ ] Bulk assign: select multiple assets, assign to project

**Story Points:** 5
**Priority:** High
**Dependencies:** AIGRC-CP-101, AIGRC-CP-102`,
    labels: ['frontend', 'cli', 'integration'],
  },
  {
    epicId: 'AIGRC-CP-E1',
    storyId: 'AIGRC-CP-107',
    summary: 'Project Navigation Integration',
    storyPoints: 3,
    priority: 'Medium',
    description: `**As a** user
**I want** projects integrated into the main navigation
**So that** I can easily access project management features

**Acceptance Criteria:**
- [ ] "Projects" added to sidebar navigation (with FolderKanban icon)
- [ ] Position: after Dashboard, before Asset Cards
- [ ] Route: \`/projects\` for list, \`/projects/:id\` for detail
- [ ] Breadcrumb navigation: Projects > Project Name > Asset Card
- [ ] Asset Cards page shows project column in table

**Story Points:** 3
**Priority:** Medium
**Dependencies:** AIGRC-CP-103, AIGRC-CP-104`,
    labels: ['frontend', 'navigation'],
  },

  // Epic 2: Asset Card Enhancements
  {
    epicId: 'AIGRC-CP-E2',
    storyId: 'AIGRC-CP-201',
    summary: 'Asset Card Project Column',
    storyPoints: 3,
    priority: 'High',
    description: `**As a** governance manager
**I want** to see which project each asset belongs to
**So that** I can understand organizational context when reviewing assets

**Acceptance Criteria:**
- [ ] Asset card table shows "Project" column
- [ ] Project name is clickable, links to project detail
- [ ] Column is sortable
- [ ] "Unassigned" shown for assets without project
- [ ] Filter dropdown includes project filter

**Story Points:** 3
**Priority:** High
**Dependencies:** AIGRC-CP-106`,
    labels: ['frontend', 'ui'],
  },
  {
    epicId: 'AIGRC-CP-E2',
    storyId: 'AIGRC-CP-202',
    summary: 'Asset Card Bulk Actions',
    storyPoints: 5,
    priority: 'Medium',
    description: `**As a** project manager
**I want** to perform bulk actions on asset cards
**So that** I can efficiently manage large numbers of assets

**Acceptance Criteria:**
- [ ] Checkbox column for multi-select
- [ ] "Select all" in header
- [ ] Bulk action toolbar appears when items selected
- [ ] Actions: Assign to Project, Change Status, Export
- [ ] Confirmation dialog for destructive actions
- [ ] Progress indicator for bulk operations

**Story Points:** 5
**Priority:** Medium`,
    labels: ['frontend', 'ui'],
  },
  {
    epicId: 'AIGRC-CP-E2',
    storyId: 'AIGRC-CP-203',
    summary: 'Asset Card Advanced Filters',
    storyPoints: 8,
    priority: 'Medium',
    description: `**As an** auditor
**I want** advanced filtering options
**So that** I can quickly find assets matching specific criteria

**Acceptance Criteria:**
- [ ] Filter by: risk level, project, owner, team, status, synced_from
- [ ] Date range filter: created, updated, last synced
- [ ] Risk factors filter: PII processing, autonomous decisions, etc.
- [ ] Save filter presets
- [ ] Clear all filters button
- [ ] URL reflects filter state (shareable links)

**Story Points:** 8
**Priority:** Medium`,
    labels: ['frontend', 'ui', 'filters'],
  },
  {
    epicId: 'AIGRC-CP-E2',
    storyId: 'AIGRC-CP-204',
    summary: 'CLI Project Support',
    storyPoints: 5,
    priority: 'Medium',
    description: `**As a** developer
**I want** to specify a project when pushing asset cards
**So that** my assets are automatically organized correctly

**Acceptance Criteria:**
- [ ] \`aigrc push --project <name-or-id>\` flag added
- [ ] \`AIGRC_PROJECT_ID\` environment variable supported
- [ ] \`.aigrc.yaml\` config file supports \`defaultProject\` setting
- [ ] \`aigrc projects list\` command shows available projects
- [ ] \`aigrc projects create\` command creates new project
- [ ] Error message if project not found

**Story Points:** 5
**Priority:** Medium
**Dependencies:** AIGRC-CP-101`,
    labels: ['cli', 'developer-experience'],
  },

  // Epic 3: Executive Dashboard
  {
    epicId: 'AIGRC-CP-E3',
    storyId: 'AIGRC-CP-301',
    summary: 'Risk Distribution Dashboard',
    storyPoints: 8,
    priority: 'High',
    description: `**As a** CISO
**I want** a visual overview of AI risk distribution
**So that** I can identify areas requiring attention and report to leadership

**Acceptance Criteria:**
- [ ] Pie/donut chart: assets by risk level
- [ ] Bar chart: risk distribution by department/project
- [ ] Trend line: risk level changes over time
- [ ] Click-through to filtered asset list
- [ ] Export chart as image/PDF

**Story Points:** 8
**Priority:** High`,
    labels: ['frontend', 'dashboard', 'charts'],
  },
  {
    epicId: 'AIGRC-CP-E3',
    storyId: 'AIGRC-CP-302',
    summary: 'Compliance Score Widget',
    storyPoints: 8,
    priority: 'High',
    description: `**As an** executive
**I want** a compliance score for my organization
**So that** I can quickly assess our AI governance posture

**Acceptance Criteria:**
- [ ] Overall compliance score (0-100%)
- [ ] Score breakdown: documentation %, review %, policy coverage %
- [ ] Score trend over last 30/90 days
- [ ] Color coding: green (>80%), yellow (60-80%), red (<60%)
- [ ] Drill-down to see contributing factors

**Story Points:** 8
**Priority:** High`,
    labels: ['frontend', 'dashboard', 'metrics'],
  },
  {
    epicId: 'AIGRC-CP-E3',
    storyId: 'AIGRC-CP-303',
    summary: 'Pending Actions Widget',
    storyPoints: 5,
    priority: 'Medium',
    description: `**As a** governance manager
**I want** to see pending governance actions
**So that** I can prioritize work and ensure nothing is overdue

**Acceptance Criteria:**
- [ ] Count of: pending reviews, awaiting approvals, policy gaps
- [ ] List of overdue items with age
- [ ] Quick action buttons: Review, Approve, Assign
- [ ] Filter by: my items, my team, all

**Story Points:** 5
**Priority:** Medium`,
    labels: ['frontend', 'dashboard', 'workflow'],
  },
  {
    epicId: 'AIGRC-CP-E3',
    storyId: 'AIGRC-CP-304',
    summary: 'Project Health Overview',
    storyPoints: 5,
    priority: 'Medium',
    description: `**As a** CTO
**I want** to see health status of all AI projects
**So that** I can identify struggling projects needing support

**Acceptance Criteria:**
- [ ] Table/grid of all projects
- [ ] Health indicators: risk score, compliance %, last activity
- [ ] Sort by health score (worst first)
- [ ] Sparkline showing trend
- [ ] Click to navigate to project detail

**Story Points:** 5
**Priority:** Medium
**Dependencies:** AIGRC-CP-103`,
    labels: ['frontend', 'dashboard'],
  },

  // Epic 4: Audit & Compliance Artifacts
  {
    epicId: 'AIGRC-CP-E4',
    storyId: 'AIGRC-CP-401',
    summary: 'Model Cards Schema & UI',
    storyPoints: 8,
    priority: 'Medium',
    description: `**As a** ML engineer
**I want** to document my models with Model Cards
**So that** model details are captured for governance and reproducibility

**Acceptance Criteria:**
- [ ] \`model_cards\` table with standard fields (based on Google Model Cards)
- [ ] Model card linked to asset card (1 asset : many models)
- [ ] UI to create/edit model cards within asset detail
- [ ] Fields: model name, version, training data, metrics, limitations, ethical considerations
- [ ] Export model card as markdown/PDF

**Story Points:** 8
**Priority:** Medium`,
    labels: ['backend', 'frontend', 'ml-governance'],
  },
  {
    epicId: 'AIGRC-CP-E4',
    storyId: 'AIGRC-CP-402',
    summary: 'Approval Records (Golden Thread)',
    storyPoints: 8,
    priority: 'High',
    description: `**As an** auditor
**I want** to see the approval history for each asset
**So that** I can verify proper governance was followed

**Acceptance Criteria:**
- [ ] \`approval_records\` table: asset_id, approver, role, decision, conditions, date
- [ ] Approval timeline in asset detail (vertical timeline UI)
- [ ] Approval types: initial, change, periodic review
- [ ] Link to evidence/documentation
- [ ] Required approvals based on risk level (configurable)

**Story Points:** 8
**Priority:** High`,
    labels: ['backend', 'frontend', 'compliance'],
  },
  {
    epicId: 'AIGRC-CP-E4',
    storyId: 'AIGRC-CP-403',
    summary: 'Compliance Review Records',
    storyPoints: 8,
    priority: 'Medium',
    description: `**As a** compliance officer
**I want** to schedule and track periodic reviews
**So that** assets are reviewed according to policy requirements

**Acceptance Criteria:**
- [ ] \`compliance_reviews\` table: asset_id, review_type, reviewer, findings, next_review_date
- [ ] Review schedule based on risk level (high=quarterly, limited=annual)
- [ ] Due/overdue review notifications
- [ ] Review completion workflow
- [ ] Review history in asset detail

**Story Points:** 8
**Priority:** Medium`,
    labels: ['backend', 'frontend', 'compliance', 'workflow'],
  },
  {
    epicId: 'AIGRC-CP-E4',
    storyId: 'AIGRC-CP-404',
    summary: 'Audit Export',
    storyPoints: 8,
    priority: 'Medium',
    description: `**As an** auditor
**I want** to export a complete audit package
**So that** I can provide evidence to regulators or external auditors

**Acceptance Criteria:**
- [ ] Export single asset: card + model cards + approvals + reviews
- [ ] Export project: all assets with artifacts
- [ ] Export organization: full inventory
- [ ] Formats: PDF report, JSON data, CSV summary
- [ ] Include timestamps and data integrity hash

**Story Points:** 8
**Priority:** Medium`,
    labels: ['backend', 'export', 'compliance'],
  },

  // Epic 5: Golden Thread Implementation
  {
    epicId: 'AIGRC-CP-E5',
    storyId: 'AIGRC-CP-501',
    summary: 'Golden Thread Visualization',
    storyPoints: 8,
    priority: 'High',
    description: `**As a** governance manager
**I want** to visualize the Golden Thread for each asset
**So that** I can verify the chain of accountability is complete

**Acceptance Criteria:**
- [ ] Visual flow: Business Need -> Approval -> Development -> Deployment -> Monitoring
- [ ] Each node shows: who, when, evidence link
- [ ] Missing/incomplete nodes highlighted in red
- [ ] Click node to see details
- [ ] Completeness percentage indicator

**Story Points:** 8
**Priority:** High`,
    labels: ['frontend', 'golden-thread', 'visualization'],
  },
  {
    epicId: 'AIGRC-CP-E5',
    storyId: 'AIGRC-CP-502',
    summary: 'Intent Declaration',
    storyPoints: 8,
    priority: 'Medium',
    description: `**As a** project sponsor
**I want** to declare the business intent for an AI system
**So that** the justification is documented before development begins

**Acceptance Criteria:**
- [ ] Intent form: business need, expected outcomes, stakeholders, risk assessment
- [ ] Intent must be created before asset card (optional enforcement)
- [ ] Intent approval workflow
- [ ] Link intent to resulting asset cards
- [ ] Intent template library for common use cases

**Story Points:** 8
**Priority:** Medium`,
    labels: ['frontend', 'golden-thread', 'workflow'],
  },
  {
    epicId: 'AIGRC-CP-E5',
    storyId: 'AIGRC-CP-503',
    summary: 'Evidence Linking',
    storyPoints: 5,
    priority: 'Medium',
    description: `**As a** developer
**I want** to attach evidence to Golden Thread nodes
**So that** auditors can verify each step was properly completed

**Acceptance Criteria:**
- [ ] Upload documents (PDF, images)
- [ ] Link to external URLs (Confluence, Jira, GitHub)
- [ ] Link to other AIGRC artifacts (policies, reviews)
- [ ] Evidence metadata: type, upload date, uploader
- [ ] Evidence integrity verification (hash)

**Story Points:** 5
**Priority:** Medium`,
    labels: ['backend', 'frontend', 'golden-thread'],
  },
];

// Priority mapping
const PRIORITY_MAP = {
  'Highest': '1',
  'High': '2',
  'Medium': '3',
  'Low': '4',
  'Lowest': '5',
};

// Helper function to make API requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: JIRA_HOST,
      port: 443,
      path: `/rest/api/3${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Get project metadata
async function getProjectMeta() {
  console.log('Fetching project metadata...');
  try {
    const project = await makeRequest('GET', `/project/${PROJECT_KEY}`);
    console.log(`Project: ${project.name} (${project.key})`);
    return project;
  } catch (error) {
    console.error('Failed to fetch project:', error.message);
    throw error;
  }
}

// Get issue types
async function getIssueTypes() {
  console.log('Fetching issue types...');
  const meta = await makeRequest('GET', `/issue/createmeta?projectKeys=${PROJECT_KEY}&expand=projects.issuetypes.fields`);
  const project = meta.projects.find(p => p.key === PROJECT_KEY);
  if (!project) {
    throw new Error(`Project ${PROJECT_KEY} not found`);
  }
  const issueTypes = {};
  for (const type of project.issuetypes) {
    issueTypes[type.name.toLowerCase()] = type.id;
  }
  console.log('Issue types:', Object.keys(issueTypes));
  return issueTypes;
}

// Create an Epic
async function createEpic(epic, issueTypes) {
  const epicTypeId = issueTypes['epic'];
  if (!epicTypeId) {
    throw new Error('Epic issue type not found');
  }

  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      issuetype: { id: epicTypeId },
      summary: `[${epic.id}] ${epic.summary}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: epic.description }]
          }
        ]
      },
      labels: epic.labels,
    }
  };

  console.log(`Creating Epic: ${epic.summary}`);
  const result = await makeRequest('POST', '/issue', body);
  console.log(`  Created: ${result.key}`);
  return result.key;
}

// Create a Story
async function createStory(story, epicKey, issueTypes) {
  const storyTypeId = issueTypes['story'] || issueTypes['task'];
  if (!storyTypeId) {
    throw new Error('Story/Task issue type not found');
  }

  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      issuetype: { id: storyTypeId },
      summary: `[${story.storyId}] ${story.summary}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: story.description }]
          }
        ]
      },
      labels: story.labels,
    }
  };

  // Link to Epic if we have the field
  if (epicKey) {
    body.fields.parent = { key: epicKey };  // For next-gen projects
  }

  console.log(`  Creating Story: [${story.storyId}] ${story.summary}`);
  const result = await makeRequest('POST', '/issue', body);
  console.log(`    Created: ${result.key}`);
  return result.key;
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('AIGRC Control Plane - JIRA Import Script');
  console.log('Asset Card Management & Organizational Hierarchy');
  console.log('='.repeat(60));
  console.log('');

  try {
    await getProjectMeta();
    const issueTypes = await getIssueTypes();

    console.log('');
    console.log('Creating Epics and Stories...');
    console.log('-'.repeat(60));

    const epicKeyMap = {};

    // Create all Epics first
    for (const epic of EPICS) {
      const epicKey = await createEpic(epic, issueTypes);
      epicKeyMap[epic.id] = epicKey;
    }

    console.log('');
    console.log('Epics created. Now creating Stories...');
    console.log('-'.repeat(60));

    // Create all Stories
    for (const story of STORIES) {
      const epicKey = epicKeyMap[story.epicId];
      await createStory(story, epicKey, issueTypes);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Import Complete!');
    console.log(`Created ${EPICS.length} Epics and ${STORIES.length} Stories`);
    console.log('');
    console.log('Summary:');
    console.log('  - Epic 1: Project Management Foundation (7 stories)');
    console.log('  - Epic 2: Asset Card Enhancements (4 stories)');
    console.log('  - Epic 3: Executive Dashboard (4 stories)');
    console.log('  - Epic 4: Audit & Compliance Artifacts (4 stories)');
    console.log('  - Epic 5: Golden Thread Implementation (3 stories)');
    console.log('');
    console.log(`View in Jira: https://${JIRA_HOST}/browse/${PROJECT_KEY}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

main();
