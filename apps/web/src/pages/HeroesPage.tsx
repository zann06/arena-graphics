import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  useHeroes,
  useCreateHero,
  useUpdateHero,
  useDeleteHero,
  useImportHeroes,
  type Hero,
} from '../hooks/api/useHeroes';

function HeroPortrait({ hero }: { hero: Hero }) {
  if (hero.portraitPath) {
    return (
      <img
        src={hero.portraitPath}
        alt={hero.name}
        className="h-9 w-9 rounded border border-gray-700 object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded border border-gray-700 bg-gray-800 text-xs font-bold text-gray-400">
      {hero.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function HeroesPage() {
  const { data: heroes = [], isLoading, isError, error } = useHeroes();
  const createHero = useCreateHero();
  const updateHero = useUpdateHero();
  const deleteHero = useDeleteHero();
  const importHeroes = useImportHeroes();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Hero | null>(null);
  const [newName, setNewName] = useState('');
  const [newPortrait, setNewPortrait] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Hero | null>(null);
  const [importText, setImportText] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return heroes;
    return heroes.filter((hero) => hero.name.toLowerCase().includes(q));
  }, [heroes, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createHero.mutate(
      { name, portraitPath: newPortrait.trim() || null },
      {
        onSuccess: () => {
          setNewName('');
          setNewPortrait('');
        },
      }
    );
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const names = importText
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) {
      toast.error('Paste at least one hero name');
      return;
    }
    importHeroes.mutate(names, { onSuccess: () => setImportText('') });
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateHero.mutate(
      { id: editing.id, data: { name: editing.name.trim(), portraitPath: editing.portraitPath ?? null } },
      { onSuccess: () => setEditing(null) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Hero Library</h2>
          <p className="text-sm text-gray-400">
            Heroes available to the draft overlay. Portrait paths are optional but strongly recommended.
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search heroes…"
          className="w-64 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
        />
      </div>

      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Failed to load heroes: {(error as Error).message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Hero</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Portrait</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Version</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    Loading heroes…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    {heroes.length === 0
                      ? 'No heroes yet. Add them one by one or paste a list to import.'
                      : 'No heroes match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((hero) => (
                  <tr key={hero.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <HeroPortrait hero={hero} />
                        <span className="font-medium">{hero.name}</span>
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2 text-xs text-gray-400">
                      {hero.portraitPath ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">v{hero.assetVersion}</td>
                    <td className="space-x-2 px-4 py-2 text-right">
                      <button
                        onClick={() => setEditing(hero)}
                        className="rounded bg-gray-700 px-3 py-1 text-sm transition-colors hover:bg-gray-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(hero)}
                        className="rounded bg-red-600/20 px-3 py-1 text-sm text-red-400 transition-colors hover:bg-red-600/30"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="border-t border-gray-800 px-4 py-2 text-xs text-gray-500">
            {filtered.length} of {heroes.length} heroes
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">Add hero</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Hero name"
              required
              maxLength={60}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            />
            <input
              value={newPortrait}
              onChange={(e) => setNewPortrait(e.target.value)}
              placeholder="Portrait path (optional)"
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={createHero.isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {createHero.isPending ? 'Saving…' : 'Add hero'}
            </button>
          </form>

          <form onSubmit={handleImport} className="space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">Bulk import</h3>
            <p className="text-xs text-gray-500">
              One name per line (commas also work). Duplicates are skipped automatically.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder={'Ling\nTigreal\nValentina'}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={importHeroes.isPending}
              className="w-full rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-600 disabled:opacity-50"
            >
              {importHeroes.isPending ? 'Importing…' : 'Import names'}
            </button>
          </form>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleRename} className="w-full max-w-md space-y-4 rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-xl font-bold">Edit hero</h3>
            <label className="block text-sm font-medium">
              Name
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Portrait path
              <input
                value={editing.portraitPath ?? ''}
                onChange={(e) => setEditing({ ...editing, portraitPath: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
              />
            </label>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateHero.isPending}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {updateHero.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-2 text-xl font-bold">Delete {deleteTarget.name}?</h3>
            <p className="mb-6 text-gray-400">
              Existing draft entries that reference this hero will show an empty slot.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteHero.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
                }
                disabled={deleteHero.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteHero.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
