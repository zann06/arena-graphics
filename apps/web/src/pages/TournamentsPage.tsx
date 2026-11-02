import { useState } from 'react';
import { useTournaments, useCreateTournament, useUpdateTournament, useDeleteTournament, type Tournament } from '../hooks/api/useTournaments';

export function TournamentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: tournaments = [], isLoading } = useTournaments();
  const createMutation = useCreateTournament();
  const updateMutation = useUpdateTournament();
  const deleteMutation = useDeleteTournament();

  const handleCreate = () => {
    setEditingTournament(null);
    setIsFormOpen(true);
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
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
    
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      logoPath: formData.get('logoPath') as string || undefined,
      primaryColor: formData.get('primaryColor') as string || '#237bff',
      secondaryColor: formData.get('secondaryColor') as string || '#00d9ff',
    };

    if (editingTournament) {
      updateMutation.mutate({ id: editingTournament.id, data }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingTournament(null);
        },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tournament Management</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          + Create Tournament
        </button>
      </div>

      {/* Tournaments Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Colors</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {tournaments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No tournaments yet. Create your first tournament!
                </td>
              </tr>
            ) : (
              tournaments.map((tournament) => (
                <tr key={tournament.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{tournament.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{tournament.description || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-700"
                        style={{ backgroundColor: tournament.primaryColor }}
                        title={tournament.primaryColor}
                      />
                      <div
                        className="w-6 h-6 rounded border border-gray-700"
                        style={{ backgroundColor: tournament.secondaryColor }}
                        title={tournament.secondaryColor}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(tournament)}
                      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tournament.id)}
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
              {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingTournament?.name}
                  required
                  minLength={3}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingTournament?.description}
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Logo Path</label>
                <input
                  type="text"
                  name="logoPath"
                  defaultValue={editingTournament?.logoPath}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Color</label>
                  <input
                    type="color"
                    name="primaryColor"
                    defaultValue={editingTournament?.primaryColor || '#237bff'}
                    className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Color</label>
                  <input
                    type="color"
                    name="secondaryColor"
                    defaultValue={editingTournament?.secondaryColor || '#00d9ff'}
                    className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingTournament(null);
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
            <h3 className="text-xl font-bold mb-2">Delete Tournament?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently delete this tournament and all associated teams, players, and matches. This action cannot be undone.
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
