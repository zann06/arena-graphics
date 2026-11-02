import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';

export interface Hero {
  id: number;
  name: string;
  portraitPath: string | null;
  assetVersion: number;
  createdAt: string;
  updatedAt: string;
}

const HEROES_KEY = ['heroes'] as const;

export function useHeroes() {
  return useQuery<Hero[]>({
    queryKey: HEROES_KEY,
    queryFn: async () => (await apiClient.get('/heroes')).data,
  });
}

export function useCreateHero() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; portraitPath?: string | null }) =>
      (await apiClient.post('/heroes', data)).data as Hero,
    onSuccess: (hero) => {
      queryClient.invalidateQueries({ queryKey: HEROES_KEY });
      toast.success(`Hero ${hero.name} added`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateHero() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; portraitPath?: string | null } }) =>
      (await apiClient.put(`/heroes/${id}`, data)).data as Hero,
    onSuccess: (hero) => {
      queryClient.invalidateQueries({ queryKey: HEROES_KEY });
      toast.success(`Hero ${hero.name} updated`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteHero() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/heroes/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEROES_KEY });
      toast.success('Hero deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useImportHeroes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (names: string[]) =>
      (await apiClient.post('/heroes/import', { names })).data as {
        imported: number;
        skipped: number;
        names: string[];
      },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: HEROES_KEY });
      toast.success(`${result.imported} hero(es) imported, ${result.skipped} skipped`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
