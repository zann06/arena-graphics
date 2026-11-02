import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AssetKind, AssetRecord } from '@arena/shared/types/templates.js';
import apiClient from '../../lib/api-client';

const ASSETS_KEY = ['assets'] as const;

export function useAssets(kind?: AssetKind) {
  return useQuery<AssetRecord[]>({
    queryKey: [...ASSETS_KEY, kind ?? 'all'],
    queryFn: async () =>
      (await apiClient.get('/assets', { params: kind ? { kind } : undefined })).data as AssetRecord[],
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: AssetKind; file: File }) => {
      const form = new FormData();
      form.append('kind', input.kind);
      form.append('file', input.file);
      // Let the browser set the multipart boundary; override the JSON default.
      const { data } = await apiClient.post('/assets/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as AssetRecord;
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      toast.success(`Uploaded ${asset.originalName}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/assets/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      toast.success('Asset deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
