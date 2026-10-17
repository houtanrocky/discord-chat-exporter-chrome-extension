import { browser } from 'wxt/browser';
import { FORMATS, validateExport } from '../../lib/export-options.js';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const options = {
    guildId: params.get('guildId'), channelId: params.get('channelId'),
    format: params.get('format') || 'json', after: params.get('after') || '', before: params.get('before') || '',
    allChannels: params.get('allChannels') === 'true', allTime: params.get('allTime') === 'true',
  };
  const el = id => document.getElementById(id);
  el('guildName').textContent = params.get('guildName') || (options.guildId === '@me' ? 'Direct messages' : 'Your server');
  el('channelName').textContent = params.get('channelName') || 'Your conversation';
  el('avatar').textContent = options.guildId === '@me' ? '@' : '#';
  el('formatLabel').textContent = FORMATS[options.format]?.label || 'Unknown';
  el('rangeLabel').textContent = options.allTime || (!options.after && !options.before) ? 'All time' : `${options.after || 'Beginning'} → ${options.before || 'Today'} (UTC)`;
  let currentTabId;
  let accepting = false;
  function render(message) {
    const terminal = message.complete || message.cancelled || message.error;
    const percent = Math.max(0, Math.min(Number(message.percent) || 0, 100));
    el('progressFill').style.width = `${percent}%`;
    el('progressBar').classList.toggle('indeterminate', !terminal && !percent);
    if (terminal || percent) el('progressBar').setAttribute('aria-valuenow', String(percent));
    else el('progressBar').removeAttribute('aria-valuenow');
    el('statusText').textContent = message.error || message.status || 'Reading your history…';
    el('detailText').textContent = message.detail || (message.error ? 'Check the connection in the popup, then try again.' : '');
    el('statusText').className = message.error ? 'error' : message.complete ? 'complete' : '';
    el('stateBadge').textContent = message.error ? 'Needs attention' : message.complete ? 'Complete' : message.cancelled ? 'Cancelled' : 'In progress';
    if (message.messageCount != null) el('messageCount').textContent = Number(message.messageCount).toLocaleString();
    el('cancelBtn').hidden = !!terminal;
    el('closeBtn').hidden = !terminal;
    el('retryBtn').hidden = !(message.error || message.cancelled);
    if (terminal) accepting = false;
  }
  async function startExport() {
    accepting = true;
    el('cancelBtn').disabled = false;
    el('messageCount').textContent = '0';
    render({ status: 'Preparing your export…', detail: 'Connecting to your selected conversation.' });
    try {
      validateExport(options);
      if (currentTabId == null) throw new Error('Open this page from the extension popup.');
      const response = await browser.runtime.sendMessage({ action: 'startExportInTab', ...options });
      if (!response?.success) throw new Error(response?.error || 'The extension did not respond. Please retry.');
    } catch (error) { render({ error: error.message }); }
  }
  browser.runtime.onMessage.addListener(message => {
    if (accepting && message.action === 'exportProgress' && message.tabId === currentTabId) render(message);
  });
  el('cancelBtn').addEventListener('click', async () => {
    el('cancelBtn').disabled = true;
    try {
      const response = await browser.runtime.sendMessage({ action: 'cancelExport', tabId: currentTabId });
      if (!response?.success) throw new Error(response?.error || 'Cancellation failed.');
      if (accepting) el('statusText').textContent = 'Cancelling…';
    } catch (error) { el('detailText').textContent = error.message; el('cancelBtn').disabled = false; }
  });
  el('retryBtn').addEventListener('click', startExport);
  el('closeBtn').addEventListener('click', () => window.close());
  try {
    currentTabId = (await browser.tabs.getCurrent())?.id;
    await startExport();
  } catch (error) { render({ error: error.message }); }
});
