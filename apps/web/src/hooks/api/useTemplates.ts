import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GraphicKey } from '@arena/shared/types/realtime.js';
import type { TemplateRecord, TemplateTheme } from '@arena/shared/types/templates.js';
import apiClient from '../../lib/api-client';

const TEMPLATES_KEY = ['templates'] as const;

export function useTemplates() {
  return useQuery<TemplateRecord[]>({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => (await apiClient.get('/templates')).data as TemplateRecord[],
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; templateType: GraphicKey; theme: TemplateTheme }) =>
      (await apiClient.post('/templates', input)).data as TemplateRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success('Template created');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; name?: string; theme?: TemplateTheme }) =>
      (await apiClient.put(`/templates/${input.id}`, { name: input.name, theme: input.theme }))
        .data as TemplateRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useActivateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/templates/${id}/activate`)).data as TemplateRecord,
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success(`"${t.name}" is now live for ${t.templateType}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/templates/${id}/duplicate`)).data as TemplateRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success('Template duplicated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useResetTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/templates/${id}/reset`)).data as TemplateRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success('Template reset to defaults');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/templates/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success('Template deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
