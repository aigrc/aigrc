# AIGRC Dashboard Adoption - JIRA Epic/Story Structure

This document defines the JIRA epic and story structure for adopting the aftrbell/NguzoPlatform codebase as the `@aigrc/dashboard` package.

## Project: AIGRC Dashboard (AD)

**Board**: AIGRC Dashboard Development
**Sprint Duration**: 2 weeks

---

## Epic Overview

| Epic ID | Epic Name | Stories | Points | Priority |
|---------|-----------|---------|--------|----------|
| AD-1 | Foundation & Package Setup | 8 | 34 | P0 |
| AD-2 | UI Component Library | 12 | 48 | P0 |
| AD-3 | Authentication & Authorization | 8 | 32 | P0 |
| AD-4 | Asset Management UI | 10 | 42 | P1 |
| AD-5 | Detection Results UI | 6 | 24 | P1 |
| AD-6 | Compliance Dashboard | 8 | 36 | P1 |
| AD-7 | Runtime Governance UI | 10 | 44 | P1 |
| AD-8 | Dashboard Analytics | 6 | 28 | P2 |
| AD-9 | Air-Gap Variant | 8 | 38 | P2 |
| AD-10 | Testing & Documentation | 6 | 24 | P2 |
| **Total** | | **82** | **350** | |

---

## Epic 1: Foundation & Package Setup (AD-1)

**Description**: Set up the `@aigrc/dashboard` package structure, build configuration, and core dependencies.

**Priority**: P0 (Critical Path)
**Estimated Points**: 34

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-1-1 | Create package.json with dependencies | 3 | - All React/Radix dependencies defined<br>- Workspace dependency on @aigrc/core<br>- Build scripts configured |
| AD-1-2 | Configure TypeScript for dashboard | 3 | - tsconfig.json with strict mode<br>- Path aliases configured<br>- Composite project references |
| AD-1-3 | Set up Vite build configuration | 5 | - Dev server working<br>- Production build outputs CJS/ESM<br>- Library mode configured |
| AD-1-4 | Configure Tailwind CSS with AIGRC theme | 5 | - Base shadcn theme imported<br>- Governance colors defined<br>- Dark mode support |
| AD-1-5 | Create core utility functions | 3 | - cn() for class merging<br>- Date formatting utils<br>- Risk/compliance color helpers |
| AD-1-6 | Set up ESLint and Prettier | 3 | - ESLint rules matching monorepo<br>- Prettier config<br>- Pre-commit hooks |
| AD-1-7 | Create type definitions | 5 | - All AIGRC types defined<br>- Matches @aigrc/core schemas<br>- Export from package |
| AD-1-8 | Configure package exports | 5 | - Components exported<br>- Hooks exported<br>- Types exported |

---

## Epic 2: UI Component Library (AD-2)

**Description**: Adopt and adapt shadcn/ui components from aftrbell for AIGRC use cases.

**Priority**: P0 (Critical Path)
**Estimated Points**: 48

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-2-1 | Adopt Button component with governance variants | 3 | - All base variants<br>- Risk level variants (minimal, limited, high, unacceptable)<br>- Compliance variants |
| AD-2-2 | Adopt Card component | 2 | - Card, CardHeader, CardContent, CardFooter<br>- Matches AIGRC theme |
| AD-2-3 | Adopt Badge component with risk variants | 3 | - Risk level badges<br>- Compliance status badges<br>- Framework badges |
| AD-2-4 | Adopt Table components | 3 | - Full table primitives<br>- Sortable headers<br>- Pagination support |
| AD-2-5 | Adopt Form components (Input, Select, Textarea) | 5 | - All form primitives<br>- Validation states<br>- Accessibility |
| AD-2-6 | Adopt Dialog and Modal components | 5 | - Dialog primitives<br>- Confirmation dialogs<br>- Form dialogs |
| AD-2-7 | Adopt Navigation components (Tabs, Menu) | 5 | - Tabs component<br>- Dropdown menu<br>- Navigation menu |
| AD-2-8 | Adopt Feedback components (Toast, Alert) | 5 | - Toast notifications<br>- Alert variants<br>- Progress indicators |
| AD-2-9 | Adopt Data display components (Skeleton, Avatar) | 3 | - Loading skeletons<br>- Avatar component<br>- Empty states |
| AD-2-10 | Create RiskLevelBadge component | 5 | - Visual indicator for risk levels<br>- Tooltip with description<br>- Animated transitions |
| AD-2-11 | Create ComplianceStatusBadge component | 5 | - Compliant/Partial/Non-compliant states<br>- Score display<br>- Trend indicator |
| AD-2-12 | Create component documentation with Storybook | 5 | - All components documented<br>- Interactive examples<br>- Props documentation |

