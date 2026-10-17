import { browser } from 'wxt/browser';
import { parseDiscordUrl, validateExport } from '../../lib/export-options.js';

document.addEventListener('DOMContentLoaded', async () => {
  const storage = browser.storage.session || browser.storage.local;
  const namespace = browser.storage.session ? 'session' : 'local';
  const el = id => document.getElementById(id);
  const token = el('tokenInput');
  const mode = el('modeSelect');
  const guild = el('guildSelect');
  const channel = el('channelSelect');
  const allTime = el('allTime');
  const allChannels = el('allChannels');
  let connected = false;
  let onDiscord = false;
  let busy = false;
  let running = false;
  let generation = 0;
  let tokenWrite = Promise.resolve();
  let selection = null;

  function status(text = '', type = '') {
    el('status').textContent = text;
    el('status').className = `status-message ${type}`;
  }
  function options(select, items, placeholder) {
    select.replaceChildren(new Option(placeholder, ''), ...items.map(item => new Option(item.name, item.id)));
  }
  function refresh() {
    el('guildField').hidden = mode.value === 'dm';
    guild.disabled = !connected || busy || !onDiscord;
    channel.disabled = !connected || busy || allChannels.checked || !onDiscord;
    mode.disabled = busy || !onDiscord;
    el('afterDate').disabled = allTime.checked || !onDiscord;
    el('beforeDate').disabled = allTime.checked || !onDiscord;
    el('dateRow').hidden = allTime.checked;
    el('exportBtn').disabled = !connected || busy || running || !onDiscord;
    el('connectBtn').disabled = busy || !onDiscord;
    el('connectionStatus').textContent = busy ? 'Connecting…' : connected ? 'Connected' : 'Not connected';
    const guildName = mode.value === 'dm' ? 'Direct messages' : guild.selectedOptions[0]?.textContent;
    el('previewGuildName').textContent = connected ? guildName || 'Choose a server' : 'Connect to get started';
    el('previewChannelName').textContent = allChannels.checked ? (mode.value === 'dm' ? 'All direct messages' : 'All text channels') : channel.value ? `# ${channel.selectedOptions[0].textContent}` : 'Choose the history you want to keep';
    el('previewAvatar').textContent = mode.value === 'dm' ? '@' : '#';
  }
  async function request(action, extra = {}) {
    const result = await browser.runtime.sendMessage({ action, ...extra });
    if (!result?.success) throw new Error(result?.error || 'The extension did not respond. Reopen the popup and retry.');
    return result.data;
  }
  async function loadChannels(expected = generation) {
    options(channel, [], 'Choose a channel');
    if (!guild.value) return;
    const guildId = guild.value;
    const data = await request('getChannels', { guildId });
    if (expected !== generation || guild.value !== guildId || mode.value !== 'guild') return;
    options(channel, data, data.length ? 'Choose a channel' : 'No text channels found');
    if (selection?.guildId === guildId && data.some(c => c.id === selection.channelId)) channel.value = selection.channelId;
  }
  async function loadSource() {
    const expected = ++generation;
    busy = true;
    status();
    options(guild, [], 'Choose a server');
    options(channel, [], 'Choose a conversation');
    refresh();
    try {
      if (mode.value === 'dm') {
        const data = await request('getDMs');
        if (expected !== generation) return;
        options(channel, data, data.length ? 'Choose a direct message' : 'No direct messages found');
        if (selection?.guildId === '@me' && data.some(c => c.id === selection.channelId)) channel.value = selection.channelId;
      } else {
        const data = await request('getGuilds');
        if (expected !== generation) return;
        options(guild, data, data.length ? 'Choose a server' : 'No servers found');
        if (data.some(g => g.id === selection?.guildId)) {
          guild.value = selection.guildId;
          await loadChannels(expected);
        }
      }
    } catch (error) {
      if (expected === generation) { connected = false; status(error.message, 'error'); }
    } finally {
      if (expected === generation) { busy = false; refresh(); }
    }
  }
  function saveToken() {
    const value = token.value.trim();
    tokenWrite = tokenWrite.catch(() => {}).then(() => value ? storage.set({ discordToken: value }) : storage.remove('discordToken'));
    return tokenWrite;
  }
  token.addEventListener('input', () => {
    connected = false;
    generation++;
    busy = false;
    refresh();
    saveToken().catch(() => status('The token could not be saved. Please retry.', 'error'));
  });
  el('connectBtn').addEventListener('click', async () => {
    if (!token.value.trim()) { status('Enter an API token to connect.', 'error'); token.focus(); return; }
    try { await saveToken(); connected = true; await loadSource(); }
    catch (error) { connected = false; status(error.message, 'error'); refresh(); }
  });
  el('clearTokenBtn').addEventListener('click', async () => {
    token.value = '';
    connected = false;
    generation++;
    busy = false;
    try {
      await saveToken();
      options(guild, [], 'Choose a server');
      options(channel, [], 'Choose a conversation');
      status(`Token cleared from ${namespace === 'session' ? 'this browser session' : 'browser storage'}.`, 'success');
    } catch (error) { status(error.message, 'error'); }
    refresh();
  });
  mode.addEventListener('change', () => { if (connected) loadSource(); else refresh(); });
  guild.addEventListener('change', async () => {
    const expected = ++generation;
    busy = true; refresh();
    try { await loadChannels(expected); } catch (error) { status(error.message, 'error'); }
    finally { if (expected === generation) { busy = false; refresh(); } }
  });
  channel.addEventListener('change', refresh);
  allTime.addEventListener('change', refresh);
  allChannels.addEventListener('change', refresh);
  el('exportForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || running || !connected || !onDiscord) return;
    const values = {
      guildId: mode.value === 'dm' ? '@me' : guild.value,
      channelId: channel.value,
      format: document.querySelector('input[name="format"]:checked').value,
      after: el('afterDate').value, before: el('beforeDate').value,
      allChannels: allChannels.checked, allTime: allTime.checked,
    };
    try {
      validateExport(values);
      await tokenWrite;
      const params = new URLSearchParams({ ...values,
        guildName: mode.value === 'dm' ? 'Direct messages' : guild.selectedOptions[0].textContent,
        channelName: allChannels.checked ? (mode.value === 'dm' ? 'All direct messages' : 'All text channels') : channel.selectedOptions[0].textContent,
      });
      await browser.tabs.create({ url: `${browser.runtime.getURL('export.html')}?${params}` });
      window.close();
    } catch (error) { status(error.message, 'error'); }
  });
  el('cancelBtn').addEventListener('click', async () => {
    try { await request('cancelExport'); status('Cancellation requested.'); }
    catch (error) { status(error.message, 'error'); }
  });
  browser.runtime.onMessage.addListener(message => {
    if (message.action !== 'exportProgress') return;
    running = !(message.complete || message.cancelled || message.error);
    el('progressArea').hidden = !running;
    el('progressDetail').textContent = message.detail || message.status;
    if (!running) status(message.error || message.status, message.error ? 'error' : 'success');
    refresh();
  });
  try {
    if (namespace === 'local') el('storageHint').textContent = 'Session storage unavailable: saved locally until you clear it.';
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    selection = parseDiscordUrl(tab?.url);
    onDiscord = !!selection;
    el('notDiscordWarning').hidden = onDiscord;
    if (selection?.guildId === '@me') mode.value = 'dm';
    const saved = await storage.get('discordToken');
    token.value = saved.discordToken || '';
    const exportStatus = await browser.runtime.sendMessage({ action: 'getExportStatus' });
    running = !!exportStatus?.inProgress;
    el('progressArea').hidden = !running;
    connected = !!token.value;
    refresh();
    if (connected && onDiscord) await loadSource();
  } catch (error) { status(error.message, 'error'); }
  refresh();
});
