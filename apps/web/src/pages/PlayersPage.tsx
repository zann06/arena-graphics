import { useState } from 'react';
import { usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer, type Player, type PlayerRole, type UpdatePlayerInput } from '../hooks/api/usePlayers';
import { useTeams } from '../hooks/api/useTeams';

const PLAYER_ROLES: PlayerRole[] = ['EXP Laner', 'Jungler', 'Mid Laner', 'Gold Laner', 'Roamer'];

export function PlayersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: players = [], isLoading } = usePlayers();
  const { data: teams = [] } = useTeams();
  const createMutation = useCreatePlayer();
  const updateMutation = useUpdatePlayer();
  const deleteMutation = useDeletePlayer();

  const handleCreate = () => {
    setEditingPlayer(null);
    setIsFormOpen(true);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
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

    const jerseyNum = formData.get('jerseyNumber') as string;

    const fields = {
      realName: formData.get('realName') as string,
      nickname: formData.get('nickname') as string,
      role: formData.get('role') as PlayerRole,
      photoPath: (formData.get('photoPath') as string) || undefined,
      jerseyNumber: jerseyNum ? parseInt(jerseyNum) : undefined,
    };

    if (editingPlayer) {
      const data: UpdatePlayerInput = fields;
      updateMutation.mutate({ id: editingPlayer.id, data }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingPlayer(null);
        },
      });
    } else {
      createMutation.mutate(
        { ...fields, teamId: parseInt(formData.get('teamId') as string) },
        {
          onSuccess: () => {
            setIsFormOpen(false);
          },
        }
      );
    }
  };

  const getTeamName = (teamId: number) => {
    return teams.find(t => t.id === teamId)?.shortName || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading players...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Player Management</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          + Create Player
        </button>
      </div>

      {/* Players Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Nickname</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Real Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Team</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Jersey #</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {players.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No players yet. Create your first player!
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{player.nickname}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{player.realName}</td>
                  <td className="px-4 py-3 text-sm">{getTeamName(player.teamId)}</td>
                  <td className="px-4 py-3 text-sm">{player.role}</td>
                  <td className="px-4 py-3 text-sm">{player.jerseyNumber || '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(player)}
                      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(player.id)}
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
          <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingPlayer ? 'Edit Player' : 'Create Player'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingPlayer && (
                <div>
                  <label className="block text-sm font-medium mb-2">Team *</label>
                  <select
                    name="teamId"
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Nickname *</label>
                <input
                  type="text"
                  name="nickname"
                  defaultValue={editingPlayer?.nickname}
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="e.g., Lemon"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Real Name *</label>
                <input
                  type="text"
                  name="realName"
                  defaultValue={editingPlayer?.realName}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="e.g., Muhammad Lemon"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role *</label>
                <select
                  name="role"
                  defaultValue={editingPlayer?.role}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select role</option>
                  {PLAYER_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Jersey Number</label>
                <input
                  type="number"
                  name="jerseyNumber"
                  defaultValue={editingPlayer?.jerseyNumber}
                  min={1}
                  max={99}
                  placeholder="1-99"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Photo Path</label>
                <input
                  type="text"
                  name="photoPath"
                  defaultValue={editingPlayer?.photoPath}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingPlayer(null);
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-2">Delete Player?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently delete this player. This action cannot be undone.
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
