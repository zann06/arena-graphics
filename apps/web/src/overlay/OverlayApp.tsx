import { useParams } from 'react-router-dom';
import { OverlayStage } from './OverlayStage';
import { useRealtime } from '../hooks/useRealtime';
import {
  ScoreboardGraphic,
  PlayerIntroGraphic,
  TeamIntroGraphic,
  FullscreenGraphic,
  DraftGraphic,
  StatisticsGraphic,
  MvpGraphic,
  StandbyBadge,
} from './graphics';
import type { GraphicKey } from '@arena/shared/types/realtime.js';

const ROUTE_TO_KEY: Record<string, GraphicKey> = {
  scoreboard: 'scoreboard',
  'player-intro': 'playerIntro',
  'team-intro': 'teamIntro',
  draft: 'draft',
  statistics: 'statistics',
  mvp: 'mvp',
  fullscreen: 'fullscreen',
};

/** Public overlay URLs, used by the sidebar and the monitor screen. */
export const OVERLAY_ROUTES: Record<GraphicKey, string> = {
  scoreboard: '/overlay/scoreboard',
  playerIntro: '/overlay/player-intro',
  teamIntro: '/overlay/team-intro',
  draft: '/overlay/draft',
  statistics: '/overlay/statistics',
  mvp: '/overlay/mvp',
  fullscreen: '/overlay/fullscreen',
};

export function OverlayApp() {
  const { kind = 'scoreboard' } = useParams();
  const key = ROUTE_TO_KEY[kind];
  const { state, connected } = useRealtime();
  const params = new URLSearchParams(window.location.search);
  const showDebug = params.get('debug') === '1';
  const preview = params.get('preview') === '1';
  const live = key ? Boolean(state.payload.overlay[key]?.visible) : false;
  // Preview forces the graphic to render locally without putting it on air.
  const visible = live || preview;
  const data = state.payload.data;
  // Active theme for this graphic (resolved from Template Studio). Falls back to
  // the built-in default when no template is active for this type.
  const theme = key ? state.payload.themes?.[key] ?? null : null;

  return (
    <OverlayStage>
      {showDebug && <StandbyBadge connected={connected} />}
      {showDebug && preview && !live && (
        <div className="absolute left-6 top-6 rounded-sm border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">
          Preview · off air
        </div>
      )}

      {key === 'scoreboard' && <ScoreboardGraphic data={data.scoreboard} visible={visible} theme={theme} />}
      {key === 'playerIntro' && <PlayerIntroGraphic data={data.playerIntro} visible={visible} theme={theme} />}
      {key === 'teamIntro' && <TeamIntroGraphic data={data.teamIntro} visible={visible} theme={theme} />}
      {key === 'draft' && (
        <DraftGraphic data={data.draft} scoreboard={data.scoreboard} visible={visible} theme={theme} />
      )}
      {key === 'statistics' && (
        <StatisticsGraphic data={data.statistics} scoreboard={data.scoreboard} visible={visible} theme={theme} />
      )}
      {key === 'mvp' && <MvpGraphic data={data.mvp} visible={visible} theme={theme} />}
      {key === 'fullscreen' && (
        <FullscreenGraphic
          data={data.fullscreen}
          visible={visible}
          tournamentName={data.scoreboard?.tournamentName}
          theme={theme}
        />
      )}

      {!key && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded border border-white/15 bg-black/60 px-6 py-4 text-white">
            Unknown overlay: {kind}. Valid: scoreboard, player-intro, team-intro, draft, statistics, mvp, fullscreen.
          </div>
        </div>
      )}
    </OverlayStage>
  );
}
