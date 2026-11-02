import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';

export interface Team {
  id: number;
  tournamentId: number;
  name: string;
  shortName: string;
  logoPath?: string;
  primaryColor: string;
  secondaryColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamInput {
  tournamentId: number;
  name: string;
  shortName: string;
  logoPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface UpdateTeamInput {
  name?: string;
  shortName?: string;
  logoPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// Fetch all teams
export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await apiClient.get('/teams');
      return response.data;
    },
  });
}

// Fetch single team
export function useTeam(id: number) {
  return useQuery<Team>({
    queryKey: ['teams', id],
    queryFn: async () => {
      const response = await apiClient.get(`/teams/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Fetch team roster
export function useTeamRoster(id: number) {
  return useQuery({
    queryKey: ['teams', id, 'roster'],
    queryFn: async () => {
      const response = await apiClient.get(`/teams/${id}/roster`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create team
export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTeamInput) => {
      const response = await apiClient.post('/teams', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create team');
    },
  });
}

// Update team
export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTeamInput }) => {
      const response = await apiClient.put(`/teams/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', variables.id] });
      toast.success('Team updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update team');
    },
  });
}

// Delete team
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/teams/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });
}
