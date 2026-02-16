/**
 * Assets List Page
 *
 * Displays all AI assets with filtering and sorting capabilities.
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RiskLevelBadge } from '@/components/governance/RiskLevelBadge';
import { ComplianceStatusBadge } from '@/components/governance/ComplianceStatusBadge';
import { mockAssets } from '@/lib/mock';
import type { AssetCard, RiskLevel, ComplianceStatus } from '@/types';

export function AssetsListPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [riskFilter, setRiskFilter] = React.useState<RiskLevel | 'all'>('all');
  const [complianceFilter, setComplianceFilter] = React.useState<ComplianceStatus | 'all'>('all');
  const [sortBy, setSortBy] = React.useState<'name' | 'riskLevel' | 'complianceScore'>('name');

  // Filter and sort assets
  const filteredAssets = React.useMemo(() => {
    let assets = [...mockAssets];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.description.toLowerCase().includes(query) ||
          asset.department.toLowerCase().includes(query) ||
          asset.owner.toLowerCase().includes(query)
      );
    }

    // Apply risk level filter
    if (riskFilter !== 'all') {
      assets = assets.filter((asset) => asset.riskLevel === riskFilter);
    }

    // Apply compliance status filter
    if (complianceFilter !== 'all') {
      assets = assets.filter((asset) => asset.complianceStatus === complianceFilter);
    }

    // Apply sorting
    assets.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'riskLevel':
          const riskOrder = { minimal: 0, limited: 1, high: 2, unacceptable: 3 };
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        case 'complianceScore':
          return (b.complianceScore || 0) - (a.complianceScore || 0);
        default:
          return 0;
      }
    });

    return assets;
  }, [searchQuery, riskFilter, complianceFilter, sortBy]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assets</h1>
          <p className="text-muted-foreground">
            Manage and monitor your organization's AI systems inventory.
          </p>
        </div>
        <Button>
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
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Register Asset
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter AI assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name, description, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={riskFilter}
              onValueChange={(value) => setRiskFilter(value as RiskLevel | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="unacceptable">Unacceptable</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={complianceFilter}
              onValueChange={(value) => setComplianceFilter(value as ComplianceStatus | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Compliance Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="noncompliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="riskLevel">Risk Level</SelectItem>
                <SelectItem value="complianceScore">Compliance Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Assets ({filteredAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Frameworks</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last Scanned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {asset.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {asset.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RiskLevelBadge level={asset.riskLevel} size="sm" />
                  </TableCell>
                  <TableCell>
                    <ComplianceStatusBadge
                      status={asset.complianceStatus}
                      score={asset.complianceScore}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {asset.frameworks.slice(0, 2).map((framework) => (
                        <Badge key={framework} variant="secondary" className="text-xs">
                          {framework}
                        </Badge>
                      ))}
                      {asset.frameworks.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{asset.frameworks.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{asset.owner}</p>
                      <p className="text-xs text-muted-foreground">{asset.department}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{formatDate(asset.lastScanned)}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        Scan
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAssets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assets found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AssetsListPage;
