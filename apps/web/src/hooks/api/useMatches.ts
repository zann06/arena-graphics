import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';

export type MatchFormat = 'BO1' | 'BO3' | 'BO5';
export type MatchStatus = 'scheduled' | 'upcoming' | 'starting-soon' | 'live' | 'paused' | 'completed';
export type GameStatus = 'pending' | 'live' | 'completed';

export interface Match {
  id: number;
  tournamentId: number;
  teamAId: number;
  teamBId: number;
  format: MatchFormat;
  status: MatchStatus;
  currentGame: number;
  scheduledAt?: string;
  winnerTeamId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  matchId: number;
  gameNumber: number;
  winnerTeamId?: number;
  blueTeamId: number;
  redTeamId: number;
  durationSeconds?: number;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatchInput {
  tournamentId: number;
  teamAId: number;
  teamBId: number;
  format?: MatchFormat;
  scheduledAt?: string;
  status?: MatchStatus;
}

export interface UpdateMatchInput {
  teamAId?: number;
  teamBId?: number;
  format?: MatchFormat;
  scheduledAt?: string;
  status?: MatchStatus;
}

export interface RecordGameResultInput {
  gameNumber: number;
  blueTeamId: number;
  redTeamId: number;
  winnerTeamId: number;
  durationSeconds?: number;
}

export interface GameResultResponse {
  game: Game;
  seriesScore: {
    teamAWins: number;
    teamBWins: number;
  };
  isSeriesComplete: boolean;
  winnerTeamId?: number;
}

// Fetch all matches
export function useMatches() {
  return useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      const response = await apiClient.get('/matches');
      return response.data;
    },
  });
}

// Fetch single match
export function useMatch(id: number) {
  return useQuery<Match>({
    queryKey: ['matches', id],
    queryFn: async () => {
      const response = await apiClient.get(`/matches/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Fetch matches by tournament
export function useMatchesByTournament(tournamentId: number) {
  return useQuery<Match[]>({
    queryKey: ['matches', 'tournament', tournamentId],
    queryFn: async () => {
      const response = await apiClient.get(`/matches/tournament/${tournamentId}`);
      return response.data;
    },
    enabled: !!tournamentId,
  });
}

// Fetch match games
export function useMatchGames(matchId: number) {
  return useQuery<Game[]>({
    queryKey: ['matches', matchId, 'games'],
    queryFn: async () => {
      const response = await apiClient.get(`/matches/${matchId}/games`);
      return response.data;
    },
    enabled: !!matchId,
  });
}

// Create match
export function useCreateMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateMatchInput) => {
      const response = await apiClient.post('/matches', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Match created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create match');
    },
  });
}

// Update match
export function useUpdateMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMatchInput }) => {
      const response = await apiClient.put(`/matches/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matches', variables.id] });
      toast.success('Match updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update match');
    },
  });
}

// Delete match
export function useDeleteMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/matches/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Match deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete match');
    },
  });
}

// Record game result
export function useRecordGameResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ matchId, data }: { matchId: number; data: RecordGameResultInput }) => {
      const response = await apiClient.post<GameResultResponse>(`/matches/${matchId}/games`, data);
      return response.data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matches', variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['matches', variables.matchId, 'games'] });
      
      if (result.isSeriesComplete) {
        toast.success(`Match completed! Final score: ${result.seriesScore.teamAWins} - ${result.seriesScore.teamBWins}`);
      } else {
        toast.success(`Game ${result.game.gameNumber} recorded. Score: ${result.seriesScore.teamAWins} - ${result.seriesScore.teamBWins}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record game result');
    },
  });
}
