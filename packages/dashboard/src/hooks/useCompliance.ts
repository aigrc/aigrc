/**
 * Compliance Hook
 *
 * Provides data fetching and mutations for compliance operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAigrcClient } from '@/lib/api';

export function useCompliance() {
  const queryClient = useQueryClient();
  const client = getAigrcClient();

  const profilesQuery = useQuery({
    queryKey: ['compliance', 'profiles'],
    queryFn: async () => {
      const response = await client.compliance.listProfiles();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch profiles');
      }
      return response.data!;
    },
  });

  const assessMutation = useMutation({
    mutationFn: async ({ assetId, profileId }: { assetId: string; profileId: string }) => {
      const response = await client.compliance.assess(assetId, profileId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to run assessment');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'assessments'] });
    },
  });

  return {
    profiles: profilesQuery.data ?? [],
    isLoading: profilesQuery.isLoading,
    error: profilesQuery.error,
    refetch: profilesQuery.refetch,
    runAssessment: assessMutation.mutate,
    isAssessing: assessMutation.isPending,
  };
}

export function useComplianceAssessments(params?: {
  assetId?: string;
  profileId?: string;
  page?: number;
  pageSize?: number;
}) {
  const client = getAigrcClient();

  return useQuery({
    queryKey: ['compliance', 'assessments', params],
    queryFn: async () => {
      const response = await client.compliance.listAssessments(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch assessments');
      }
      return response.data!;
    },
  });
}
