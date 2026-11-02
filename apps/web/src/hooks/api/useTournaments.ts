import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';

export interface Tournament {
  id: number;
  name: string;
  description?: string;
  logoPath?: string;
  primaryColor: string;
  secondaryColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTournamentInput {
  name: string;
  description?: string;
  logoPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface UpdateTournamentInput {
  name?: string;
  description?: string;
  logoPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// Fetch all tournaments
export function useTournaments() {
  return useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const response = await apiClient.get('/tournaments');
      return response.data;
    },
  });
}

// Fetch single tournament
export function useTournament(id: number) {
  return useQuery<Tournament>({
    queryKey: ['tournaments', id],
    queryFn: async () => {
      const response = await apiClient.get(`/tournaments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create tournament
export function useCreateTournament() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTournamentInput) => {
      const response = await apiClient.post('/tournaments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create tournament');
    },
  });
}

// Update tournament
export function useUpdateTournament() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTournamentInput }) => {
      const response = await apiClient.put(`/tournaments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', variables.id] });
      toast.success('Tournament updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update tournament');
    },
  });
}

// Delete tournament
export function useDeleteTournament() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/tournaments/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tournament');
    },
  });
}
