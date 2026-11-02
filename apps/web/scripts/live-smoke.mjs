import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('connected');
  socket.emit('match:select', { matchId: Number(process.env.MATCH_ID || 1) });
});

socket.on('system:error', (e) => console.error('error', e));

setTimeout(() => {
  socket.emit('graphic:set', { key: 'scoreboard', visible: true });
  socket.emit('graphic:set', { key: 'statistics', visible: true });
  socket.emit('fullscreen:set', { mode: 'starting-soon', title: 'STARTING SOON', subtitle: 'MPL Season 1 · Match 1' });
}, 600);

setTimeout(() => {
  console.log('done');
  socket.disconnect();
  process.exit(0);
}, 1800);
