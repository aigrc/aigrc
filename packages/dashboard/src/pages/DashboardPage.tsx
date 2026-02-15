/**
 * Dashboard Page
 *
 * Main overview page showing key metrics and status for AI governance.
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RiskLevelBadge } from '@/components/governance/RiskLevelBadge';
import { ComplianceStatusBadge } from '@/components/governance/ComplianceStatusBadge';
import {
  mockAssets,
  mockDashboardMetrics,
  mockRuntimeAgents,
} from '@/lib/mock';
import type { RiskLevel } from '@/types';

export function DashboardPage() {
  const metrics = mockDashboardMetrics;
  const recentAssets = mockAssets.slice(0, 5);
  const activeAgents = mockRuntimeAgents.filter(a => a.status === 'running');

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Governance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage your organization's AI systems compliance and risk.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Assets</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeRuntimeAgents} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageComplianceScore}%</div>
            <Progress value={metrics.averageComplianceScore} variant="compliance" className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policy Violations</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPolicyViolations}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingAssessments} assessments pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Scans</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentScans}</div>
            <p className="text-xs text-muted-foreground">In the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution & Recent Assets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Risk Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>AI assets by EU AI Act risk classification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.entries(metrics.assetsByRiskLevel) as [RiskLevel, number][]).map(
                ([level, count]) => (
                  <div key={level} className="flex items-center">
                    <RiskLevelBadge level={level} showTooltip={false} size="sm" />
                    <div className="ml-4 flex-1">
                      <Progress
                        value={(count / metrics.totalAssets) * 100}
                        variant={level}
                        className="h-2"
                      />
                    </div>
                    <span className="ml-4 text-sm font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Assets */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent AI Assets</CardTitle>
            <CardDescription>Latest registered AI systems and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.department}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <RiskLevelBadge level={asset.riskLevel} size="sm" />
                    <ComplianceStatusBadge
                      status={asset.complianceStatus}
                      score={asset.complianceScore}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Runtime Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Active Runtime Agents</CardTitle>
          <CardDescription>Currently running AI agents with AIGOS runtime monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{agent.name}</p>
                    <Badge variant={agent.health === 'healthy' ? 'compliant' : 'partial'}>
                      {agent.health}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Instance: {agent.instanceId}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div>
                    <p className="text-2xl font-bold">{agent.requestsPerMinute}</p>
                    <p className="text-xs text-muted-foreground">req/min</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{agent.avgLatency}ms</p>
                    <p className="text-xs text-muted-foreground">avg latency</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(agent.errorRate * 100).toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">error rate</p>
                  </div>
                </div>
                <div className="ml-4">
                  {agent.policyViolations > 0 ? (
                    <Badge variant="destructive">{agent.policyViolations} violations</Badge>
                  ) : (
                    <Badge variant="outline">No violations</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardPage;
