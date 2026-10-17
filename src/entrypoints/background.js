import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { Message, buildJson, buildCsv, buildPlainText } from '../lib/utils.js';

export default defineBackground(() => {
  const stateStorage = browser.storage.session || browser.storage.local;
  const API_BASE = 'https://discord.com/api/v9';
  
  // Headers to mimic a real browser session
  const SUPER_PROPERTIES = 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiaGFzX2NsaWVudF9tb2RzIjpmYWxzZSwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0OS4wLjAuMCBTYWZhcmkvNTM3LjM2IEVkZy8xNDkuMC4wLjAiLCJicm93c2VyX3ZlcnNpb24iOiIxNDkuMC4wLjAiLCJvc192ZXJzaW9uIjoiMTAiLCJyZWZlcnJlciI6IiIsInJlZmVycmluZ19kb21haW4iOiIiLCJyZWZlcnJlcl9jdXJyZW50IjoiaHR0cHM6Ly9kaXNjb3JkLmNvbS9jaGFubmVscy8xNTA3NzA4NDUyNjE1NDg3NTA4LzE1MDc3Mzc5MzkwMzAwNTI5NDQiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiJkaXNjb3JkLmNvbSIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjU2NDQzNywiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbCwiY2xpZW50X2xhdW5jaF9pZCI6ImI1OGE0NWNmLWYzYzktNDRjNy04ZGQxLTQ3ODRiZTYyYjI3NyIsImxhdW5jaF9zaWduYXR1cmUiOiI3ODQ0MGMwMi1iMDA1LTQxZjMtODcwMi1hOTE1Yzg1OWIzMzUiLCJjbGllbnRfaGVhcnRiZWF0X3Nlc3Npb25faWQiOiIyMzFmOWZmOS02ODAzLTRjNzktODQ2Yy04NjU5NjZjMWUyOWQiLCJjbGllbnRfYXBwX3N0YXRlIjoidW5mb2N1c2VkIn0=';
  
  const COMMON_HEADERS = {
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
    'x-super-properties': SUPER_PROPERTIES,
    'x-discord-locale': 'en-US',
    'x-discord-timezone': 'UTC',
    'x-debug-options': 'bugReporterEnabled',
    'sec-ch-ua': '"Microsoft Edge";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin'
  };
  
  // Global export state
  let exportState = null;
  
  async function getToken() {
    const result = await stateStorage.get(['discordToken']);
    return result.discordToken;
  }
  
  async function discordFetch(endpoint, token, signal) {
    const authHeader = token.startsWith('Bot ') ? token : token;
    const headers = { ...COMMON_HEADERS, 'Authorization': authHeader };
    const res = await fetch(`${API_BASE}${endpoint}`, { headers, credentials: 'omit', signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord API error ${res.status}: ${text.substring(0, 200)}`);
    }
    return res.json();
  }
  
  async function getGuilds(token) {
    const data = await discordFetch('/users/@me/guilds', token);
    return data.map(g => ({ id: g.id, name: g.name, icon: g.icon }));
  }
  
  async function getChannels(guildId, token) {
    const data = await discordFetch(`/guilds/${guildId}/channels`, token);
    return data
      .filter(c => c.type === 0 || c.type === 4 || c.type === 5)
      .map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id }));
  }
  
  // Fetch DMs (individual and group)
  async function getDMs(token) {
    const data = await discordFetch('/users/@me/channels', token);
    return data
      .filter(c => c.type === 1 || c.type === 3)
      .map(c => {
        let name = '';
        if (c.type === 1) {
          const recipient = c.recipients?.[0];
          name = recipient ? `@${recipient.username}` : 'DM';
        } else {
          name = c.name || c.recipients?.map(r => r.username).join(', ') || 'Group DM';
        }
        return {
          id: c.id,
          name: name,
          type: c.type,
          recipients: c.recipients,
          icon: c.icon
        };
      });
  }
  
  async function getChannelDateBounds(channelId, token, signal) {
    try {
      const oldestData = await discordFetch(`/channels/${channelId}/messages?limit=1&after=0`, token, signal);
      const newestData = await discordFetch(`/channels/${channelId}/messages?limit=1`, token, signal);
      return {
        startDate: oldestData.length > 0 ? new Date(oldestData[0].timestamp) : null,
        endDate: newestData.length > 0 ? new Date(newestData[0].timestamp) : new Date()
      };
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.error('Error getting date bounds:', e);
      return { startDate: null, endDate: new Date() };
    }
  }
  
  async function fetchAllMessages(channelId, token, after, before, signal, onProgress) {
    let messages = [];
    let lastBefore = before || null;
    const limit = 100;
    const delay = 200;
    let total = 0;
    while (true) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      let url = `/channels/${channelId}/messages?limit=${limit}`;
      if (lastBefore) url += `&before=${lastBefore}`;
      const data = await discordFetch(url, token, signal);
      if (data.length === 0) break;
      if (after) {
        const filtered = data.filter(m => BigInt(m.id) >= BigInt(after));
        messages = messages.concat(filtered);
        total += filtered.length;
        if (filtered.length < data.length) break;
      } else {
        messages = messages.concat(data);
        total += data.length;
      }
      if (onProgress) onProgress({ percent: 0, status: `Fetched ${total} messages...`, detail: `Batch ${Math.ceil(total/limit)}` });
      const oldestId = data[data.length-1].id;
      if (after && BigInt(oldestId) < BigInt(after)) break;
      lastBefore = oldestId;
      if (data.length < limit) break;
      await new Promise(r => setTimeout(r, delay));
    }
    return messages;
  }
  
  async function exportChannel(channelId, guildId, format, token, after, before, signal, onProgress) {
    const raw = await fetchAllMessages(channelId, token, after, before, signal, onProgress);
    const channel = await discordFetch(`/channels/${channelId}`, token, signal);
    const guild = guildId && guildId !== '@me' ? await discordFetch(`/guilds/${guildId}`, token, signal) : null;
    const messages = raw.map(m => new Message(m));
    let content, mime, ext;
    switch (format) {
      case 'json': content = buildJson(messages, channel, guild); mime = 'application/json'; ext = 'json'; break;
      case 'csv': content = buildCsv(messages); mime = 'text/csv'; ext = 'csv'; break;
      case 'plaintext': content = buildPlainText(messages); mime = 'text/plain'; ext = 'txt'; break;
      default: throw new Error('Unsupported format');
    }
    return { content, mime, ext, channelName: channel.name };
  }
  
  function dateToSnowflake(date) {
    if (!date || isNaN(date.getTime())) return null;
    const diff = BigInt(date.getTime() - 1420070400000);
    if (diff < 0) return '0';
    return (diff << 22n).toString();
  }
  
  function updateCurrentChannel(guildId, channelId) {
    stateStorage.set({ currentGuildId: guildId, currentChannelId: channelId });
  }
  
  async function downloadExport(result) {
    await browser.downloads.download({
      url: `data:${result.mime};charset=utf-8,${encodeURIComponent(result.content)}`,
      filename: `${result.channelName}_export.${result.ext}`,
      saveAs: true,
    });
  }
  
  // Listen for tab navigation
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.url) {
      let match;
      if (tab.url.includes('discord.com/channels/@me/')) {
        match = tab.url.match(/discord\.com\/channels\/@me\/(\d+)/);
        if (match) updateCurrentChannel('@me', match[1]);
      } else if (tab.url.includes('discord.com/channels/')) {
        match = tab.url.match(/discord\.com\/channels\/(\d+)\/(\d+)/);
        if (match) updateCurrentChannel(match[1], match[2]);
      }
    }
  });
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url) {
      let match;
      if (tab.url.includes('discord.com/channels/@me/')) {
        match = tab.url.match(/discord\.com\/channels\/@me\/(\d+)/);
        if (match) updateCurrentChannel('@me', match[1]);
      } else if (tab.url.includes('discord.com/channels/')) {
        match = tab.url.match(/discord\.com\/channels\/(\d+)\/(\d+)/);
        if (match) updateCurrentChannel(match[1], match[2]);
      }
    }
  });
  
  // ---- Message Handling ----
  
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received:', request);
  
    // Set current channel (from content script)
    if (request.action === 'setCurrentChannel') {
      updateCurrentChannel(request.guildId, request.channelId);
      sendResponse({ success: true });
      return true;
    }
  
    // Get export status
    if (request.action === 'getExportStatus') {
      sendResponse({ inProgress: !!exportState });
      return true;
    }
  
    // Cancel export
    if (request.action === 'cancelExport') {
      if (exportState && exportState.abortController) {
        exportState.abortController.abort();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No export in progress' });
      }
      return true;
    }
  
    // Helper for simple API calls
    const handleWithToken = async (fn) => {
      try {
        const token = await getToken();
        if (!token) throw new Error('No token found.');
        const result = await fn(token);
        sendResponse({ success: true, data: result });
      } catch (e) {
        console.error('Error in handleWithToken:', e);
        sendResponse({ success: false, error: e.message });
      }
    };
  
    // Get guilds
    if (request.action === 'getGuilds') {
      handleWithToken(async (t) => await getGuilds(t));
      return true;
    }
  
    // Get channels
    if (request.action === 'getChannels') {
      handleWithToken(async (t) => await getChannels(request.guildId, t));
      return true;
    }
  
    // Get DMs
    if (request.action === 'getDMs') {
      handleWithToken(async (t) => await getDMs(t));
      return true;
    }
  
    // Start export
    if (request.action === 'startExportInTab') {
      if (exportState) {
        sendResponse({ success: false, error: 'Another export is already running.' });
        return true;
      }
  
      const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab context.' });
        return true;
      }
  
      sendResponse({ success: true });
  
      (async () => {
        const abortController = new AbortController();
        const signal = abortController.signal;
        exportState = { abortController, tabId };
  
        function sendProgress(percent, status, detail, complete = false, cancelled = false, error = null) {
          browser.runtime.sendMessage({
            action: 'exportProgress',
            tabId,
            percent,
            status,
            detail,
            complete,
            cancelled,
            error
          }).catch(() => {});
        }
  
        try {
          const token = await getToken();
          if (!token) throw new Error('No token found.');
          const { guildId, channelId, format, after, before, allChannels, allTime } = request;
  
          let afterSnowflake = after ? dateToSnowflake(new Date(after)) : null;
          let beforeSnowflake = before ? dateToSnowflake(new Date(before)) : null;
  
          if (allTime) {
            if (!allChannels) {
              const bounds = await getChannelDateBounds(channelId, token, signal);
              if (bounds.startDate) {
                afterSnowflake = dateToSnowflake(bounds.startDate);
                beforeSnowflake = dateToSnowflake(bounds.endDate);
                sendProgress(5, `Date range: ${bounds.startDate.toLocaleDateString()} to ${bounds.endDate.toLocaleDateString()}`);
              }
            }
          }
  
          if (allChannels) {
            let channels;
            if (guildId === '@me') {
              channels = await getDMs(token);
            } else {
              channels = await getChannels(guildId, token);
              channels = channels.filter(c => c.type === 0);
            }
            const total = channels.length;
            let exported = 0;
            sendProgress(5, `Exporting ${total} channels...`, '');
            for (let i = 0; i < total; i++) {
              if (signal.aborted) break;
              const ch = channels[i];
              let chAfter = afterSnowflake, chBefore = beforeSnowflake;
              if (allTime) {
                const bounds = await getChannelDateBounds(ch.id, token, signal);
                if (bounds.startDate) {
                  chAfter = dateToSnowflake(bounds.startDate);
                  chBefore = dateToSnowflake(bounds.endDate);
                }
              }
              const progress = (p) => {
                const overall = 5 + (i/total)*85 + (p.percent||0)/total;
                sendProgress(Math.min(overall,95), `Exporting ${ch.name}: ${p.status}`, p.detail);
              };
              const result = await exportChannel(ch.id, guildId, format, token, chAfter, chBefore, signal, progress);
              await downloadExport({ ...result, channelName: ch.name });
              exported++;
              sendProgress(5 + ((i+1)/total)*85, `Exported ${exported}/${total} channels`, '');
            }
            if (!signal.aborted) sendProgress(100, `Exported ${exported} channels!`, '', true);
          } else {
            // Single channel
            const progressFn = (p) => sendProgress(p.percent||10, p.status||'Fetching...', p.detail);
            const result = await exportChannel(channelId, guildId, format, token, afterSnowflake, beforeSnowflake, signal, progressFn);
            await downloadExport(result);
            if (!signal.aborted) sendProgress(100, 'Download complete!', '', true);
          }
  
          if (!signal.aborted) exportState = null;
  
        } catch (error) {
          if (error.name === 'AbortError') {
            sendProgress(0, 'Export cancelled', '', false, true);
          } else {
            sendProgress(0, 'Error: ' + error.message, '', false, false, error.message);
          }
          exportState = null;
        }
      })();
  
      return true;
    }
  
    return false;
  });
  });



