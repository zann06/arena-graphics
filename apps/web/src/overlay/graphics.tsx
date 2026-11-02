import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type {
  DraftSlotData,
  MvpData,
  ObjectiveAlertData,
  ObjectiveType,
  PlayerIntroData,
  ScoreboardData,
  StatisticsData,
  TeamIntroData,
  TeamSummary,
} from '@arena/shared/types/realtime.js';
import { OBJECTIVE_LABELS } from '@arena/shared/types/realtime.js';
import type { TemplateTheme } from '@arena/shared/types/templates.js';
import { hexToRgba, resolveTheme, type ResolvedTheme } from './theme.js';

/** Inject a Google-Fonts <link> for the chosen display font, once per document. */
const FONT_QUERY: Record<string, string> = {
  'Barlow Condensed': 'Barlow+Condensed:wght@600;700;800;900',
  Inter: 'Inter:wght@600;700;800;900',
  Oswald: 'Oswald:wght@600;700',
  Rajdhani: 'Rajdhani:wght@600;700',
  Teko: 'Teko:wght@600;700',
};

function useDisplayFont(font: string) {
  useEffect(() => {
    const family = FONT_QUERY[font];
    if (!family) return;
    const id = `gf-${font.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    document.head.appendChild(link);
  }, [font]);
}

function usePresence(visible: boolean, delay = 260) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), delay);
    return () => window.clearTimeout(timer);
  }, [visible, delay]);

  return { mounted, active: visible };
}

function Graphic({
  visible,
  children,
  align = 'bottom',
  theme,
}: {
  visible: boolean;
  children: ReactNode;
  align?: 'bottom' | 'center' | 'top';
  theme: ResolvedTheme;
}) {
  const { mounted, active } = usePresence(visible);
  useDisplayFont(theme.displayFont);
  if (!mounted) return null;

  const position = align === 'center' ? 'inset-0 flex items-center justify-center' : align === 'top' ? 'top-0 left-0 right-0' : 'bottom-0 left-0 right-0';
  const scopeStyle = {
    // `.font-display` reads `--font-display`; overriding it per graphic let the
    // template's chosen typography reach every title.
    '--font-display': `'${theme.displayFont}', system-ui, sans-serif`,
    '--arena-text': theme.textColor,
  } as CSSProperties;

  return (
    <div
      className={`absolute ${position} overlay-graphic ${active ? 'is-visible' : 'is-hidden'}`}
      style={scopeStyle}
    >
      <div style={{ transform: theme.transform, transformOrigin: align === 'top' ? 'top center' : align === 'center' ? 'center' : 'bottom center' }}>
        {children}
      </div>
    </div>
  );
}

function Crest({ team, size = 84 }: { team: TeamSummary; size?: number }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: team.secondaryColor,
        background: `linear-gradient(145deg, ${team.primaryColor}, #0b1020)`,
      }}
    >
      {team.logoPath ? (
        <img src={team.logoPath} alt={team.shortName} style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
      ) : (
        <span className="font-black tracking-tight" style={{ fontSize: size * 0.3, color: '#fff' }}>
          {team.shortName.slice(0, 4)}
        </span>
      )}
    </div>
  );
}

