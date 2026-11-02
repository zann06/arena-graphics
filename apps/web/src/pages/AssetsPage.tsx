import { useRef, useState } from 'react';
import { ASSET_KINDS, type AssetKind } from '@arena/shared/types/templates.js';
import { useAssets, useDeleteAsset, useUploadAsset } from '../hooks/api/useAssets';

const KIND_LABELS: Record<AssetKind, string> = {
  teams: 'Team Logos',
  players: 'Player Photos',
  heroes: 'Hero Portraits',
  sponsors: 'Sponsors',
  backgrounds: 'Backgrounds',
};

const KIND_ACCEPTS: Record<AssetKind, string> = {
  teams: 'image/png,image/jpeg,image/svg+xml,image/webp',
  players: 'image/png,image/jpeg,image/webp',
  heroes: 'image/png,image/jpeg,image/webp',
  sponsors: 'image/png,image/jpeg,image/svg+xml,image/webp',
  backgrounds: 'image/png,image/jpeg,image/webp',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function UploadCard({ kind }: { kind: AssetKind }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAsset();
  const [dragOver, setDragOver] = useState(false);

  const send = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(
      { kind, file },
      {
        onSettled: () => {
          if (inputRef.current) inputRef.current.value = '';
        },
      }
    );
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        send(e.dataTransfer.files?.[0]);
      }}
      className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-900'
      }`}
    >
      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">{KIND_LABELS[kind]}</h3>
      <p className="mt-1 text-xs text-gray-500">PNG, JPEG, WebP or SVG · max 8 MB</p>
      <button
        type="button"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {upload.isPending ? 'Uploading…' : 'Choose file'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={KIND_ACCEPTS[kind]}
        className="hidden"
        onChange={(e) => send(e.target.files?.[0])}
      />
    </div>
  );
}

function AssetGrid({ kind }: { kind: AssetKind }) {
  const { data: assets = [], isLoading, error } = useAssets(kind);
  const remove = useDeleteAsset();

  if (isLoading) return <p className="text-sm text-gray-500">Loading {KIND_LABELS[kind].toLowerCase()}…</p>;
  if (error) return <p className="text-sm text-red-400">Failed to load assets: {(error as Error).message}</p>;
  if (assets.length === 0)
    return <p className="text-sm text-gray-600">No {KIND_LABELS[kind].toLowerCase()} uploaded yet.</p>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <figure
          key={asset.id}
          className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
        >
          <div className="flex h-28 items-center justify-center bg-[repeating-conic-gradient(#1f2937_0%_25%,#111827_0%_50%)] bg-[length:16px_16px] p-3">
            <img
              src={asset.url}
              alt={asset.originalName}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          </div>
          <figcaption className="border-t border-gray-800 p-2">
            <p className="truncate text-xs font-medium text-gray-200" title={asset.originalName}>
              {asset.originalName}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-500">
              {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}
              {formatBytes(asset.sizeBytes)}
            </p>
            <button
              type="button"
              onClick={() => remove.mutate(asset.id)}
              disabled={remove.isPending}
              className="mt-1.5 w-full rounded border border-red-900/60 py-1 text-[10px] font-semibold uppercase tracking-widest text-red-400 hover:bg-red-950/40 disabled:opacity-50"
            >
              Delete
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function AssetsPage() {
  const [kind, setKind] = useState<AssetKind>('teams');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Asset Library</h2>
          <p className="mt-1 text-sm text-gray-400">
            Upload team logos, player photos, hero portraits, sponsors, and backgrounds. Files are stored in the
            app data directory and served at <code className="text-gray-300">/uploads</code>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ASSET_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
              kind === k ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <UploadCard kind={kind} />
        <div>
          <AssetGrid kind={kind} />
        </div>
      </div>
    </div>
  );
}
