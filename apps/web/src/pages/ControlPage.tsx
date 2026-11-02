import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useRealtime } from '../hooks/useRealtime';
import { useMatches } from '../hooks/api/useMatches';
import { useTeams } from '../hooks/api/useTeams';
import { usePlayers } from '../hooks/api/usePlayers';
import { useHeroes } from '../hooks/api/useHeroes';
import { Stepper } from '../components/graphics/primitives';
import { ScreenTabs } from '../components/graphics/screen';
import {
  GRAPHIC_KEYS,
  DRAFT_FORMATS,
  OBJECTIVE_LABELS,
  OBJECTIVE_TYPES,
  type DraftFormatKey,
  type GraphicKey,
  type ObjectiveType,
  type TeamStatistics,
} from '@arena/shared/types/realtime.js';

const GRAPHIC_LABELS: Record<GraphicKey, string> = {
  scoreboard: 'Scoreboard',
  playerIntro: 'Player Intro',
  teamIntro: 'Team Intro',
  draft: 'Draft',
  statistics: 'Statistics',
  mvp: 'MVP',
  fullscreen: 'Fullscreen',
  objective: 'Objective Alert',
};

const OVERLAY_ROUTES: Record<GraphicKey, string> = {
  scoreboard: 'scoreboard',
  playerIntro: 'player-intro',
  teamIntro: 'team-intro',
  draft: 'draft',
  statistics: 'statistics',
  mvp: 'mvp',
  fullscreen: 'fullscreen',
  objective: 'objective',
};

const STAT_KEYS = ['kills', 'turrets', 'turtles', 'lords', 'gold'] as const;
const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = {
  kills: 'Kills',
  turrets: 'Turrets',
  turtles: 'Turtles',
  lords: 'Lords',
  gold: 'Gold diff',
};

