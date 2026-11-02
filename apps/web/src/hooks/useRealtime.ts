import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  GRAPHIC_KEYS,
  type ClientToServerEvents,
  type GraphicKey,
  type MatchState,
  type ServerToClientEvents,
  type StatisticsData,
} from '@arena/shared/types/realtime.js';

type ArenaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function resolveSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '');
  return window.location.origin;
}

const initialState: MatchState = {
  matchId: '',
  revision: 0,
  timestamp: new Date(0).toISOString(),
  payload: {
    status: 'idle',
    selectedTournamentId: null,
    selectedMatchId: null,
    currentGame: null,
    seriesScore: { blue: 0, red: 0 },
    overlay: GRAPHIC_KEYS.reduce((acc, key) => {
      acc[key] = { visible: false };
      return acc;
    }, {} as MatchState['payload']['overlay']),
    data: {
      scoreboard: null,
      playerIntro: null,
      teamIntro: null,
      draft: null,
      statistics: null,
      mvp: null,
      fullscreen: { mode: 'starting-soon', title: 'STARTING SOON', subtitle: 'Match begins shortly' },
    },
  },
};

export function useRealtime() {
  const socketRef = useRef<ArenaSocket | null>(null);
  const pingSentAtRef = useRef<number | null>(null);
  const [state, setState] = useState<MatchState>(initialState);
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket: ArenaSocket = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      socket.emit('state:request');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setLatency(null);
    });

    socket.on('state:initial', (next) => setState(next));
    socket.on('state:update', (next) => setState(next));
    socket.on('system:pong', () => {
      if (pingSentAtRef.current != null) {
        setLatency(Math.max(1, Math.round(performance.now() - pingSentAtRef.current)));
        pingSentAtRef.current = null;
      }
    });
    socket.on('system:error', ({ message }) => setError(message));

    const ping = window.setInterval(() => {
      if (socket.connected) {
        pingSentAtRef.current = performance.now();
        socket.emit('system:ping');
      }
    }, 5000);

    return () => {
      window.clearInterval(ping);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const selectMatch = useCallback((matchId: number) => {
    socketRef.current?.emit('match:select', { matchId });
  }, []);

  const setGraphic = useCallback((key: GraphicKey, visible: boolean) => {
    socketRef.current?.emit('graphic:set', { key, visible });
  }, []);

  const resetGraphics = useCallback(() => {
    socketRef.current?.emit('graphic:reset');
  }, []);

  const stepPlayerIntro = useCallback((index: number) => {
    socketRef.current?.emit('player-intro:step', { index });
  }, []);

  const loadTeamIntro = useCallback((side: 'blue' | 'red') => {
    socketRef.current?.emit('team-intro:load', { side });
  }, []);

  const setDraftSlot = useCallback(
    (payload: { side: 'blue' | 'red'; actionType: 'ban' | 'pick'; slotNumber: number; heroId: number | null }) => {
      socketRef.current?.emit('draft:set', payload);
    },
    []
  );

  const setDraftFormat = useCallback((format: 'standard' | 'quick') => {
    socketRef.current?.emit('draft:format', { format });
  }, []);

  const resetDraft = useCallback(() => {
    socketRef.current?.emit('draft:reset');
  }, []);

  const setStatistics = useCallback(
    (payload: { blue: StatisticsData['blue']; red: StatisticsData['red']; durationSeconds: number | null }) => {
      socketRef.current?.emit('statistics:set', payload);
    },
    []
  );

  const resetStatistics = useCallback(() => {
    socketRef.current?.emit('statistics:reset');
  }, []);

  const setMvp = useCallback(
    (payload: { playerId: number; heroId: number | null; kills: number; deaths: number; assists: number }) => {
      socketRef.current?.emit('mvp:set', payload);
    },
    []
  );

  const setFullscreen = useCallback((payload: { mode: 'starting-soon' | 'break' | 'result'; title: string; subtitle: string }) => {
    socketRef.current?.emit('fullscreen:set', payload);
  }, []);

  return {
    state,
    connected,
    latency,
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
  };
}
