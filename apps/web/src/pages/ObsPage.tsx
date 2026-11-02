import { useEffect, useState } from 'react';
import {
  useObsStatus,
  useObsScenes,
  useObsSources,
  useObsConnect,
  useObsDisconnect,
  useObsSwitchScene,
  useObsSetSourceVisibility,
  type ObsStatus,
} from '../hooks/api/useObs';

const STATE_STYLES: Record<ObsStatus['state'], { label: string; badge: string; dot: string }> = {
  connected: { label: 'Connected', badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
  connecting: { label: 'Connecting', badge: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400' },
  error: { label: 'Error', badge: 'bg-red-500/15 text-red-400', dot: 'bg-red-400' },
  disconnected: { label: 'Disconnected', badge: 'bg-gray-500/15 text-gray-300', dot: 'bg-gray-400' },
};

function StatusCard({ status }: { status: ObsStatus }) {
  const style = STATE_STYLES[status.state];
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">OBS Connection</h2>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${style.badge}`}>
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Endpoint</dt>
          <dd className="font-mono text-gray-200">
            {status.host}:{status.port}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-gray-500">OBS Version</dt>
          <dd className="font-mono text-gray-200">{status.obsVersion ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Program Scene</dt>
          <dd className="text-gray-200">{status.currentScene ?? '—'}</dd>
        </div>
        <div className="flex gap-6">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Streaming</dt>
            <dd className={status.streaming ? 'text-red-400' : 'text-gray-500'}>{status.streaming ? 'LIVE' : 'Off'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Recording</dt>
            <dd className={status.recording ? 'text-red-400' : 'text-gray-500'}>{status.recording ? 'REC' : 'Off'}</dd>
          </div>
        </div>
      </dl>
      {status.lastError && (
        <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
          {status.lastError}
        </p>
      )}
    </div>
  );
}

function SceneList({ currentScene }: { currentScene?: string }) {
  const { data: scenes = [], isLoading, error } = useObsScenes(true);
  const switchScene = useObsSwitchScene();
  const [selected, setSelected] = useState<string | undefined>(currentScene);

  useEffect(() => {
    if (currentScene) setSelected(currentScene);
  }, [currentScene]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">Scenes</h2>
      {isLoading && <p className="text-sm text-gray-500">Loading scenes…</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
      {!isLoading && !error && scenes.length === 0 && <p className="text-sm text-gray-500">No scenes found in OBS.</p>}
      <ul className="space-y-2">
        {scenes.map((scene) => {
          const isCurrent = scene.name === currentScene;
          return (
            <li key={scene.name}>
              <button
                type="button"
                onClick={() => {
                  setSelected(scene.name);
                  switchScene.mutate(scene.name);
                }}
                disabled={switchScene.isPending && selected === scene.name}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left transition-colors ${
                  isCurrent
                    ? 'border-blue-500/60 bg-blue-600/15 text-blue-200'
                    : 'border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-700 hover:bg-gray-800'
                }`}
              >
                <span className="text-sm font-medium">{scene.name}</span>
                {isCurrent ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">On Program</span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Switch</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SourceList({ sceneName }: { sceneName?: string }) {
  const { data: sources = [], isLoading, error } = useObsSources(sceneName);
  const setVisibility = useObsSetSourceVisibility();

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">Sources</h2>
        {sceneName && <span className="text-xs text-gray-500">{sceneName}</span>}
      </div>
      {!sceneName && <p className="text-sm text-gray-500">Select a scene to manage its sources.</p>}
      {isLoading && <p className="text-sm text-gray-500">Loading sources…</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
      {sceneName && !isLoading && !error && sources.length === 0 && (
        <p className="text-sm text-gray-500">This scene has no sources.</p>
      )}
      <ul className="space-y-2">
        {sources.map((source) => (
          <li
            key={source.name}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-gray-200">{source.name}</p>
              {source.inputKind && <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">{source.inputKind}</p>}
            </div>
            <button
              type="button"
              onClick={() =>
                sceneName &&
                setVisibility.mutate({ sceneName, sourceName: source.name, visible: !source.visible })
              }
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                source.visible ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-gray-700/40 text-gray-400 hover:bg-gray-700/60'
              }`}
            >
              {source.visible ? 'Visible' : 'Hidden'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ObsPage() {
  const { data: status, isLoading, error } = useObsStatus();
  const connect = useObsConnect();
  const disconnect = useObsDisconnect();
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');

  useEffect(() => {
    if (status) {
      setHost((prev) => prev || status.host);
      setPort((prev) => prev || String(status.port));
    }
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">OBS Integration</h1>
          <p className="mt-1 text-sm text-gray-400">
            Connect to OBS Studio's WebSocket server to switch scenes and toggle sources from one place.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-300">
        Not verified against a live OBS instance in this environment. Connection handling, scene listing,
        and source visibility are wired to <code className="font-mono">obs-websocket</code> v5; confirm with a real
        OBS Studio instance (see <code className="font-mono">OBS-SETUP.md</code>) before broadcast.
      </div>

      {isLoading && <p className="text-sm text-gray-500">Checking OBS status…</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}

      {status && (
        <>
          <StatusCard status={status} />

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">Connect</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-400">
                <span className="mb-1 block uppercase tracking-[0.16em]">Host</span>
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-44 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="text-xs text-gray-400">
                <span className="mb-1 block uppercase tracking-[0.16em]">Port</span>
                <input
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-28 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => connect.mutate({ host, port: Number(port) || undefined })}
                disabled={connect.isPending || status.connected}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connect.isPending ? 'Connecting…' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending || status.state === 'disconnected'}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              The OBS WebSocket password is configured on the server (OBS_PASSWORD) and is never sent to the browser.
            </p>
          </div>

          {status.connected && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SceneList currentScene={status.currentScene} />
              <SourceList sceneName={status.currentScene} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
