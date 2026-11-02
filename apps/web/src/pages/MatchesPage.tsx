import { useState } from 'react';
import { useMatches, useCreateMatch, useUpdateMatch, useDeleteMatch, useRecordGameResult, useMatchGames, type Match, type MatchFormat, type MatchStatus, type UpdateMatchInput } from '../hooks/api/useMatches';
import { useTournaments } from '../hooks/api/useTournaments';
import { useTeams } from '../hooks/api/useTeams';

const MATCH_FORMATS: MatchFormat[] = ['BO1', 'BO3', 'BO5'];
const MATCH_STATUSES: MatchStatus[] = ['scheduled', 'upcoming', 'starting-soon', 'live', 'paused', 'completed'];

export function MatchesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [gameResultMatch, setGameResultMatch] = useState<Match | null>(null);

  const { data: matches = [], isLoading } = useMatches();
  const { data: tournaments = [] } = useTournaments();
  const { data: teams = [] } = useTeams();
  const createMutation = useCreateMatch();
  const updateMutation = useUpdateMatch();
  const deleteMutation = useDeleteMatch();
  const recordGameMutation = useRecordGameResult();

  const { data: currentMatchGames = [] } = useMatchGames(gameResultMatch?.id || 0);

  const handleCreate = () => {
    setEditingMatch(null);
    setIsFormOpen(true);
  };

  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const fields = {
      teamAId: parseInt(formData.get('teamAId') as string),
      teamBId: parseInt(formData.get('teamBId') as string),
      format: formData.get('format') as MatchFormat,
      status: formData.get('status') as MatchStatus,
      scheduledAt: (formData.get('scheduledAt') as string) || undefined,
    };

    if (editingMatch) {
      const data: UpdateMatchInput = fields;
      updateMutation.mutate({ id: editingMatch.id, data }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingMatch(null);
        },
      });
    } else {
      createMutation.mutate(
        { ...fields, tournamentId: parseInt(formData.get('tournamentId') as string) },
        {
          onSuccess: () => {
            setIsFormOpen(false);
          },
        }
      );
    }
  };

  const handleGameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gameResultMatch) return;

    const formData = new FormData(e.currentTarget);
    
    const durationStr = formData.get('duration') as string;
    
    const data = {
      gameNumber: parseInt(formData.get('gameNumber') as string),
      blueTeamId: parseInt(formData.get('blueTeamId') as string),
      redTeamId: parseInt(formData.get('redTeamId') as string),
      winnerTeamId: parseInt(formData.get('winnerTeamId') as string),
      durationSeconds: durationStr ? parseInt(durationStr) : undefined,
    };

    recordGameMutation.mutate({ matchId: gameResultMatch.id, data }, {
      onSuccess: () => {
        setGameResultMatch(null);
      },
    });
  };

  const getTeamName = (teamId: number) => {
    return teams.find(t => t.id === teamId)?.shortName || 'Unknown';
  };

  const getTournamentName = (tournamentId: number) => {
    return tournaments.find(t => t.id === tournamentId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading matches...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Match Management</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          + Create Match
        </button>
      </div>

      {/* Matches Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tournament</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Match</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Format</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Score</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Winner</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {matches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No matches yet. Create your first match!
                </td>
              </tr>
            ) : (
              matches.map((match) => (
                <tr key={match.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-gray-400">{getTournamentName(match.tournamentId)}</td>
                  <td className="px-4 py-3 font-medium">
                    {getTeamName(match.teamAId)} vs {getTeamName(match.teamBId)}
                  </td>
                  <td className="px-4 py-3 text-sm">{match.format}</td>
                  <td className="px-4 py-3 text-sm font-mono">
                    <MatchScore match={match} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      match.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                      match.status === 'live' ? 'bg-red-600/20 text-red-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {match.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {match.winnerTeamId ? getTeamName(match.winnerTeamId) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setGameResultMatch(match)}
                      className="px-3 py-1 text-sm bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors"
                    >
                      Record Game
                    </button>
                    <button
                      onClick={() => handleEdit(match)}
                      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(match.id)}
                      className="px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingMatch ? 'Edit Match' : 'Create Match'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingMatch && (
                <div>
                  <label className="block text-sm font-medium mb-2">Tournament *</label>
                  <select
                    name="tournamentId"
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Team A *</label>
                <select
                  name="teamAId"
                  defaultValue={editingMatch?.teamAId}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team A</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Team B *</label>
                <select
                  name="teamBId"
                  defaultValue={editingMatch?.teamBId}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team B</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Format *</label>
                <select
                  name="format"
                  defaultValue={editingMatch?.format || 'BO1'}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MATCH_FORMATS.map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status *</label>
                <select
                  name="status"
                  defaultValue={editingMatch?.status || 'scheduled'}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MATCH_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Scheduled At</label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  defaultValue={editingMatch?.scheduledAt?.slice(0, 16)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingMatch(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Game Result Form Modal */}
      {gameResultMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-2">Record Game Result</h3>
            <p className="text-sm text-gray-400 mb-4">
              {getTeamName(gameResultMatch.teamAId)} vs {getTeamName(gameResultMatch.teamBId)} ({gameResultMatch.format})
            </p>
            <form onSubmit={handleGameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Game Number *</label>
                <input
                  type="number"
                  name="gameNumber"
                  required
                  min={1}
                  max={gameResultMatch.format === 'BO1' ? 1 : gameResultMatch.format === 'BO3' ? 3 : 5}
                  defaultValue={currentMatchGames.length + 1}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Blue Team *</label>
                <select
                  name="blueTeamId"
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={gameResultMatch.teamAId}>{getTeamName(gameResultMatch.teamAId)}</option>
                  <option value={gameResultMatch.teamBId}>{getTeamName(gameResultMatch.teamBId)}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Red Team *</label>
                <select
                  name="redTeamId"
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={gameResultMatch.teamBId}>{getTeamName(gameResultMatch.teamBId)}</option>
                  <option value={gameResultMatch.teamAId}>{getTeamName(gameResultMatch.teamAId)}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Winner *</label>
                <select
                  name="winnerTeamId"
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select winner</option>
                  <option value={gameResultMatch.teamAId}>{getTeamName(gameResultMatch.teamAId)}</option>
                  <option value={gameResultMatch.teamBId}>{getTeamName(gameResultMatch.teamBId)}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  name="duration"
                  min={0}
                  placeholder="e.g., 1200 for 20 minutes"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setGameResultMatch(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordGameMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {recordGameMutation.isPending ? 'Recording...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-2">Delete Match?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently delete this match and all game results. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchScore({ match }: { match: Match }) {
  const { data: games = [] } = useMatchGames(match.id);
  const teamAWins = games.filter((g) => g.winnerTeamId === match.teamAId).length;
  const teamBWins = games.filter((g) => g.winnerTeamId === match.teamBId).length;
  return (
    <span className={match.status === 'completed' ? 'text-green-400' : 'text-gray-300'}>
      {teamAWins} - {teamBWins}
    </span>
  );
}
