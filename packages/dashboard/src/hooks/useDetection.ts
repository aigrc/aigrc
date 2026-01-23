/**
 * Detection Hook
 *
 * Provides data fetching and mutations for framework detection.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAigrcClient } from '@/lib/api';

export function useDetection() {
  const queryClient = useQueryClient();
  const client = getAigrcClient();

  const scansQuery = useQuery({
    queryKey: ['detection', 'scans'],
    queryFn: async () => {
      const response = await client.detection.listScans();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch scans');
      }
      return response.data!;
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (projectPath: string) => {
      const response = await client.detection.scan(projectPath);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to run scan');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detection', 'scans'] });
    },
  });

  const suggestAssetMutation = useMutation({
    mutationFn: async (scanId: string) => {
      const response = await client.detection.suggestAssetCard(scanId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to suggest asset');
      }
      return response.data!;
    },
  });

  return {
    scans: scansQuery.data?.data ?? [],
    isLoading: scansQuery.isLoading,
    error: scansQuery.error,
    refetch: scansQuery.refetch,
    runScan: scanMutation.mutate,
    suggestAsset: suggestAssetMutation.mutate,
    isScanning: scanMutation.isPending,
    isSuggesting: suggestAssetMutation.isPending,
  };
}

export function useDetectionResult(scanId: string) {
  const client = getAigrcClient();

  return useQuery({
    queryKey: ['detection', 'scans', scanId],
    queryFn: async () => {
      const response = await client.detection.getResult(scanId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch scan result');
      }
      return response.data!;
    },
    enabled: !!scanId,
  });
}
