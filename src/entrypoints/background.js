import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { createDiscordApi } from '../lib/discord-api.js';
import { runExport } from '../lib/export-service.js';
import { parseDiscordUrl, validateExport } from '../lib/export-options.js';

export default defineBackground(() => {
  const storage = browser.storage.session || browser.storage.local;
  const api = createDiscordApi();
  let exportState = null;
  let lastProgress = null;

  async function updateCurrentChannel(url) {
    const selection = parseDiscordUrl(url);
    if (selection) await storage.set({ currentGuildId: selection.guildId, currentChannelId: selection.channelId });
  }
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) updateCurrentChannel(changeInfo.url).catch(() => {});
  });
  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    try { await updateCurrentChannel((await browser.tabs.get(tabId)).url); } catch { /* The tab may have closed. */ }
  });

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) return false;
    const respond = async (action) => {
      try { sendResponse({ success: true, data: await action() }); }
      catch (error) { sendResponse({ success: false, error: error.message }); }
    };
    if (request.action === 'setCurrentChannel') {
      respond(() => updateCurrentChannel(sender.tab?.url));
      return true;
    }
    if (request.action === 'getExportStatus') {
      sendResponse({ inProgress: !!exportState, progress: exportState ? lastProgress : null });
      return false;
    }
    if (request.action === 'cancelExport') {
      if (!exportState || (request.tabId != null && request.tabId !== exportState.tabId)) {
        sendResponse({ success: false, error: 'No matching export is running.' });
      } else {
        exportState.abortController.abort();
        sendResponse({ success: true });
      }
      return false;
    }
    if (['getGuilds', 'getChannels', 'getDMs'].includes(request.action)) {
      respond(async () => {
        const { discordToken } = await storage.get('discordToken');
        if (!discordToken) throw new Error('Connect with your API token first.');
        if (request.action === 'getChannels') {
          if (!/^\d+$/.test(request.guildId || '')) throw new Error('Choose a server.');
          return api.getChannels(request.guildId, discordToken);
        }
        return api[request.action](discordToken);
      });
      return true;
    }
    if (request.action !== 'startExportInTab') return false;
    if (exportState) {
      sendResponse({ success: false, error: 'Another export is already running.' });
      return false;
    }
    const tabId = sender.tab?.id;
    try {
      if (tabId == null) throw new Error('Open the export from the extension popup.');
      validateExport(request);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
      return false;
    }
    const abortController = new AbortController();
    exportState = { abortController, tabId };
    lastProgress = null;
    sendResponse({ success: true });
    function progress(update) {
      lastProgress = { action: 'exportProgress', tabId, ...update };
      browser.runtime.sendMessage(lastProgress).catch(() => {});
    }
    (async () => {
      // Extension API activity keeps the MV3 worker alive during long exports.
      const heartbeat = setInterval(() => browser.runtime.getPlatformInfo().catch(() => {}), 20000);
      let terminal;
      try {
        const { discordToken } = await storage.get('discordToken');
        const result = await runExport(request, {
          api, token: discordToken, signal: abortController.signal, onProgress: progress,
          download: ({ content, mime, filename }) => browser.downloads.download({
            url: `data:${mime};charset=utf-8,${encodeURIComponent(content)}`, filename, saveAs: true,
          }),
        });
        terminal = { percent: 100, status: 'Export complete', detail: `${result.messageCount.toLocaleString()} messages · ${result.channelCount} file(s) sent to your downloads.`, complete: true, messageCount: result.messageCount };
      } catch (error) {
        terminal = error.name === 'AbortError'
          ? { percent: 0, status: 'Export cancelled', detail: 'Files already saved are kept.', cancelled: true }
          : { percent: 0, status: 'Export could not finish', error: error.message };
      } finally {
        clearInterval(heartbeat);
        exportState = null;
      }
      progress(terminal);
    })();
    return false;
  });
});
