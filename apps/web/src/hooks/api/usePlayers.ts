import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';

export type PlayerRole = 'EXP Laner' | 'Jungler' | 'Mid Laner' | 'Gold Laner' | 'Roamer';

export interface Player {
  id: number;
  teamId: number;
  realName: string;
  nickname: string;
  photoPath?: string;
  role: PlayerRole;
  jerseyNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlayerInput {
  teamId: number;
  realName: string;
  nickname: string;
  photoPath?: string;
  role: PlayerRole;
  jerseyNumber?: number;
}

export interface UpdatePlayerInput {
  realName?: string;
  nickname?: string;
  photoPath?: string;
  role?: PlayerRole;
  jerseyNumber?: number;
}

// Fetch all players
export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const response = await apiClient.get('/players');
      return response.data;
    },
  });
}

// Fetch single player
export function usePlayer(id: number) {
  return useQuery<Player>({
    queryKey: ['players', id],
    queryFn: async () => {
      const response = await apiClient.get(`/players/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Fetch players by team
export function usePlayersByTeam(teamId: number) {
  return useQuery<Player[]>({
    queryKey: ['players', 'team', teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/players/team/${teamId}`);
      return response.data;
    },
    enabled: !!teamId,
  });
}

// Create player
export function useCreatePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePlayerInput) => {
      const response = await apiClient.post('/players', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create player');
    },
  });
}

// Update player
export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePlayerInput }) => {
      const response = await apiClient.put(`/players/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['players', variables.id] });
      toast.success('Player updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update player');
    },
  });
}

// Delete player
export function useDeletePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/players/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete player');
    },
  });
}