export function ScoreboardGraphic({
  data,
  visible,
  theme: rawTheme,
}: {
  data: ScoreboardData | null;
  visible: boolean;
  theme?: TemplateTheme | null;
}) {
  const theme = resolveTheme(rawTheme);
  return (
    <Graphic visible={visible && !!data} theme={theme}>
      {data && (
        <div className="flex justify-center pb-[34px]">
          <div className="relative flex items-stretch" style={{ filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.55))' }}>
            {/* Blue side */}
            <div
              className="flex items-center gap-[18px] pl-[26px] pr-[54px] py-[14px]"
              style={{
                background: `linear-gradient(100deg, ${data.blue.primaryColor} 0%, ${theme.panelColor} 92%)`,
                clipPath: 'polygon(0 0, 100% 0, calc(100% - 38px) 100%, 0 100%)',
              }}
            >
              <Crest team={data.blue} size={92} />
              <div className="min-w-[210px]">
                <div className="text-[15px] font-semibold uppercase tracking-[0.32em]" style={{ color: hexToRgba(theme.textColor, 0.55) }}>Blue Side</div>
                <div className="font-display text-[42px] font-black uppercase leading-none tracking-[0.04em]" style={{ color: theme.textColor }}>
                  {data.blue.shortName}
                </div>
                <div className="mt-1 max-w-[230px] truncate text-[13px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(theme.textColor, 0.45) }}>
                  {data.blue.name}
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="relative z-10 flex items-center gap-[26px] px-[34px]" style={{ backgroundColor: theme.panelColor }}>
              <span className="font-display text-[82px] font-black leading-none" style={{ color: theme.textColor }}>{data.blueWins}</span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: hexToRgba(theme.textColor, 0.45) }}>{data.format}</span>
                <span
                  className="rounded-sm px-[14px] py-[5px] text-[13px] font-bold uppercase tracking-[0.24em]"
                  style={{ backgroundColor: theme.accentColor, color: '#fff', borderRadius: theme.radius ? `${theme.radius}px` : undefined }}
                >
                  Game {data.gameNumber}
                </span>
              </div>
              <span className="font-display text-[82px] font-black leading-none" style={{ color: theme.textColor }}>{data.redWins}</span>
            </div>

            {/* Red side */}
            <div
              className="flex items-center gap-[18px] pl-[54px] pr-[26px] py-[14px]"
              style={{
                background: `linear-gradient(260deg, ${data.red.primaryColor} 0%, ${theme.panelColor} 92%)`,
                clipPath: 'polygon(38px 0, 100% 0, 100% 100%, 0 100%)',
              }}
            >
              <div className="min-w-[210px] text-right">
                <div className="text-[15px] font-semibold uppercase tracking-[0.32em]" style={{ color: hexToRgba(theme.textColor, 0.55) }}>Red Side</div>
                <div className="font-display text-[42px] font-black uppercase leading-none tracking-[0.04em]" style={{ color: theme.textColor }}>
                  {data.red.shortName}
                </div>
                <div className="mt-1 ml-auto max-w-[230px] truncate text-[13px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(theme.textColor, 0.45) }}>
                  {data.red.name}
                </div>
              </div>
              <Crest team={data.red} size={92} />
            </div>
          </div>
        </div>
      )}
    </Graphic>
  );
}

function PhotoPlaceholder({ player, accent, width = 186, height = 230 }: { player: PlayerIntroData['player']; accent: string; width?: number; height?: number }) {
  if (player?.photoPath) {
    return <img src={player.photoPath} alt={player.nickname} style={{ width, height, objectFit: 'cover' }} />;
  }
  return (
    <div
      className="flex items-end justify-center"
      style={{ width, height, background: `linear-gradient(160deg, ${accent}55, #0b1020 70%)` }}
    >
      <span className="pb-6 font-display text-[64px] font-black uppercase text-white/25">
        {player?.nickname?.slice(0, 2) ?? '--'}
      </span>
    </div>
  );
}

