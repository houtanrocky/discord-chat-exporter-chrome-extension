import { fixtureData } from '../fixtures.mjs';

// The Firefox UI harness loads the actual compiled page with a simulated extension
// API. Native worker, messaging, and downloads are exercised by the Chromium suite.
export async function setupHarness(page, overrides = {}) {
  await page.addInitScript(data => {
    const listeners = [];
    const store = { discordToken: 'synthetic-test-token' };
    const state = { ...data, store, listeners, requests: [] };
    window.__harness = state;
    const storage = {
      get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, store[key]])),
      set: async values => Object.assign(store, values),
      remove: async key => { delete store[key]; },
    };
    if (data.noToken) delete store.discordToken;
    window.browser = {
      storage: { session: data.localFallback ? undefined : storage, local: storage, onChanged: { addListener() {} } },
      tabs: {
        query: async () => [{ id: 1, url: state.tabUrl }], getCurrent: async () => ({ id: 42 }),
        create: async options => { state.createdTab = options; },
      },
      runtime: {
        id: 'test-extension', getURL: path => `${location.origin}/.output/${data.target}/${path}`,
        onMessage: { addListener: listener => listeners.push(listener) },
        sendMessage: async request => {
          state.requests.push(request);
          if (request.action === 'getExportStatus') return { inProgress: !!state.running };
          if (request.action === 'getGuilds') return state.apiError ? { success: false, error: state.apiError } : { success: true, data: [data.guild] };
          if (request.action === 'getChannels') return { success: true, data: data.channels.filter(c => [0, 5].includes(c.type)) };
          if (request.action === 'getDMs') return { success: true, data: data.dms.map(c => ({ ...c, name: c.name || c.recipients[0].global_name })) };
          if (request.action === 'startExportInTab') return state.startError ? { success: false, error: state.startError } : { success: true };
          if (request.action === 'cancelExport') { state.emit({ cancelled: true, status: 'Export cancelled', detail: 'Files already saved are kept.' }); return { success: true }; }
          throw new Error(`Unexpected action ${request.action}`);
        },
      },
    };
    state.emit = message => listeners.forEach(listener => listener({ action: 'exportProgress', tabId: 42, ...message }));
  }, { ...fixtureData, target: 'chrome-mv3', tabUrl: `https://discord.com/channels/${fixtureData.guild.id}/${fixtureData.channels[0].id}`, ...overrides });
}
