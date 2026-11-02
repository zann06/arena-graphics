/**
 * OBS Studio integration via obs-websocket (v5 protocol).
 *
 * The password lives only here on the server (from env); it is never returned
 * to browser clients. The adapter keeps a single connection, tracks status, and
 * exposes a small, safe command surface to the rest of the app:
 *   - connect() / disconnect()
 *   - getStatus()
 *   - listScenes() / switchScene()
 *   - listSources(sceneName) / setSourceVisibility()
 *
 * Everything is guarded: a missing OBS instance, a wrong password, or a dropped
 * connection resolves to a status object instead of throwing, so the operator
 * UI can show "disconnected" gracefully and overlays keep rendering.
 */
import { OBSWebSocket } from 'obs-websocket-js';

export type ObsConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ObsStatus {
  state: ObsConnectionState;
  connected: boolean;
  host: string;
  port: number;
  /** OBS websocket protocol version when connected. */
  obsVersion?: string;
  currentScene?: string;
  streaming?: boolean;
  recording?: boolean;
  lastError?: string;
  /** True once a real OBS instance has answered during this process. */
  everConnected: boolean;
}

interface ObsConfig {
  host: string;
  port: number;
  password: string;
}

let config: ObsConfig = { host: '127.0.0.1', port: 4455, password: '' };
let obs: OBSWebSocket | null = null;
let state: ObsConnectionState = 'disconnected';
let lastError: string | undefined;
let everConnected = false;
let obsVersion: string | undefined;
let currentScene: string | undefined;
let streaming = false;
let recording = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionallyClosed = false;

/**
 * Factory for the OBS client. Defaults to a real `OBSWebSocket`; tests can swap
 * it via `setClientFactory` to exercise the adapter against a fake transport.
 */
let clientFactory: () => OBSWebSocket = () => new OBSWebSocket();

export function setClientFactory(factory: () => OBSWebSocket): void {
  clientFactory = factory;
  obs = null;
}

function getClient(): OBSWebSocket {
  if (!obs) {
    obs = clientFactory();
    obs.on('ConnectionClosed', () => {
      if (state === 'connected') {
        state = 'disconnected';
        streaming = false;
        recording = false;
        scheduleReconnect();
      }
    });
    obs.on('CurrentProgramSceneChanged', (data: { sceneName: string }) => {
      currentScene = data.sceneName;
    });
    obs.on('StreamStateChanged', (data: { outputActive: boolean }) => {
      streaming = data.outputActive;
    });
    obs.on('RecordStateChanged', (data: { outputActive: boolean }) => {
      recording = data.outputActive;
    });
  }
  return obs;
}

function scheduleReconnect(delayMs = 5000): void {
  if (intentionallyClosed || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch(() => {
      /* status already updated */
    });
  }, delayMs);
}

/** Configure connection settings (called once at boot from env). */
export function configureObs(next: Partial<ObsConfig>): void {
  config = { ...config, ...next };
}

export async function connect(overrides?: { host?: string; port?: number }): Promise<ObsStatus> {
  intentionallyClosed = false;
  if (overrides?.host) config.host = overrides.host;
  if (overrides?.port) config.port = overrides.port;
  if (state === 'connected') return getStatus();
  state = 'connecting';
  lastError = undefined;
  try {
    const client = getClient();
    await client.connect(`ws://${config.host}:${config.port}`, config.password || undefined);
    state = 'connected';
    everConnected = true;
    const version = await client.call('GetVersion').catch(() => null);
    obsVersion = version?.obsVersion;
    const scene = await client.call('GetCurrentProgramScene').catch(() => null);
    currentScene = scene?.currentProgramSceneName;
    const streamingStatus = await client.call('GetStreamStatus').catch(() => null);
    streaming = streamingStatus?.outputActive ?? false;
    const recordStatus = await client.call('GetRecordStatus').catch(() => null);
    recording = recordStatus?.outputActive ?? false;
    return getStatus();
  } catch (err) {
    state = 'error';
    lastError = err instanceof Error ? err.message : String(err);
    return getStatus();
  }
}

export async function disconnect(): Promise<ObsStatus> {
  intentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  try {
    if (obs) await obs.disconnect();
  } catch {
    /* ignore */
  }
  state = 'disconnected';
  currentScene = undefined;
  streaming = false;
  recording = false;
  return getStatus();
}

export function getStatus(): ObsStatus {
  return {
    state,
    connected: state === 'connected',
    host: config.host,
    port: config.port,
    obsVersion,
    currentScene,
    streaming,
    recording,
    lastError,
    everConnected,
  };
}

export interface ObsScene {
  name: string;
  isCurrent: boolean;
}

export async function listScenes(): Promise<ObsScene[]> {
  if (state !== 'connected') throw new ObsNotConnectedError();
  const res = await getClient().call('GetSceneList');
  const current = res.currentProgramSceneName;
  // GetSceneList returns newest-first; reverse for a stable display order.
  return [...res.scenes]
    .reverse()
    .map((s) => ({ name: String(s.sceneName), isCurrent: String(s.sceneName) === current }));
}

export async function switchScene(sceneName: string): Promise<ObsStatus> {
  if (state !== 'connected') throw new ObsNotConnectedError();
  await getClient().call('SetCurrentProgramScene', { sceneName });
  currentScene = sceneName;
  return getStatus();
}

export interface ObsSource {
  name: string;
  visible: boolean;
  inputKind?: string;
}

export async function listSources(sceneName?: string): Promise<ObsSource[]> {
  if (state !== 'connected') throw new ObsNotConnectedError();
  const client = getClient();
  const scene = sceneName ?? currentScene;
  if (!scene) throw new Error('No scene selected');

  const { sceneItems } = await client.call('GetSceneItemList', { sceneName: scene });
  const sources: ObsSource[] = [];
  for (const item of sceneItems) {
    const visibility = await client
      .call('GetSceneItemEnabled', {
        sceneName: scene,
        sceneItemId: Number(item.sceneItemId),
      })
      .catch(() => null);
    sources.push({
      name: String(item.sourceName),
      visible: visibility?.sceneItemEnabled ?? true,
      inputKind: item.inputKind ? String(item.inputKind) : undefined,
    });
  }
  return sources;
}

export async function setSourceVisibility(sceneName: string, sourceName: string, visible: boolean): Promise<ObsStatus> {
  if (state !== 'connected') throw new ObsNotConnectedError();
  const client = getClient();
  const { sceneItemId } = await client.call('GetSceneItemId', {
    sceneName,
    sourceName,
  });
  await client.call('SetSceneItemEnabled', {
    sceneName,
    sceneItemId: Number(sceneItemId),
    sceneItemEnabled: visible,
  });
  return getStatus();
}

export class ObsNotConnectedError extends Error {
  statusCode = 409;
  constructor() {
    super('OBS is not connected. Open OBS with the WebSocket server enabled and connect first.');
    this.name = 'ObsNotConnectedError';
  }
}