---

## Epic 3: Authentication & Authorization (AD-3)

**Description**: Implement authentication context and permission-based access control.

**Priority**: P0 (Critical Path)
**Estimated Points**: 32

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-3-1 | Create AuthContext provider | 5 | - User state management<br>- Token persistence<br>- Auto-refresh logic |
| AD-3-2 | Implement login/logout flow | 5 | - Login form<br>- Logout handling<br>- Token storage |
| AD-3-3 | Create ProtectedRoute component | 3 | - Redirect to login if unauthenticated<br>- Loading state<br>- Error handling |
| AD-3-4 | Create PermissionGate component | 3 | - Permission-based rendering<br>- Fallback content<br>- Multiple permission support |
| AD-3-5 | Create RoleGate component | 3 | - Role-based rendering<br>- Role hierarchy support<br>- Fallback content |
| AD-3-6 | Implement organization switching | 5 | - Multi-org support<br>- Context updates<br>- API client updates |
| AD-3-7 | Create permission hook (usePermissions) | 5 | - Check single permission<br>- Check multiple permissions<br>- Memoized results |
| AD-3-8 | Add MFA support infrastructure | 3 | - MFA state in context<br>- MFA challenge handling<br>- Recovery codes |

---

## Epic 4: Asset Management UI (AD-4)

**Description**: Build the asset card management interface.

**Priority**: P1 (High)
**Estimated Points**: 42

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-4-1 | Create AssetList component | 5 | - Table view with sorting<br>- Filter by risk level/status<br>- Search functionality |
| AD-4-2 | Create AssetCard display component | 5 | - Full asset details<br>- Risk factors visualization<br>- Technical details |
| AD-4-3 | Create AssetCardForm component | 8 | - All fields editable<br>- Validation<br>- Owner lookup |
| AD-4-4 | Create AssetCreationWizard | 8 | - Step-by-step creation<br>- Detection result import<br>- Risk calculation |
| AD-4-5 | Implement asset filtering and search | 3 | - Multi-filter support<br>- URL state sync<br>- Saved filters |
| AD-4-6 | Create AssetDetailPage | 5 | - Full asset view<br>- Edit/Archive actions<br>- Compliance status |
| AD-4-7 | Implement asset archival flow | 3 | - Confirmation dialog<br>- Archive with reason<br>- Restore capability |
| AD-4-8 | Create Golden Thread visualization | 5 | - Hash display<br>- Verification status<br>- Link to documentation |

---

## Epic 5: Detection Results UI (AD-5)

**Description**: Build the framework detection results interface.

**Priority**: P1 (High)
**Estimated Points**: 24

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-5-1 | Create ScanResultsList component | 5 | - List recent scans<br>- Status indicators<br>- Quick actions |
| AD-5-2 | Create ScanResultDetail component | 5 | - Frameworks detected<br>- Model files found<br>- Risk indicators |
| AD-5-3 | Create FrameworkCard component | 3 | - Framework name/version<br>- Confidence score<br>- File location |
| AD-5-4 | Create ScanInitiator component | 5 | - Path input<br>- Scan progress<br>- Result handling |
| AD-5-5 | Create AssetSuggestionView | 3 | - Suggested asset card<br>- Edit before create<br>- One-click create |
| AD-5-6 | Implement scan history pagination | 3 | - Paginated list<br>- Date range filter<br>- Export capability |

---

## Epic 6: Compliance Dashboard (AD-6)

**Description**: Build the compliance tracking and assessment interface.

