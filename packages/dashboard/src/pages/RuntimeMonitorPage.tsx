/**
 * Runtime Monitor Page
 *
 * Real-time monitoring of active AI agents with AIGOS runtime governance.
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { mockRuntimeAgents, mockAssets, mockDataHelpers } from '@/lib/mock';
import type { RuntimeAgent } from '@/types';

export function RuntimeMonitorPage() {
  const [selectedAgent, setSelectedAgent] = React.useState<RuntimeAgent | null>(null);
  const [killReason, setKillReason] = React.useState('');
  const [isKillDialogOpen, setIsKillDialogOpen] = React.useState(false);

  const agents = mockRuntimeAgents;
  const runningAgents = agents.filter((a) => a.status === 'running');
  const healthyAgents = agents.filter((a) => a.health === 'healthy');
  const totalViolations = agents.reduce((sum, a) => sum + a.policyViolations, 0);
  const avgLatency = Math.round(
    agents.reduce((sum, a) => sum + a.avgLatency, 0) / agents.length
  );

  const formatUptime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'compliant';
      case 'degraded':
        return 'partial';
      case 'unhealthy':
        return 'noncompliant';
      default:
        return 'outline';
    }
  };

  const handleKillSwitch = () => {
    // In real implementation, this would call the API
    console.log('Kill switch activated for:', selectedAgent?.instanceId, 'Reason:', killReason);
    setIsKillDialogOpen(false);
    setKillReason('');
    setSelectedAgent(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Runtime Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and control of active AI agents.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Refresh
          </Button>
          <Button variant="destructive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            Emergency Stop All
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningAgents.length}</div>
            <p className="text-xs text-muted-foreground">
              {healthyAgents.length} healthy, {runningAgents.length - healthyAgents.length} degraded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.reduce((sum, a) => sum + a.requestsPerMinute, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">requests per minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policy Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViolations}</div>
            <p className="text-xs text-muted-foreground">
              {totalViolations > 0 ? 'Requires attention' : 'All clear'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const asset = mockAssets.find((a) => a.id === agent.assetId);
          return (
            <Card key={agent.id} className="relative">
              {/* Status indicator */}
              <div
                className={`absolute top-4 right-4 h-3 w-3 rounded-full ${
                  agent.health === 'healthy'
                    ? 'bg-green-500'
                    : agent.health === 'degraded'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500 animate-pulse'
                }`}
              />

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {agent.name}
                </CardTitle>
                <CardDescription>
                  <span className="font-mono text-xs">{agent.instanceId}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status Badges */}
                <div className="flex gap-2">
                  <Badge variant={getHealthColor(agent.health) as any}>
                    {agent.health}
                  </Badge>
                  {agent.policyViolations > 0 && (
                    <Badge variant="destructive">
                      {agent.policyViolations} violations
                    </Badge>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-muted rounded">
                    <p className="text-lg font-bold">{agent.requestsPerMinute}</p>
                    <p className="text-xs text-muted-foreground">req/min</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-lg font-bold">{agent.avgLatency}ms</p>
                    <p className="text-xs text-muted-foreground">latency</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-lg font-bold">{(agent.errorRate * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">errors</p>
                  </div>
                </div>

                {/* Uptime */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">{formatUptime(agent.uptime)}</span>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.map((cap) => (
                    <Badge key={cap} variant="outline" className="text-xs">
                      {cap.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Details
                  </Button>
                  <Dialog open={isKillDialogOpen && selectedAgent?.id === agent.id} onOpenChange={(open) => {
                    setIsKillDialogOpen(open);
                    if (!open) {
                      setSelectedAgent(null);
                      setKillReason('');
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        Kill
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Activate Kill Switch</DialogTitle>
                        <DialogDescription>
                          This will immediately terminate the agent{' '}
                          <strong>{agent.name}</strong> ({agent.instanceId}).
                          This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <label className="text-sm font-medium">
                          Reason for termination (required)
                        </label>
                        <Input
                          value={killReason}
                          onChange={(e) => setKillReason(e.target.value)}
                          placeholder="e.g., Policy violation detected, Security incident"
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsKillDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleKillSwitch}
                          disabled={!killReason.trim()}
                        >
                          Confirm Kill
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Table View */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Details</CardTitle>
          <CardDescription>Comprehensive view of all runtime agents</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Instance ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Violations</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Last Heartbeat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell className="font-mono text-xs">{agent.instanceId}</TableCell>
                  <TableCell>
                    <Badge variant={getHealthColor(agent.health) as any}>
                      {agent.status} / {agent.health}
                    </Badge>
                  </TableCell>
                  <TableCell>{agent.requestsPerMinute}/min</TableCell>
                  <TableCell>{agent.avgLatency}ms</TableCell>
                  <TableCell>{(agent.errorRate * 100).toFixed(2)}%</TableCell>
                  <TableCell>
                    {agent.policyViolations > 0 ? (
                      <Badge variant="destructive">{agent.policyViolations}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>{formatUptime(agent.uptime)}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default RuntimeMonitorPage;
