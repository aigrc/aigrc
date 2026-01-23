/**
 * Asset Management Hook
 *
 * Provides data fetching and mutations for asset cards.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAigrcClient } from '@/lib/api';
import type { AssetCard } from '@/types';

export interface UseAssetsOptions {
  page?: number;
  pageSize?: number;
  riskLevel?: string;
  status?: string;
  search?: string;
}

export function useAssets(options: UseAssetsOptions = {}) {
  const queryClient = useQueryClient();
  const client = getAigrcClient();

  const assetsQuery = useQuery({
    queryKey: ['assets', options],
    queryFn: async () => {
      const response = await client.assets.list(options);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch assets');
      }
      return response.data!;
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (asset: Omit<AssetCard, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await client.assets.create(asset);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create asset');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AssetCard> }) => {
      const response = await client.assets.update(id, updates);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update asset');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await client.assets.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete asset');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const archiveAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await client.assets.archive(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to archive asset');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  return {
    assets: assetsQuery.data?.data ?? [],
    total: assetsQuery.data?.total ?? 0,
    isLoading: assetsQuery.isLoading,
    error: assetsQuery.error,
    refetch: assetsQuery.refetch,
    createAsset: createAssetMutation.mutate,
    updateAsset: updateAssetMutation.mutate,
    deleteAsset: deleteAssetMutation.mutate,
    archiveAsset: archiveAssetMutation.mutate,
    isCreating: createAssetMutation.isPending,
    isUpdating: updateAssetMutation.isPending,
    isDeleting: deleteAssetMutation.isPending,
  };
}

export function useAsset(id: string) {
  const client = getAigrcClient();

  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const response = await client.assets.get(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch asset');
      }
      return response.data!;
    },
    enabled: !!id,
  });
}