**Priority**: P1 (High)
**Estimated Points**: 36

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-6-1 | Create ComplianceOverview component | 5 | - Summary cards<br>- Profile selector<br>- Overall score |
| AD-6-2 | Create ComplianceProfileCard component | 3 | - Profile details<br>- Control count<br>- Last assessment |
| AD-6-3 | Create ControlStatusGrid component | 8 | - All controls displayed<br>- Status indicators<br>- Filter by status |
| AD-6-4 | Create AssessmentResultView component | 5 | - Full assessment details<br>- Finding list<br>- Remediation suggestions |
| AD-6-5 | Create ComplianceTrendChart component | 5 | - Time series chart<br>- Multiple profiles<br>- Drill-down capability |
| AD-6-6 | Implement assessment runner UI | 5 | - Select asset/profile<br>- Progress tracking<br>- Result display |
| AD-6-7 | Create ComplianceReportExport | 3 | - PDF export<br>- CSV export<br>- Custom date range |
| AD-6-8 | Create EvidenceAttachment component | 2 | - Upload evidence<br>- Link to control<br>- View attachments |

---

## Epic 7: Runtime Governance UI (AD-7)

**Description**: Build the AIGOS runtime monitoring and control interface.

**Priority**: P1 (High)
**Estimated Points**: 44

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-7-1 | Create AgentList component | 5 | - Active agents table<br>- Status indicators<br>- Quick actions |
| AD-7-2 | Create AgentDetailView component | 5 | - Full agent details<br>- Capability manifest<br>- Budget status |
| AD-7-3 | Create KillSwitchControl component | 8 | - Terminate/Pause/Resume buttons<br>- Confirmation dialog<br>- Reason input |
| AD-7-4 | Create CapabilityManifestViewer | 5 | - Tool permissions<br>- Resource restrictions<br>- Visual hierarchy |
| AD-7-5 | Create BudgetGauge component | 3 | - Current/total budget<br>- Warning thresholds<br>- Animated updates |
| AD-7-6 | Create PolicyDecisionLog component | 5 | - Decision history<br>- Filter by outcome<br>- Performance metrics |
| AD-7-7 | Create AgentHierarchyTree component | 5 | - Parent/child relationships<br>- Capability decay visualization<br>- Interactive tree |
| AD-7-8 | Create RealTimeAgentMonitor | 8 | - WebSocket connection<br>- Live updates<br>- Alert notifications |

---

## Epic 8: Dashboard Analytics (AD-8)

**Description**: Build the executive dashboard with metrics and analytics.

**Priority**: P2 (Medium)
**Estimated Points**: 28

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-8-1 | Create DashboardMetricsCards component | 5 | - Total assets<br>- Active agents<br>- Compliance score<br>- Violations count |
| AD-8-2 | Create RiskDistributionChart component | 5 | - Pie/donut chart<br>- Risk level breakdown<br>- Click to filter |
| AD-8-3 | Create RecentActivityFeed component | 3 | - Activity timeline<br>- Type icons<br>- User attribution |
| AD-8-4 | Create AssetTrendChart component | 5 | - Assets over time<br>- By risk level<br>- Growth indicators |
| AD-8-5 | Create ComplianceScorecard component | 5 | - Multi-profile scores<br>- Trend arrows<br>- Target comparison |
| AD-8-6 | Create ExecutiveSummaryExport | 5 | - PDF report<br>- Key metrics<br>- Trend analysis |

---

## Epic 9: Air-Gap Variant (AD-9)

**Description**: Create the air-gapped deployment variant with local backend.

**Priority**: P2 (Medium)
**Estimated Points**: 38

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-9-1 | Create BackendAdapter interface | 5 | - Abstract backend operations<br>- Consistent API<br>- Type-safe |
| AD-9-2 | Implement CloudAdapter (Supabase-like) | 5 | - Full API coverage<br>- Auth handling<br>- Error mapping |
| AD-9-3 | Implement LocalAdapter (Express/PostgreSQL) | 8 | - REST endpoints<br>- JWT auth<br>- Direct DB access |
| AD-9-4 | Create Express API server template | 8 | - All endpoints<br>- Middleware<br>- Error handling |
| AD-9-5 | Implement local authentication (Passport.js) | 5 | - JWT strategy<br>- Session management<br>- Password hashing |
| AD-9-6 | Create offline asset bundler | 3 | - Vendor all dependencies<br>- Embed fonts/icons<br>- Single HTML option |
| AD-9-7 | Create installation scripts | 2 | - Windows installer<br>- PostgreSQL setup<br>- Initial config |
| AD-9-8 | Document air-gap deployment | 2 | - Step-by-step guide<br>- Security considerations<br>- Backup procedures |

