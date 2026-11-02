import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', { transports: ['websocket'] });
const timer = setTimeout(() => {
  console.error('timeout waiting for state');
  process.exit(2);
}, 5000);

socket.on('connect', () => socket.emit('state:request'));

socket.on('state:initial', (state) => {
  clearTimeout(timer);
  const p = state.payload;
  console.log(
    JSON.stringify(
      {
        revision: state.revision,
        connected: socket.connected,
        selectedMatchId: p.selectedMatchId,
        seriesScore: p.seriesScore,
        overlay: Object.fromEntries(Object.entries(p.overlay).map(([k, v]) => [k, v.visible])),
        hasScoreboard: Boolean(p.data.scoreboard),
        scoreboard: p.data.scoreboard
          ? `${p.data.scoreboard.blue.shortName} ${p.data.scoreboard.blueWins}-${p.data.scoreboard.redWins} ${p.data.scoreboard.red.shortName} (${p.data.scoreboard.format}, game ${p.data.scoreboard.gameNumber})`
          : null,
        playerIntro: p.data.playerIntro
          ? `${p.data.playerIntro.team.shortName} ${p.data.playerIntro.player?.nickname ?? '-'} (${p.data.playerIntro.index + 1}/${p.data.playerIntro.players.length})`
          : null,
        teamIntro: p.data.teamIntro ? `${p.data.teamIntro.team.shortName} (${p.data.teamIntro.players.length} players)` : null,
        draftSlots: p.data.draft?.slots.length ?? 0,
        statistics: p.data.statistics ? `${p.data.statistics.blue.kills}-${p.data.statistics.red.kills} kills` : null,
        mvp: p.data.mvp?.nickname ?? null,
        fullscreen: p.data.fullscreen,
      },
      null,
      2
    )
  );
  socket.disconnect();
  process.exit(0);
});

socket.on('system:error', (err) => {
  console.error('server error:', err.message);
  clearTimeout(timer);
  process.exit(1);
});
