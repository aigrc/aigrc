/**
 * Asset Detail Page
 *
 * Detailed view of a single AI asset with all governance information.
 */

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RiskLevelBadge, RISK_LEVEL_CONFIG } from '@/components/governance/RiskLevelBadge';
import { ComplianceStatusBadge } from '@/components/governance/ComplianceStatusBadge';
import {
  mockAssets,
  mockDetections,
  mockAssessments,
  mockRuntimeAgents,
  mockDataHelpers,
} from '@/lib/mock';
import type { AssetCard } from '@/types';

interface AssetDetailPageProps {
  assetId?: string;
}

export function AssetDetailPage({ assetId }: AssetDetailPageProps) {
  // For demo, use the first asset or the one specified
  const asset = assetId
    ? mockDataHelpers.getAssetById(assetId)
    : mockAssets[1]; // Resume Screening Agent (has interesting data)

  if (!asset) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Asset not found.</p>
      </div>
    );
  }

  const detections = mockDataHelpers.getDetectionsByAssetId(asset.id);
  const assessments = mockDataHelpers.getAssessmentsByAssetId(asset.id);
  const runtimeAgent = mockDataHelpers.getRuntimeAgentByAssetId(asset.id);
  const latestDetection = detections[0];
  const latestAssessment = assessments[0];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatUptime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
            <Badge variant="outline" className="capitalize">
              {asset.type}
            </Badge>
            <Badge variant="secondary">v{asset.version}</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{asset.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit</Button>
          <Button>Run Scan</Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskLevelBadge level={asset.riskLevel} size="lg" />
            <p className="text-xs text-muted-foreground mt-2">
              {RISK_LEVEL_CONFIG[asset.riskLevel].description.slice(0, 60)}...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ComplianceStatusBadge
              status={asset.complianceStatus}
              score={asset.complianceScore}
              size="lg"
            />
            <Progress
              value={asset.complianceScore}
              variant="compliance"
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{asset.owner}</p>
            <p className="text-sm text-muted-foreground">{asset.department}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Scanned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{formatDate(asset.lastScanned)}</p>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(asset.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detection">Detection Results</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          {runtimeAgent && <TabsTrigger value="runtime">Runtime</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Detected Frameworks</CardTitle>
                <CardDescription>AI/ML frameworks identified in this asset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {asset.frameworks.map((framework) => (
                    <Badge key={framework} variant="secondary" className="text-sm">
                      {framework}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>Classification and organization tags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {latestDetection && (
            <Card>
              <CardHeader>
                <CardTitle>Latest Detection Summary</CardTitle>
                <CardDescription>
                  Scan completed on {formatDate(latestDetection.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Risk Indicators</h4>
                    {latestDetection.riskIndicators.map((indicator, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg mb-2"
                      >
                        <div>
                          <p className="font-medium capitalize">{indicator.type.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">{indicator.description}</p>
                        </div>
                        <Badge
                          variant={
                            indicator.severity === 'high'
                              ? 'high'
                              : indicator.severity === 'medium'
                              ? 'limited'
                              : 'minimal'
                          }
                        >
                          {indicator.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {latestDetection.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Detection Results Tab */}
        <TabsContent value="detection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detection History</CardTitle>
              <CardDescription>All framework detection scans for this asset</CardDescription>
            </CardHeader>
            <CardContent>
              {detections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Frameworks</TableHead>
                      <TableHead>Risk Indicators</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detections.map((detection) => (
                      <TableRow key={detection.id}>
                        <TableCell>{formatDate(detection.createdAt)}</TableCell>
                        <TableCell className="capitalize">{detection.scanType}</TableCell>
                        <TableCell>
                          <Badge
                            variant={detection.status === 'completed' ? 'compliant' : 'partial'}
                          >
                            {detection.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {detection.frameworksDetected.map((f) => f.name).join(', ')}
                        </TableCell>
                        <TableCell>{detection.riskIndicators.length}</TableCell>
                        <TableCell>{(detection.duration / 1000).toFixed(1)}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No detection scans recorded.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          {latestAssessment ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Framework</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{latestAssessment.framework}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Controls Passed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">
                      {latestAssessment.controlsPassed} / {latestAssessment.controlsTotal}
                    </p>
                    <Progress
                      value={(latestAssessment.controlsPassed / latestAssessment.controlsTotal) * 100}
                      variant="compliance"
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Next Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">
                      {formatDate(latestAssessment.nextAssessment)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Control Findings</CardTitle>
                  <CardDescription>
                    Detailed findings from the latest compliance assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Control</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latestAssessment.findings.map((finding, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{finding.control}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                finding.status === 'passed'
                                  ? 'compliant'
                                  : finding.status === 'partial'
                                  ? 'partial'
                                  : 'noncompliant'
                              }
                            >
                              {finding.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{finding.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No compliance assessments recorded.</p>
                <Button className="mt-4">Run Assessment</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Runtime Tab */}
        {runtimeAgent && (
          <TabsContent value="runtime" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={runtimeAgent.health === 'healthy' ? 'compliant' : 'partial'}>
                    {runtimeAgent.status} - {runtimeAgent.health}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{formatUptime(runtimeAgent.uptime)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {runtimeAgent.requestsTotal.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Policy Violations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{runtimeAgent.policyViolations}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Runtime Metrics</CardTitle>
                <CardDescription>
                  Instance: {runtimeAgent.instanceId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold">{runtimeAgent.requestsPerMinute}</p>
                    <p className="text-sm text-muted-foreground">Requests/min</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold">{runtimeAgent.avgLatency}ms</p>
                    <p className="text-sm text-muted-foreground">Avg Latency</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold">{(runtimeAgent.errorRate * 100).toFixed(2)}%</p>
                    <p className="text-sm text-muted-foreground">Error Rate</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {runtimeAgent.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline">
                        {cap.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline">View Logs</Button>
                  <Button variant="outline">View Traces</Button>
                  {runtimeAgent.status === 'running' && (
                    <Button variant="destructive">Kill Switch</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default AssetDetailPage;
