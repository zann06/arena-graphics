/**
 * Mock-based test for the OBS adapter (services/obs.ts).
 *
 * Runs the adapter against a fake obs-websocket client so every command path
 * (connect, status, scenes, scene switch, sources, source visibility, disconnect,
 * and the not-connected guard) is exercised WITHOUT a real OBS instance.
 *
 * This verifies the adapter logic only. Real obs-websocket behaviour must be
 * confirmed with an actual OBS Studio instance (see OBS-SETUP.md).
 *
 * Usage: node scripts/obs-adapter-test.mjs
 */
import { EventEmitter } from 'node:events';

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** A minimal stand-in for obs-websocket-js v5's OBSWebSocket. */
class FakeObs extends EventEmitter {
  constructor() {
    super();
    this.scenes = ['Starting Soon', 'Draft', 'In Game'];
    this.currentScene = 'Draft';
    this.items = {
      Draft: [
        { sceneItemId: 1, sourceName: 'Draft Browser', inputKind: 'browser_source', enabled: true },
        { sceneItemId: 2, sourceName: 'Scoreboard', inputKind: 'browser_source', enabled: false },
      ],
    };
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    this.emit('ConnectionOpened');
  }

  async disconnect() {
    this.connected = false;
    this.emit('ConnectionClosed');
  }

  async call(cmd, args = {}) {
    if (!this.connected) throw new Error('Not connected');
    switch (cmd) {
      case 'GetVersion':
        return { obsVersion: '31.0.0' };
      case 'GetCurrentProgramScene':
        return { currentProgramSceneName: this.currentScene };
      case 'GetStreamStatus':
        return { outputActive: false };
      case 'GetRecordStatus':
        return { outputActive: false };
      case 'GetSceneList':
        return {
          currentProgramSceneName: this.currentScene,
          // OBS returns newest-first; the adapter reverses it.
          scenes: this.scenes.map((sceneName) => ({ sceneName })).reverse(),
        };
      case 'SetCurrentProgramScene':
        this.currentScene = args.sceneName;
        this.emit('CurrentProgramSceneChanged', { sceneName: args.sceneName });
        return {};
      case 'GetSceneItemList':
        return { sceneItems: this.items[args.sceneName] ?? [] };
      case 'GetSceneItemEnabled': {
        const item = (this.items[args.sceneName] ?? []).find((i) => i.sceneItemId === args.sceneItemId);
        return { sceneItemEnabled: item?.enabled ?? true };
      }
      case 'GetSceneItemId': {
        const item = (this.items[args.sceneName] ?? []).find((i) => i.sourceName === args.sourceName);
        if (!item) throw new Error('Source not found');
        return { sceneItemId: item.sceneItemId };
      }
      case 'SetSceneItemEnabled': {
        const item = (this.items[args.sceneName] ?? []).find((i) => i.sceneItemId === args.sceneItemId);
        if (item) item.enabled = args.sceneItemEnabled;
        return {};
      }
      default:
        throw new Error(`Unhandled command ${cmd}`);
    }
  }
}

// Import AFTER we have the fake class available.
const obsModule = await import('../apps/server/src/services/obs.ts');

obsModule.setClientFactory(() => new FakeObs());
obsModule.configureObs({ host: '127.0.0.1', port: 4455, password: 'secret' });

// 1. Not-connected guard
let threw = false;
try {
  await obsModule.listScenes();
} catch (err) {
  threw = err?.statusCode === 409;
}
check('commands before connect raise ObsNotConnectedError (409)', threw);

check('initial status is disconnected', obsModule.getStatus().state === 'disconnected');

// 2. Connect
const connected = await obsModule.connect();
check('connect() reports connected', connected.connected === true, connected.state);
check('connect() reads OBS version', connected.obsVersion === '31.0.0', connected.obsVersion);
check('connect() reads current scene', connected.currentScene === 'Draft', connected.currentScene);
check('password is never exposed in status', !('password' in connected) && JSON.stringify(connected).indexOf('secret') === -1);

// 3. Scenes (reversed order, current flagged)
const scenes = await obsModule.listScenes();
check('listScenes returns all scenes', scenes.length === 3, scenes.map((s) => s.name).join(', '));
check('listScenes reverses OBS order', scenes[0].name === 'Starting Soon', scenes[0].name);
check('listScenes flags the current program scene', scenes.find((s) => s.isCurrent)?.name === 'Draft');

// 4. Switch scene
const switched = await obsModule.switchScene('In Game');
check('switchScene updates current scene', switched.currentScene === 'In Game', switched.currentScene);

// 5. Sources + visibility (switch back to Draft first)
await obsModule.switchScene('Draft');
const sources = await obsModule.listSources();
check('listSources returns scene sources', sources.length === 2, `${sources.length} source(s)`);
const scoreboard = sources.find((s) => s.name === 'Scoreboard');
check('listSources reports per-source visibility', scoreboard?.visible === false, `Scoreboard visible=${scoreboard?.visible}`);

const shown = await obsModule.setSourceVisibility('Draft', 'Scoreboard', true);
const afterShow = await obsModule.listSources();
check('setSourceVisibility makes a source visible', afterShow.find((s) => s.name === 'Scoreboard')?.visible === true, shown.state);
const hidden = await obsModule.setSourceVisibility('Draft', 'Scoreboard', false);
const afterHide = await obsModule.listSources();
check('setSourceVisibility hides a source', afterHide.find((s) => s.name === 'Scoreboard')?.visible === false, hidden.state);

// 6. Connect failure path (bad client)
await obsModule.disconnect();
obsModule.setClientFactory(() => {
  const failing = new FakeObs();
  failing.connect = async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:4455');
  };
  return failing;
});
const failed = await obsModule.connect();
check('failed connect() reports error state', failed.state === 'error', failed.lastError);
check('failed connect() captures lastError', /ECONNREFUSED/.test(failed.lastError ?? ''), failed.lastError);

// 7. Disconnect
const disconnected = await obsModule.disconnect();
check('disconnect() returns to disconnected', disconnected.state === 'disconnected');

console.log('');
console.log(failures === 0 ? 'ALL OBS ADAPTER CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