const ZERO: TeamStatistics = { kills: 0, turrets: 0, turtles: 0, lords: 0, gold: 0 };

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">{title}</h3>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function ControlPage() {
  const {
    state,
    connected,
    error,
    selectMatch,
    setGraphic,
    resetGraphics,
    stepPlayerIntro,
    loadTeamIntro,
    setDraftSlot,
    setDraftFormat,
    resetDraft,
    setStatistics,
    resetStatistics,
    setMvp,
    setFullscreen,
    triggerObjective,
    hideObjective,
  } = useRealtime();

  const { data: matches = [] } = useMatches();
  const { data: teams = [] } = useTeams();
  const { data: players = [] } = usePlayers();
  const { data: heroes = [], isLoading: heroesLoading } = useHeroes();

  const selectedMatchId = state.payload.selectedMatchId ? Number(state.payload.selectedMatchId) : '';
  const scoreboard = state.payload.data.scoreboard;
  const draft = state.payload.data.draft;
  const savedStatistics = state.payload.data.statistics;
  const savedMvp = state.payload.data.mvp;

  // --- Statistics form: seeded from the persisted values, editable before apply.
  const [statsDraft, setStatsDraft] = useState<{ blue: TeamStatistics; red: TeamStatistics; durationSeconds: number | null }>(
    { blue: { ...ZERO }, red: { ...ZERO }, durationSeconds: null }
  );
  useEffect(() => {
    if (!savedStatistics) return;
    setStatsDraft({
      blue: { ...savedStatistics.blue },
      red: { ...savedStatistics.red },
      durationSeconds: savedStatistics.durationSeconds,
    });
  }, [savedStatistics]);

  // --- MVP form: seeded from the persisted record.
  const [mvpDraft, setMvpDraft] = useState<{
    playerId: number | null;
    heroId: number | null;
    kills: number;
    deaths: number;
    assists: number;
  }>({ playerId: null, heroId: null, kills: 0, deaths: 0, assists: 0 });
  useEffect(() => {
    if (!savedMvp) return;
    setMvpDraft({
      playerId: savedMvp.playerId,
      heroId: savedMvp.heroId,
      kills: savedMvp.kills,
      deaths: savedMvp.deaths,
      assists: savedMvp.assists,
    });
  }, [savedMvp]);

  const [fullscreenDraft, setFullscreenDraft] = useState<{
    mode: 'starting-soon' | 'break' | 'result';
    title: string;
    subtitle: string;
  }>({ mode: 'starting-soon', title: 'STARTING SOON', subtitle: 'Match begins shortly' });

  const [objectiveSide, setObjectiveSide] = useState<'blue' | 'red'>('blue');

  const teamName = (id: number) => teams.find((t) => t.id === id)?.shortName ?? `#${id}`;

  const rosterForTeams = useMemo(() => {
    if (!scoreboard) return [];
    return players.filter((p) => p.teamId === scoreboard.blue.id || p.teamId === scoreboard.red.id);
  }, [players, scoreboard]);

  const applyStatistics = () => {
    setStatistics({
      blue: statsDraft.blue,
      red: statsDraft.red,
      durationSeconds: statsDraft.durationSeconds,
    });
    toast.success('Statistics saved to game');
  };

  const applyMvp = () => {
    if (!mvpDraft.playerId) {
      toast.error('Select an MVP player first');
      return;
    }
    setMvp({
      playerId: mvpDraft.playerId,
      heroId: mvpDraft.heroId,
      kills: mvpDraft.kills,
      deaths: mvpDraft.deaths,
      assists: mvpDraft.assists,
    });
    toast.success('MVP saved to game');
  };

  const updateStat = (side: 'blue' | 'red', stat: (typeof STAT_KEYS)[number], value: number) => {
    setStatsDraft((prev) => ({ ...prev, [side]: { ...prev[side], [stat]: value } }));
  };

  const fireObjective = (type: ObjectiveType) => {
    triggerObjective({ type, side: objectiveSide });
    const team =
      scoreboard && (objectiveSide === 'blue' ? scoreboard.blue.shortName : scoreboard.red.shortName);
    toast.success(`${OBJECTIVE_LABELS[type]}${team ? ` — ${team}` : ''}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Graphics Control</h2>
          <p className="text-sm text-gray-400">
            Live overlay state, broadcast safety controls, and MLBB match data entry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScreenTabs />
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {connected ? 'Realtime connected' : 'Reconnecting'}
          </span>
          <button
            onClick={resetGraphics}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-700"
          >
            Hide all graphics
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Realtime error: {error}
        </div>
      )}

      <Section title="Active match" hint="Selecting a match loads teams, roster, series score, draft, statistics and MVP">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMatchId}
            onChange={(e) => e.target.value && selectMatch(Number(e.target.value))}
            className="min-w-[360px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
          >
            <option value="">Select a match…</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {teamName(match.teamAId)} vs {teamName(match.teamBId)} · {match.format} · {match.status}
              </option>
            ))}
          </select>
          {scoreboard && (
            <div className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2">
              <span className="font-display text-xl font-black uppercase">{scoreboard.blue.shortName}</span>
              <span className="text-2xl font-black">{scoreboard.blueWins}</span>
              <span className="text-xs uppercase tracking-widest text-gray-500">
                {scoreboard.format} · Game {scoreboard.gameNumber}
              </span>
              <span className="text-2xl font-black">{scoreboard.redWins}</span>
              <span className="font-display text-xl font-black uppercase">{scoreboard.red.shortName}</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="On air" hint="Each graphic opens as its own OBS Browser Source">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GRAPHIC_KEYS.map((key) => {
            const live = Boolean(state.payload.overlay[key]?.visible);
            return (
              <div
                key={key}
                className={`rounded-lg border p-4 transition-colors ${
                  live ? 'border-red-500/60 bg-red-500/10' : 'border-gray-800 bg-gray-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{GRAPHIC_LABELS[key]}</div>
                    <div className="text-[11px] uppercase tracking-widest text-gray-500">
                      {live ? '● On air' : 'Off air'}
                    </div>
                  </div>
                  <button
                    onClick={() => setGraphic(key, !live)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider ${
                      live ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {live ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Link
                    to={`/overlay/${OVERLAY_ROUTES[key]}?preview=1&debug=1`}
                    target="_blank"
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Preview ↗
                  </Link>
                  {key === 'playerIntro' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => stepPlayerIntro((state.payload.data.playerIntro?.index ?? 0) - 1)}
                        className="rounded bg-gray-800 px-2 py-1 text-xs hover:bg-gray-700"
                      >
                        ◀
                      </button>
                      <span className="text-xs text-gray-400">
                        {(state.payload.data.playerIntro?.index ?? 0) + 1}/
                        {state.payload.data.playerIntro?.players.length ?? 0}
                      </span>
                      <button
                        onClick={() => stepPlayerIntro((state.payload.data.playerIntro?.index ?? 0) + 1)}
                        className="rounded bg-gray-800 px-2 py-1 text-xs hover:bg-gray-700"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                  {key === 'teamIntro' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadTeamIntro('blue')} className="rounded bg-gray-800 px-2 py-1 text-xs hover:bg-gray-700">
                        Blue roster
                      </button>
                      <button onClick={() => loadTeamIntro('red')} className="rounded bg-gray-800 px-2 py-1 text-xs hover:bg-gray-700">
                        Red roster
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Draft pick & ban"
          hint={draft ? DRAFT_FORMATS[draft.format]?.label ?? DRAFT_FORMATS.standard.label : 'Select a match'}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="text-xs uppercase tracking-widest text-gray-500">
              Format
              <select
                value={draft?.format ?? 'standard'}
                disabled={!scoreboard}
                onChange={(e) => {
                  setDraftFormat(e.target.value as DraftFormatKey);
                  toast.success(`Draft format: ${e.target.value}`);
                }}
                className="ml-2 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white"
              >
                {Object.entries(DRAFT_FORMATS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                resetDraft();
                toast.success('Draft cleared for this game');
              }}
              disabled={!scoreboard}
              className="ml-auto rounded bg-gray-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-700 disabled:opacity-40"
            >
              Reset draft
            </button>
          </div>
          <div className="space-y-4">
            {(['blue', 'red'] as const).map((side) => (
              <div key={side}>
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                  <span>{side} side</span>
                  <span className="font-normal normal-case tracking-normal text-gray-500">
                    {scoreboard ? (side === 'blue' ? scoreboard.blue.shortName : scoreboard.red.shortName) : '—'}
                  </span>
                </div>
                <div className="space-y-2">
                  {(['ban', 'pick'] as const).map((actionType) => {
                    const slots = (draft?.slots ?? []).filter((s) => s.side === side && s.actionType === actionType);
                    return (
                      <div key={actionType} className="flex items-center gap-2">
                        <span className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          {actionType}
                        </span>
                        <div className="grid flex-1 grid-cols-5 gap-2">
                          {slots.map((slot) => (
                            <select
                              key={slot.slotNumber}
                              value={slot.heroId ?? ''}
                              disabled={!scoreboard}
                              onChange={(e) =>
                                setDraftSlot({
                                  side,
                                  actionType,
                                  slotNumber: slot.slotNumber,
                                  heroId: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className={`min-w-0 rounded border px-1 py-1 text-[11px] ${
                                slot.heroId ? 'border-blue-600/60 bg-blue-500/10' : 'border-gray-700 bg-gray-800'
                              }`}
                              title={`${side} ${actionType} ${slot.slotNumber}`}
                            >
                              <option value="">
                                {actionType === 'ban' ? 'Ban' : 'Pick'} {slot.slotNumber}
                              </option>
                              {heroes.map((hero) => (
                                <option key={hero.id} value={hero.id}>
                                  {hero.name}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {!heroesLoading && heroes.length === 0 && (
              <p className="text-xs text-amber-400">
                Hero library is empty.{' '}
                <Link to="/dashboard/heroes" className="underline">
                  Add heroes
                </Link>{' '}
                so draft slots can be filled.
              </p>
            )}
          </div>
        </Section>

        <Section title="Game statistics" hint="Saved per game to the database">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2">
            <div className="text-center text-sm font-bold uppercase tracking-widest text-blue-400">
              {scoreboard?.blue.shortName ?? 'Blue'}
            </div>
            <div />
            <div className="text-center text-sm font-bold uppercase tracking-widest text-red-400">
              {scoreboard?.red.shortName ?? 'Red'}
            </div>

            {STAT_KEYS.map((stat) => (
              <div key={stat} className="contents">
                <Stepper
                  value={statsDraft.blue[stat]}
                  min={stat === 'gold' ? -10_000_000 : 0}
                  max={stat === 'gold' ? 10_000_000 : 9999}
                  onChange={(next) => updateStat('blue', stat, next)}
                />
                <span className="text-center text-[10px] uppercase tracking-widest text-gray-500">
                  {STAT_LABELS[stat]}
                </span>
                <Stepper
                  value={statsDraft.red[stat]}
                  min={stat === 'gold' ? -10_000_000 : 0}
                  max={stat === 'gold' ? 10_000_000 : 9999}
                  onChange={(next) => updateStat('red', stat, next)}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs uppercase tracking-widest text-gray-500">
              Duration (s)
              <input
                type="number"
                min={0}
                value={statsDraft.durationSeconds ?? ''}
                placeholder="—"
                onChange={(e) =>
                  setStatsDraft((prev) => ({
                    ...prev,
                    durationSeconds: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="mt-1 w-28 rounded border border-gray-700 bg-gray-800 px-2 py-1"
              />
            </label>
            <button
              onClick={applyStatistics}
              disabled={!scoreboard}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
            >
              Apply statistics
            </button>
            <button
              onClick={() => {
                resetStatistics();
                setStatsDraft({ blue: { ...ZERO }, red: { ...ZERO }, durationSeconds: null });
                toast.success('Statistics cleared on overlay');
              }}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            Gold diff may be negative. Statistics are stored for game {state.payload.currentGame ?? '—'} of the selected
            match.
          </p>
        </Section>

        <Section title="MVP" hint="Player, hero and KDA saved to the database">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs uppercase tracking-widest text-gray-500">
              Player
              <select
                value={mvpDraft.playerId ?? ''}
                disabled={!scoreboard}
                onChange={(e) =>
                  setMvpDraft((prev) => ({ ...prev, playerId: e.target.value ? Number(e.target.value) : null }))
                }
                className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1"
              >
                <option value="">Select player…</option>
                {rosterForTeams.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.nickname} · {teamName(player.teamId)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-widest text-gray-500">
              Hero
              <select
                value={mvpDraft.heroId ?? ''}
                disabled={!scoreboard}
                onChange={(e) =>
                  setMvpDraft((prev) => ({ ...prev, heroId: e.target.value ? Number(e.target.value) : null }))
                }
                className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1"
              >
                <option value="">Select hero…</option>
                {heroes.map((hero) => (
                  <option key={hero.id} value={hero.id}>
                    {hero.name}
                  </option>
                ))}
              </select>
            </label>
            {(['kills', 'deaths', 'assists'] as const).map((stat) => (
              <label key={stat} className="text-xs uppercase tracking-widest text-gray-500">
                {stat}
                <div className="mt-1">
                  <Stepper
                    value={mvpDraft[stat]}
                    min={0}
                    max={99}
                    onChange={(next) => setMvpDraft((prev) => ({ ...prev, [stat]: next }))}
                  />
                </div>
              </label>
            ))}
          </div>
          {savedMvp && (
            <p className="mt-3 text-[11px] text-gray-500">
              Saved: {savedMvp.nickname || '—'} · {savedMvp.heroName || 'no hero'} · {savedMvp.kills}/
              {savedMvp.deaths}/{savedMvp.assists}
            </p>
          )}
          <button
            onClick={applyMvp}
            disabled={!scoreboard}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
          >
            Apply MVP
          </button>
        </Section>

        <Section title="Fullscreen card" hint="Starting soon, break, match result">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs uppercase tracking-widest text-gray-500">
              Mode
              <select
                value={fullscreenDraft.mode}
                onChange={(e) =>
                  setFullscreenDraft((prev) => ({ ...prev, mode: e.target.value as typeof prev.mode }))
                }
                className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1"
              >
                <option value="starting-soon">Starting soon</option>
                <option value="break">Break</option>
                <option value="result">Match result</option>
              </select>
            </label>
            <label className="text-xs uppercase tracking-widest text-gray-500">
              Title
              <input
                value={fullscreenDraft.title}
                onChange={(e) => setFullscreenDraft((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1"
              />
            </label>
            <label className="col-span-2 text-xs uppercase tracking-widest text-gray-500">
              Subtitle
              <input
                value={fullscreenDraft.subtitle}
                onChange={(e) => setFullscreenDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1"
              />
            </label>
          </div>
          <button
            onClick={() => setFullscreen(fullscreenDraft)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Apply card
          </button>
        </Section>

        <Section title="Objective alerts" hint="Manual trigger — slides in with team colors, auto-hides after ~5s">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-gray-500">Team</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
              {(['blue', 'red'] as const).map((side) => (
                <button
                  key={side}
                  onClick={() => setObjectiveSide(side)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                    objectiveSide === side
                      ? side === 'blue'
                        ? 'bg-blue-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {side === 'blue' ? scoreboard?.blue.shortName ?? 'Blue' : scoreboard?.red.shortName ?? 'Red'}
                </button>
              ))}
            </div>
            {!scoreboard && (
              <span className="text-[11px] text-amber-400">Select a match to use team colors.</span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {OBJECTIVE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => fireObjective(type)}
                className="rounded-lg bg-blue-600 px-3 py-3 text-sm font-bold uppercase tracking-widest hover:bg-blue-500"
              >
                {OBJECTIVE_LABELS[type]}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500">
              First Blood, Turtle, and Lord can each be fired by the operator the moment they happen.
            </p>
            <button
              onClick={() => {
                hideObjective();
                toast.success('Objective banner hidden');
              }}
              className="shrink-0 rounded bg-gray-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-700"
            >
              Hide banner
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