---

## Epic 10: Testing & Documentation (AD-10)

**Description**: Comprehensive testing and documentation for the dashboard package.

**Priority**: P2 (Medium)
**Estimated Points**: 24

### Stories

| Story ID | Story Name | Points | Acceptance Criteria |
|----------|------------|--------|---------------------|
| AD-10-1 | Set up Vitest for component testing | 3 | - Test runner configured<br>- Coverage reporting<br>- CI integration |
| AD-10-2 | Write unit tests for hooks | 5 | - All hooks tested<br>- Mock API client<br>- Edge cases covered |
| AD-10-3 | Write integration tests for auth flow | 5 | - Login/logout tested<br>- Permission checks<br>- Token refresh |
| AD-10-4 | Create API client tests | 3 | - All methods tested<br>- Error handling<br>- Type safety |
| AD-10-5 | Write component accessibility tests | 3 | - ARIA compliance<br>- Keyboard navigation<br>- Screen reader testing |
| AD-10-6 | Create comprehensive README and docs | 5 | - Installation guide<br>- API reference<br>- Examples |

---

## Sprint Allocation

### Sprint 1: Foundation (Weeks 1-2)
- AD-1 (Foundation & Package Setup) - 34 points
- **Total**: 34 points

### Sprint 2: Core Components (Weeks 3-4)
- AD-2 (UI Component Library) - 48 points
- **Total**: 48 points

### Sprint 3: Authentication (Weeks 5-6)
- AD-3 (Authentication & Authorization) - 32 points
- **Total**: 32 points

### Sprint 4: Asset Management (Weeks 7-8)
- AD-4 (Asset Management UI) - 42 points
- **Total**: 42 points

### Sprint 5: Detection & Compliance (Weeks 9-10)
- AD-5 (Detection Results UI) - 24 points
- AD-6-1 through AD-6-4 - 21 points
- **Total**: 45 points

### Sprint 6: Compliance & Runtime (Weeks 11-12)
- AD-6-5 through AD-6-8 - 15 points
- AD-7-1 through AD-7-4 - 23 points
- **Total**: 38 points

### Sprint 7: Runtime Governance (Weeks 13-14)
- AD-7-5 through AD-7-8 - 21 points
- AD-8-1 through AD-8-3 - 13 points
- **Total**: 34 points

### Sprint 8: Analytics & Air-Gap (Weeks 15-16)
- AD-8-4 through AD-8-6 - 15 points
- AD-9-1 through AD-9-4 - 26 points
- **Total**: 41 points

### Sprint 9: Air-Gap & Testing (Weeks 17-18)
- AD-9-5 through AD-9-8 - 12 points
- AD-10 (Testing & Documentation) - 24 points
- **Total**: 36 points

---

## Dependencies

```
AD-1 (Foundation)
  │
  ├──▶ AD-2 (UI Components)
  │      │
  │      └──▶ AD-4 (Asset Management)
  │      │      │
  │      │      └──▶ AD-5 (Detection)
  │      │      │
  │      │      └──▶ AD-6 (Compliance)
  │      │
  │      └──▶ AD-7 (Runtime)
  │             │
  │             └──▶ AD-8 (Analytics)
  │
  └──▶ AD-3 (Auth)
         │
         └──▶ All other epics depend on Auth
         │
         └──▶ AD-9 (Air-Gap)

AD-10 (Testing) runs in parallel with Sprints 4-9
```

---

## JIRA Import Instructions

To import these epics and stories into JIRA:

1. Create a new JIRA project "AIGRC Dashboard" with key "AD"
2. Use the JIRA REST API or CSV import
3. Set up the sprint structure (9 sprints, 2 weeks each)
4. Configure the board with swimlanes by Epic
5. Add story point custom field

### API Import Script Location
See: `packages/dashboard/scripts/jira-import.py` (to be created)