export function PlayerIntroGraphic({
  data,
  visible,
  theme: rawTheme,
}: {
  data: PlayerIntroData | null;
  visible: boolean;
  theme?: TemplateTheme | null;
}) {
  const theme = resolveTheme(rawTheme);
  return (
    <Graphic visible={visible && !!data} theme={theme}>
      {data && (
        <div className="flex justify-start pl-[64px] pb-[64px]">
          <div className="relative flex" style={{ filter: 'drop-shadow(0 20px 44px rgba(0,0,0,0.6))' }}>
            <div style={{ borderBottom: `6px solid ${data.team.secondaryColor}` }}>
              <PhotoPlaceholder player={data.player} accent={data.team.primaryColor} />
            </div>
            <div
              className="flex min-w-[520px] flex-col justify-center px-[34px]"
              style={{
                background: theme.panelGradient,
                borderRadius: theme.radius ? `0 ${theme.radius}px ${theme.radius}px 0` : undefined,
              }}
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="h-[3px] w-9" style={{ backgroundColor: data.team.secondaryColor }} />
                <span className="text-[12px] font-semibold uppercase tracking-[0.36em]" style={{ color: hexToRgba(theme.textColor, 0.5) }}>
                  {data.team.shortName} · {data.player?.role ?? 'Player'}
                </span>
              </div>
              <div className="font-display text-[64px] font-black uppercase leading-[0.95] tracking-[0.02em]" style={{ color: theme.textColor }}>
                {data.player?.nickname ?? '—'}
              </div>
              <div className="mt-2 text-[20px] uppercase tracking-[0.14em]" style={{ color: hexToRgba(theme.textColor, 0.55) }}>
                {data.player?.realName ?? ''}
              </div>
              <div className="mt-5 flex items-center gap-[6px]">
                {data.players.map((_, index) => (
                  <span
                    key={index}
                    className="h-[4px] w-[26px]"
                    style={{ backgroundColor: index === data.index ? data.team.secondaryColor : hexToRgba(theme.textColor, 0.18) }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Graphic>
  );
}

export function TeamIntroGraphic({
  data,
  visible,
  theme: rawTheme,
}: {
  data: TeamIntroData | null;
  visible: boolean;
  theme?: TemplateTheme | null;
}) {
  const theme = resolveTheme(rawTheme);
  return (
    <Graphic visible={visible && !!data} theme={theme}>
      {data && (
        <div className="flex flex-col items-center gap-4 pb-[72px]">
          <div className="flex items-center gap-4">
            <Crest team={data.team} size={64} />
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.4em]" style={{ color: hexToRgba(theme.textColor, 0.45) }}>Team Introduction</div>
              <div className="font-display text-[40px] font-black uppercase leading-none" style={{ color: theme.textColor }}>{data.team.name}</div>
            </div>
          </div>
          <div className="flex gap-[14px]">
            {data.players.map((player, index) => (
              <div
                key={player.id}
                className="relative w-[236px] overflow-hidden"
                style={{
                  background: theme.panelGradient,
                  borderTop: `4px solid ${data.team.secondaryColor}`,
                  borderRadius: theme.radius ? `0 0 ${theme.radius}px ${theme.radius}px` : undefined,
                }}
              >
                <PhotoPlaceholder player={player} accent={data.team.primaryColor} width={236} height={200} />
                <div className="px-[16px] py-[12px]">
                  <div className="font-display text-[26px] font-black uppercase leading-none" style={{ color: theme.textColor }}>{player.nickname}</div>
                  <div className="mt-1 text-[12px] uppercase tracking-[0.2em]" style={{ color: hexToRgba(theme.textColor, 0.45) }}>{player.role}</div>
                </div>
                <span className="absolute right-2 top-2 text-[12px] font-bold" style={{ color: hexToRgba(theme.textColor, 0.3) }}>0{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Graphic>
  );
}

export function FullscreenGraphic({
  data,
  visible,
  tournamentName,
  theme: rawTheme,
}: {
  data: { mode: 'starting-soon' | 'break' | 'result'; title: string; subtitle: string } | null;
  visible: boolean;
  tournamentName?: string;
  theme?: TemplateTheme | null;
}) {
  const theme = resolveTheme(rawTheme);
  return (
    <Graphic visible={visible && !!data} align="center" theme={theme}>
      {data && (
        <div className="relative w-full">
          <div
            className="relative flex flex-col items-center justify-center py-[72px]"
            style={{ background: `linear-gradient(90deg, ${hexToRgba(theme.panelColor, 0)} 0%, ${hexToRgba(theme.panelColor, 0.95)} 18%, ${hexToRgba(theme.panelColor, 0.97)} 50%, ${hexToRgba(theme.panelColor, 0.95)} 82%, ${hexToRgba(theme.panelColor, 0)} 100%)` }}
          >
            {theme.showAccentBar && (
              <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${theme.accentColor}, ${theme.accentColor}, transparent)` }} />
            )}
            <div className="text-[15px] font-semibold uppercase tracking-[0.55em]" style={{ color: hexToRgba(theme.textColor, 0.45) }}>{tournamentName ?? 'Arena Graphics'}</div>
            <div className="mt-4 font-display text-[112px] font-black uppercase leading-none tracking-[0.04em]" style={{ color: theme.textColor }}>
              {data.title}
            </div>
            <div className="mt-4 text-[22px] uppercase tracking-[0.22em]" style={{ color: hexToRgba(theme.textColor, 0.55) }}>{data.subtitle}</div>
            <div className="mt-7 flex items-center gap-3">
              <span className="h-[2px] w-16" style={{ backgroundColor: hexToRgba(theme.textColor, 0.2) }} />
              <span className="text-[12px] font-bold uppercase tracking-[0.4em]" style={{ color: theme.accentColor }}>{data.mode.replace('-', ' ')}</span>
              <span className="h-[2px] w-16" style={{ backgroundColor: hexToRgba(theme.textColor, 0.2) }} />
            </div>
          </div>
        </div>
      )}
    </Graphic>
  );
}

function DraftSlot({ slot, accent, radius = 0, textColor = '#ffffff' }: { slot: DraftSlotData; accent: string; radius?: number; textColor?: string }) {
  const filled = Boolean(slot.heroName);
  const isPick = slot.actionType === 'pick';
  return (
    <div
      className="relative flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center overflow-hidden border"
      style={{
        flex: '0 0 92px',
        borderColor: filled ? accent : hexToRgba(textColor, 0.14),
        borderRadius: radius ? `${radius}px` : undefined,
        background: filled
          ? `linear-gradient(160deg, ${hexToRgba(accent, 0.8)} 0%, ${hexToRgba(accent, 0.33)} 42%, rgba(8,13,25,0.94) 100%)`
          : 'rgba(8,13,25,0.82)',
        boxShadow: filled ? `inset 0 0 0 1px ${hexToRgba(accent, 0.4)}` : undefined,
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: hexToRgba(textColor, filled ? 0.7 : 0.4) }}
      >
        {isPick ? 'PICK' : 'BAN'} {slot.slotNumber}
      </div>
      <div className="mt-1 line-clamp-2 px-1 text-center font-display text-[17px] font-bold uppercase leading-tight" style={{ color: textColor }}>
        {slot.heroName ?? '—'}
      </div>
    </div>
  );
}

export function DraftGraphic({
  data,
  scoreboard,
  visible,
  theme: rawTheme,
}: {
  data: { matchId: number; slots: DraftSlotData[] } | null;
  scoreboard: ScoreboardData | null;
  visible: boolean;
  theme?: TemplateTheme | null;
}) {
  const blueSlots = data?.slots.filter((s) => s.side === 'blue') ?? [];
  const redSlots = data?.slots.filter((s) => s.side === 'red') ?? [];
  const blue = scoreboard?.blue;
  const red = scoreboard?.red;
  const theme = resolveTheme(rawTheme);

  return (
    <Graphic visible={visible && !!data && !!blue && !!red} align="top" theme={theme}>
      {data && blue && red && (
        <div
          className="flex items-start justify-between px-[48px] pb-4 pt-[30px]"
          style={{
            background: `linear-gradient(180deg, ${hexToRgba(theme.panelColor, 0.82)} 0%, ${hexToRgba(theme.panelColor, 0.55)} 62%, ${hexToRgba(theme.panelColor, 0)} 100%)`,
          }}
        >
          <div className="shrink-0">
            <div className="mb-3 flex items-center gap-3">
              <Crest team={blue} size={54} />
              <span className="shrink-0 whitespace-nowrap font-display text-[34px] font-black uppercase leading-none" style={{ flexShrink: 0, color: theme.textColor }}>{blue.shortName}</span>
              <span className="shrink-0 whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.accentColor }}>Blue</span>
            </div>
            <div className="mb-2 flex gap-2">
              {blueSlots.filter((s) => s.actionType === 'ban').map((slot) => (
                <DraftSlot key={`b-ban-${slot.slotNumber}`} slot={slot} accent={blue.primaryColor} radius={theme.radius} textColor={theme.textColor} />
              ))}
            </div>
            <div className="flex gap-2">
              {blueSlots.filter((s) => s.actionType === 'pick').map((slot) => (
                <DraftSlot key={`b-pick-${slot.slotNumber}`} slot={slot} accent={blue.primaryColor} radius={theme.radius} textColor={theme.textColor} />
              ))}
            </div>
          </div>

          <div className="mt-[76px] flex shrink-0 flex-col items-center gap-1 whitespace-nowrap">
            <span className="text-[11px] font-bold uppercase tracking-[0.4em]" style={{ color: hexToRgba(theme.textColor, 0.4) }}>Draft</span>
            <span className="whitespace-nowrap font-display text-[26px] font-black uppercase" style={{ color: theme.textColor }}>{scoreboard?.format}</span>
            <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.3em]" style={{ color: hexToRgba(theme.textColor, 0.4) }}>Game {scoreboard?.gameNumber}</span>
          </div>

          <div className="shrink-0 text-right">
            <div className="mb-3 flex items-center justify-end gap-3">
              <span className="shrink-0 whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.accentColor }}>Red</span>
              <span className="shrink-0 whitespace-nowrap font-display text-[34px] font-black uppercase leading-none" style={{ color: theme.textColor }}>{red.shortName}</span>
              <Crest team={red} size={54} />
            </div>
            <div className="mb-2 flex justify-end gap-2">
              {redSlots.filter((s) => s.actionType === 'ban').map((slot) => (
                <DraftSlot key={`r-ban-${slot.slotNumber}`} slot={slot} accent={red.primaryColor} radius={theme.radius} textColor={theme.textColor} />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              {redSlots.filter((s) => s.actionType === 'pick').map((slot) => (
                <DraftSlot key={`r-pick-${slot.slotNumber}`} slot={slot} accent={red.primaryColor} radius={theme.radius} textColor={theme.textColor} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Graphic>
  );
}

function StatRow({ label, blueValue, redValue, blueColor, redColor, textColor = '#ffffff' }: { label: string; blueValue: number; redValue: number; blueColor: string; redColor: string; textColor?: string }) {
  const total = Math.max(blueValue + redValue, 1);
  const bluePct = (blueValue / total) * 100;
  const redPct = (redValue / total) * 100;

  return (
    <div className="mb-[14px]">
      <div className="mb-1 flex items-center justify-between text-[14px] font-bold uppercase tracking-[0.2em]">
        <span className="w-12 text-left" style={{ color: textColor }}>{blueValue}</span>
        <span style={{ color: hexToRgba(textColor, 0.45) }}>{label}</span>
        <span className="w-12 text-right" style={{ color: textColor }}>{redValue}</span>
      </div>
      <div className="flex h-[9px] w-full overflow-hidden" style={{ backgroundColor: hexToRgba(textColor, 0.1) }}>
        <div className="h-full transition-all duration-500" style={{ width: `${bluePct}%`, backgroundColor: blueColor }} />
        <div className="h-full flex-1" />
        <div className="h-full transition-all duration-500" style={{ width: `${redPct}%`, backgroundColor: redColor }} />
      </div>
    </div>
  );
}

export function StatisticsGraphic({
  data,
  scoreboard,
  visible,
  theme: rawTheme,
}: {
  data: StatisticsData | null;
  scoreboard: ScoreboardData | null;
  visible: boolean;
  theme?: TemplateTheme | null;
}) {
  const theme = resolveTheme(rawTheme);
  return (
    <Graphic visible={visible && !!data} theme={theme}>
      {data && (
        <div className="flex justify-center pb-[64px]">
          <div
            className="w-[860px] px-[34px] py-[26px]"
            style={{
              background: theme.panelGradient,
              borderTop: `3px solid ${theme.accentColor}`,
              borderRadius: theme.radius ? `0 0 ${theme.radius}px ${theme.radius}px` : undefined,
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display text-[28px] font-black uppercase" style={{ color: theme.textColor }}>{scoreboard?.blue.shortName ?? 'Blue'}</span>
                <span className="rounded-sm px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.2em] text-white" style={{ backgroundColor: theme.accentColor }}>Blue</span>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase tracking-[0.4em]" style={{ color: hexToRgba(theme.textColor, 0.4) }}>Statistics</div>
                <div className="text-[12px] uppercase tracking-[0.2em]" style={{ color: hexToRgba(theme.textColor, 0.55) }}>
                  {data.durationSeconds ? `${Math.floor(data.durationSeconds / 60)}:${String(data.durationSeconds % 60).padStart(2, '0')}` : 'LIVE'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-sm px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.2em] text-white" style={{ backgroundColor: '#f04452' }}>Red</span>
                <span className="font-display text-[28px] font-black uppercase" style={{ color: theme.textColor }}>{scoreboard?.red.shortName ?? 'Red'}</span>
              </div>
            </div>

            <StatRow label="Kills" blueValue={data.blue.kills} redValue={data.red.kills} blueColor={scoreboard?.blue.primaryColor ?? theme.accentColor} redColor={scoreboard?.red.primaryColor ?? '#f04452'} textColor={theme.textColor} />
            <StatRow label="Turrets" blueValue={data.blue.turrets} redValue={data.red.turrets} blueColor={scoreboard?.blue.primaryColor ?? theme.accentColor} redColor={scoreboard?.red.primaryColor ?? '#f04452'} textColor={theme.textColor} />
            <StatRow label="Turtles" blueValue={data.blue.turtles} redValue={data.red.turtles} blueColor={scoreboard?.blue.primaryColor ?? theme.accentColor} redColor={scoreboard?.red.primaryColor ?? '#f04452'} textColor={theme.textColor} />
            <StatRow label="Lords" blueValue={data.blue.lords} redValue={data.red.lords} blueColor={scoreboard?.blue.primaryColor ?? theme.accentColor} redColor={scoreboard?.red.primaryColor ?? '#f04452'} textColor={theme.textColor} />
            <StatRow label="Gold" blueValue={data.blue.gold} redValue={data.red.gold} blueColor={scoreboard?.blue.primaryColor ?? theme.accentColor} redColor={scoreboard?.red.primaryColor ?? '#f04452'} textColor={theme.textColor} />

            <div className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: hexToRgba(theme.textColor, 0.3) }}>{data.label}</div>
          </div>
        </div>
      )}
    </Graphic>
  );
}

export function MvpGraphic({
  data,
  visible,
  theme: rawTheme,
}: {
  data: MvpData | null;
  visible: boolean;
  theme?: TemplateTheme | null;
}) {
  const theme = resolveTheme(rawTheme);
  return (
    <Graphic visible={visible && !!data} align="center" theme={theme}>
      {data && (
        <div className="flex justify-center">
          <div
            className="relative w-[760px] overflow-hidden"
            style={{
              background: `linear-gradient(140deg, ${hexToRgba(theme.accentColor, 0.22)}, ${hexToRgba(theme.panelColor, 0.97)} 55%)`,
              border: `1px solid ${hexToRgba(theme.accentColor, 0.25)}`,
              borderRadius: theme.radius ? `${theme.radius}px` : undefined,
            }}
          >
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full" style={{ background: `radial-gradient(circle, ${hexToRgba(theme.accentColor, 0.28)}, transparent 70%)` }} />
            <div className="flex items-center gap-8 px-10 py-9">
              <div className="flex h-[150px] w-[150px] items-center justify-center rounded-full" style={{ background: `linear-gradient(145deg, ${theme.accentColor}, ${hexToRgba(theme.accentColor, 0.6)})` }}>
                <span className="font-display text-[52px] font-black uppercase" style={{ color: theme.panelColor }}>{data.nickname.slice(0, 2)}</span>
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-bold uppercase tracking-[0.5em]" style={{ color: theme.accentColor }}>Match MVP</div>
                <div className="mt-1 font-display text-[62px] font-black uppercase leading-none" style={{ color: theme.textColor }}>{data.nickname}</div>
                <div className="mt-2 text-[17px] uppercase tracking-[0.16em]" style={{ color: hexToRgba(theme.textColor, 0.55) }}>{data.realName}</div>
                <div className="mt-3 flex items-center gap-3 text-[13px] uppercase tracking-[0.22em]" style={{ color: hexToRgba(theme.textColor, 0.45) }}>
                  <span>{data.teamName}</span>
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: hexToRgba(theme.textColor, 0.3) }} />
                  <span>{data.role}</span>
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: hexToRgba(theme.textColor, 0.3) }} />
                  <span>{data.heroName || '—'}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 pl-8" style={{ borderLeft: `1px solid ${hexToRgba(theme.textColor, 0.1)}` }}>
                <div className="text-center">
                  <div className="font-display text-[46px] font-black leading-none" style={{ color: theme.textColor }}>{data.kills}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: hexToRgba(theme.textColor, 0.35) }}>Kills</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-[46px] font-black leading-none" style={{ color: theme.textColor }}>{data.deaths}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: hexToRgba(theme.textColor, 0.35) }}>Deaths</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-[46px] font-black leading-none" style={{ color: theme.textColor }}>{data.assists}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: hexToRgba(theme.textColor, 0.35) }}>Assists</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Graphic>
  );
}

function ObjectiveEmblem({ type, color }: { type: ObjectiveType; color: string }) {
  const common = { width: 66, height: 66, viewBox: '0 0 64 64', fill: 'none', 'aria-hidden': true } as const;
  if (type === 'lord') {
    return (
      <svg {...common}>
        <path d="M8 22l10 8 14-16 14 16 10-8-5 27H13z" fill={color} />
        <rect x="12" y="51" width="40" height="6" rx="3" fill={color} />
      </svg>
    );
  }
  if (type === 'turtle') {
    return (
      <svg {...common}>
        <path d="M32 7l20 10v14c0 12-8 20-20 24-12-4-20-12-20-24V17z" fill={color} />
        <path d="M32 20l10 6v8c0 6-4 10-10 12-6-2-10-6-10-12v-8z" fill="rgba(0,0,0,0.38)" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M32 6l7 17 18 1-14 12 5 18-16-10-16 10 5-18L7 24l18-1z" fill={color} />
    </svg>
  );
}

/**
 * Objective alert: a colored banner that slides in from the side of whichever
 * team secured First Blood / Turtle / Lord. Every trigger carries an increasing
 * `nonce`, which remounts the banner so the entrance animation replays.
 */
export function ObjectiveAlertGraphic({
  data,
  visible,
  theme: rawTheme,
}: {
  data: ObjectiveAlertData | null;
  visible: boolean;
  theme?: TemplateTheme | null;
}) {
  const theme = resolveTheme(rawTheme);
  const fromRight = data?.side === 'red';
  const accent = data?.team?.primaryColor ?? theme.accentColor;
  const secondary = data?.team?.secondaryColor ?? hexToRgba(theme.textColor, 0.4);
  const direction = fromRight ? '260deg' : '100deg';

  return (
    <Graphic visible={visible && !!data} align="top" theme={theme}>
      {data && (
        <div className="flex justify-center pt-[132px]">
          <div
            key={data.nonce}
            className={`objective-banner ${fromRight ? 'from-right' : 'from-left'} relative flex items-center gap-[26px] py-[24px] pl-[34px] pr-[52px]`}
            style={{
              minWidth: 780,
              background: `linear-gradient(${direction}, ${hexToRgba(accent, 0.97)} 0%, ${hexToRgba(theme.panelColor, 0.97)} 58%, ${hexToRgba(theme.panelColor, 0.86)} 100%)`,
              [fromRight ? 'borderRight' : 'borderLeft']: `8px solid ${secondary}`,
              borderRadius: theme.radius ? `${theme.radius}px` : undefined,
              boxShadow: '0 26px 64px rgba(0,0,0,0.55)',
            }}
          >
            {theme.showAccentBar && (
              <div
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${secondary}, ${hexToRgba(secondary, 0)})` }}
              />
            )}

            {data.team ? (
              <Crest team={data.team} size={96} />
            ) : (
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 96, height: 96, background: `linear-gradient(145deg, ${hexToRgba(accent, 0.9)}, #0b1020)` }}
              >
                <ObjectiveEmblem type={data.type} color={theme.textColor} />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="h-[3px] w-9" style={{ backgroundColor: secondary }} />
                <span className="text-[13px] font-semibold uppercase tracking-[0.42em]" style={{ color: hexToRgba(theme.textColor, 0.72) }}>
                  {OBJECTIVE_LABELS[data.type]}
                  {data.side ? ` · ${data.side === 'blue' ? 'Blue Side' : 'Red Side'}` : ''}
                </span>
              </div>
              <div
                className="font-display text-[68px] font-black uppercase leading-[0.95] tracking-[0.02em]"
                style={{ color: theme.textColor, textShadow: '0 6px 24px rgba(0,0,0,0.5)' }}
              >
                {data.title}
              </div>
              <div className="mt-1 truncate text-[20px] uppercase tracking-[0.16em]" style={{ color: hexToRgba(theme.textColor, 0.68) }}>
                {data.subtitle}
              </div>
            </div>

            <div
              className="ml-auto flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full"
              style={{ background: `linear-gradient(145deg, ${hexToRgba(accent, 0.95)}, ${hexToRgba(accent, 0.45)})` }}
            >
              <ObjectiveEmblem type={data.type} color={theme.textColor} />
            </div>
          </div>
        </div>
      )}
    </Graphic>
  );
}

export function StandbyBadge({ connected }: { connected: boolean }) {
  const style: CSSProperties = {
    backgroundColor: connected ? 'rgba(32,201,151,0.14)' : 'rgba(240,68,82,0.14)',
    color: connected ? '#20c997' : '#f04452',
    border: `1px solid ${connected ? 'rgba(32,201,151,0.4)' : 'rgba(240,68,82,0.4)'}`,
  };
  return (
    <div className="absolute right-6 top-6 flex items-center gap-2 rounded-sm px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em]" style={style}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: connected ? '#20c997' : '#f04452' }} />
      {connected ? 'Overlay ready' : 'Reconnecting'}
    </div>
  );
}
