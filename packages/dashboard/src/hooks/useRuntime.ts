/**
 * Runtime Governance Hook
 *
 * Provides data fetching and mutations for AIGOS runtime operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAigrcClient } from '@/lib/api';

export function useRuntime() {
  const queryClient = useQueryClient();
  const client = getAigrcClient();

  const agentsQuery = useQuery({
    queryKey: ['runtime', 'agents'],
    queryFn: async () => {
      const response = await client.runtime.listAgents();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch agents');
      }
      return response.data!;
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const killSwitchMutation = useMutation({
    mutationFn: async ({
      instanceId,
      command,
      reason,
    }: {
      instanceId: string;
      command: 'terminate' | 'pause' | 'resume';
      reason: string;
    }) => {
      const response = await client.runtime.killSwitch(instanceId, command, reason);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to execute kill switch');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runtime', 'agents'] });
    },
  });

  return {
    agents: agentsQuery.data?.data ?? [],
    total: agentsQuery.data?.total ?? 0,
    isLoading: agentsQuery.isLoading,
    error: agentsQuery.error,
    refetch: agentsQuery.refetch,
    executeKillSwitch: killSwitchMutation.mutate,
    isExecutingKillSwitch: killSwitchMutation.isPending,
  };
}

export function useRuntimeAgent(instanceId: string) {
  const client = getAigrcClient();

  return useQuery({
    queryKey: ['runtime', 'agents', instanceId],
    queryFn: async () => {
      const response = await client.runtime.getAgent(instanceId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch agent');
      }
      return response.data!;
    },
    enabled: !!instanceId,
    refetchInterval: 2000, // Poll more frequently for individual agent
  });
}

export function usePolicyDecisions(params?: {
  instanceId?: string;
  decision?: string;
  page?: number;
  pageSize?: number;
}) {
  const client = getAigrcClient();

  return useQuery({
    queryKey: ['runtime', 'decisions', params],
    queryFn: async () => {
      const response = await client.runtime.getPolicyDecisions(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch decisions');
      }
      return response.data!;
    },
  });
}
