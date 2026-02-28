/**
 * Dashboard Hook
 *
 * Provides data fetching for dashboard metrics and analytics.
 */

import { useQuery } from '@tanstack/react-query';
import { getAigrcClient } from '@/lib/api';

export function useDashboard() {
  const client = getAigrcClient();

  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const response = await client.dashboard.getMetrics();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch metrics');
      }
      return response.data!;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const riskDistributionQuery = useQuery({
    queryKey: ['dashboard', 'risk-distribution'],
    queryFn: async () => {
      const response = await client.dashboard.getRiskDistribution();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch risk distribution');
      }
      return response.data!;
    },
  });

  const recentActivityQuery = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      const response = await client.dashboard.getRecentActivity(10);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch recent activity');
      }
      return response.data!;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return {
    metrics: metricsQuery.data,
    riskDistribution: riskDistributionQuery.data,
    recentActivity: recentActivityQuery.data ?? [],
    isLoading: metricsQuery.isLoading || riskDistributionQuery.isLoading,
    error: metricsQuery.error || riskDistributionQuery.error,
  };
}

export function useComplianceTrends(profileIds: string[], days: number = 30) {
  const client = getAigrcClient();

  return useQuery({
    queryKey: ['dashboard', 'compliance-trends', profileIds, days],
    queryFn: async () => {
      const response = await client.dashboard.getComplianceTrends(profileIds, days);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch compliance trends');
      }
      return response.data!;
    },
    enabled: profileIds.length > 0,
  });
}
