import { Link } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import { GRAPHIC_KEYS, type GraphicKey } from '@arena/shared/types/realtime.js';

const LABELS: Record<GraphicKey, string> = {
  scoreboard: 'Scoreboard',
  playerIntro: 'Player Intro',
  teamIntro: 'Team Intro',
  draft: 'Draft',
  statistics: 'Statistics',
  mvp: 'MVP',
  fullscreen: 'Fullscreen',
};

const ROUTES: Record<GraphicKey, string> = {
  scoreboard: 'scoreboard',
  playerIntro: 'player-intro',
  teamIntro: 'team-intro',
  draft: 'draft',
  statistics: 'statistics',
  mvp: 'mvp',
  fullscreen: 'fullscreen',
};

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-gray-800 py-1.5">
      <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</span>
      <span className="font-display text-lg font-bold uppercase">{value}</span>
    </div>
  );
}

/**
 * Monitor is the "second screen" for the operator: a compact, high-contrast
 * read-only view of what is currently on air, used next to OBS.
 */
export function MonitorPage() {
  const { state, connected, latency } = useRealtime();
  const { payload } = state;
  const sb = payload.data.scoreboard;
  const stats = payload.data.statistics;
  const mvp = payload.data.mvp;
  const draft = payload.data.draft;
  const onAir = GRAPHIC_KEYS.filter((key) => payload.overlay[key]?.visible);

  const picks = (side: 'blue' | 'red') =>
    draft?.slots.filter((s) => s.side === side && s.actionType === 'pick' && s.heroName) ?? [];
  const bans = (side: 'blue' | 'red') =>
    draft?.slots.filter((s) => s.side === side && s.actionType === 'ban' && s.heroName) ?? [];

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Arena Graphics</div>
            <h1 className="font-display text-3xl font-black uppercase tracking-wide">Monitor</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold uppercase tracking-widest ${
                connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {connected ? 'Connected' : 'Reconnecting'}
            </span>
            <span className="text-gray-500">Ping {latency == null ? '—' : `${latency} ms`}</span>
            <span className="text-gray-500">Rev {state.revision}</span>
            <Link to="/dashboard/control" className="rounded bg-gray-800 px-3 py-1.5 hover:bg-gray-700">
              Control ↗
            </Link>
          </div>
        </header>

        {!sb ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            No match selected. Pick a match in the Control screen.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">Series</h2>
                <span className="text-xs uppercase tracking-widest text-gray-500">
                  {sb.tournamentName} · {sb.format} · Game {sb.gameNumber}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <div className="text-center">
                  <div className="font-display text-2xl font-black uppercase text-blue-400">{sb.blue.shortName}</div>
                  <div className="text-xs text-gray-500">{sb.blue.name}</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-6xl font-black tabular-nums">
                    {sb.blueWins}
                    <span className="mx-2 text-gray-600">:</span>
                    {sb.redWins}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-gray-500">{sb.status}</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-2xl font-black uppercase text-red-400">{sb.red.shortName}</div>
                  <div className="text-xs text-gray-500">{sb.red.name}</div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gray-300">On air</h2>
              {onAir.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing is on air.</p>
              ) : (
                <ul className="space-y-1">
                  {onAir.map((key) => (
                    <li key={key} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {LABELS[key]}
                      </span>
                      <Link to={`/overlay/${ROUTES[key]}`} target="_blank" className="text-xs text-cyan-400">
                        open ↗
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gray-300">Statistics</h2>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 text-sm">
                {(['kills', 'turrets', 'turtles', 'lords', 'gold'] as const).map((key) => (
                  <div key={key} className="contents">
                    <span className="border-b border-gray-800 py-1.5 text-right font-display text-lg font-bold tabular-nums">
                      {stats?.blue[key] ?? 0}
                    </span>
                    <span className="border-b border-gray-800 py-1.5 text-center text-[11px] uppercase tracking-widest text-gray-500">
                      {key}
                    </span>
                    <span className="border-b border-gray-800 py-1.5 font-display text-lg font-bold tabular-nums">
                      {stats?.red[key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {stats?.durationSeconds
                  ? `${Math.floor(stats.durationSeconds / 60)}m ${String(stats.durationSeconds % 60).padStart(2, '0')}s`
                  : 'Duration not set'}
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gray-300">Draft</h2>
              {(['blue', 'red'] as const).map((side) => (
                <div key={side} className="mb-3">
                  <div className={`text-xs font-bold uppercase tracking-widest ${side === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                    {side === 'blue' ? sb.blue.shortName : sb.red.shortName}
                  </div>
                  <div className="mt-1 text-sm">
                    {picks(side).length > 0
                      ? picks(side)
                          .map((s) => s.heroName)
                          .join(' · ')
                      : 'No picks'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Bans: {bans(side).length > 0 ? bans(side).map((s) => s.heroName).join(', ') : '—'}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gray-300">MVP</h2>
              {mvp ? (
                <>
                  <StatLine label="Player" value={mvp.nickname || '—'} />
                  <StatLine label="Team" value={mvp.teamName || '—'} />
                  <StatLine label="Hero" value={mvp.heroName || '—'} />
                  <StatLine label="KDA" value={`${mvp.kills} / ${mvp.deaths} / ${mvp.assists}`} />
                </>
              ) : (
                <p className="text-sm text-gray-500">No MVP recorded for this game.</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-5 lg:col-span-3">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gray-300">Graphic links</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                {GRAPHIC_KEYS.map((key) => (
                  <Link
                    key={key}
                    to={`/overlay/${ROUTES[key]}`}
                    target="_blank"
                    className={`rounded border px-3 py-2 text-xs font-semibold uppercase tracking-widest ${
                      payload.overlay[key]?.visible
                        ? 'border-red-500/60 bg-red-500/10 text-red-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    {LABELS[key]}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
