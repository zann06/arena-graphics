import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';

/** Mirrors the server-side ObsStatus type in services/obs.ts. */
export interface ObsStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  connected: boolean;
  host: string;
  port: number;
  obsVersion?: string;
  currentScene?: string;
  streaming?: boolean;
  recording?: boolean;
  lastError?: string;
  everConnected: boolean;
}

export interface ObsScene {
  name: string;
  isCurrent: boolean;
}

export interface ObsSource {
  name: string;
  visible: boolean;
  inputKind?: string;
}

const OBS_STATUS_KEY = ['obs', 'status'] as const;
const OBS_SCENES_KEY = ['obs', 'scenes'] as const;

export function useObsStatus() {
  return useQuery<ObsStatus>({
    queryKey: OBS_STATUS_KEY,
    queryFn: async () => (await apiClient.get('/obs/status')).data.status,
    // Poll lightly so the panel reflects OBS-side changes (scene switch,
    // streaming state) without a manual refresh.
    refetchInterval: 5000,
  });
}

export function useObsScenes(enabled: boolean) {
  return useQuery<ObsScene[]>({
    queryKey: OBS_SCENES_KEY,
    queryFn: async () => (await apiClient.get('/obs/scenes')).data.scenes,
    enabled,
    retry: false,
  });
}

export function useObsSources(sceneName: string | undefined) {
  return useQuery<ObsSource[]>({
    queryKey: ['obs', 'sources', sceneName ?? ''],
    queryFn: async () =>
      (await apiClient.get('/obs/sources', { params: { sceneName } })).data.sources,
    enabled: Boolean(sceneName),
    retry: false,
  });
}

function invalidateObs(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['obs'] });
}

export function useObsConnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opts?: { host?: string; port?: number }) =>
      (await apiClient.post('/obs/connect', opts ?? {})).data.status as ObsStatus,
    onSuccess: (status) => {
      invalidateObs(queryClient);
      if (status.connected) toast.success('Connected to OBS');
      else toast.error(`OBS connection failed: ${status.lastError ?? status.state}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useObsDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post('/obs/disconnect')).data.status as ObsStatus,
    onSuccess: () => {
      invalidateObs(queryClient);
      toast.success('Disconnected from OBS');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useObsSwitchScene() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sceneName: string) =>
      (await apiClient.post('/obs/scene', { sceneName })).data.status as ObsStatus,
    onSuccess: (status) => {
      invalidateObs(queryClient);
      toast.success(`Switched to scene ${status.currentScene}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useObsSetSourceVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sceneName: string; sourceName: string; visible: boolean }) =>
      (await apiClient.post('/obs/source-visibility', input)).data.status as ObsStatus,
    onSuccess: (_status, input) => {
      queryClient.invalidateQueries({ queryKey: ['obs', 'sources', input.sceneName] });
      queryClient.invalidateQueries({ queryKey: OBS_SCENES_KEY });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
