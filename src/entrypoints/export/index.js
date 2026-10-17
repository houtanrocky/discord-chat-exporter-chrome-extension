import { browser } from 'wxt/browser';

// export.js - runs in the export tab
document.addEventListener('DOMContentLoaded', async () => {
  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const guildId = params.get('guildId');
  const channelId = params.get('channelId');
  const format = params.get('format') || 'json';
  const after = params.get('after') || '';
  const before = params.get('before') || '';
  const allChannels = params.get('allChannels') === 'true';
  const allTime = params.get('allTime') === 'true';
  const guildName = params.get('guildName') || 'Guild';
  const channelName = params.get('channelName') || 'Channel';
  const iconUrl = params.get('iconUrl') || '';

  // Set preview
  document.getElementById('guildName').textContent = guildName;
  document.getElementById('channelName').textContent = allChannels ? 'All text channels' : channelName;
  const avatarEl = document.getElementById('avatar');
  if (iconUrl) {
    const img = document.createElement('img');
    img.src = iconUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.onerror = () => { avatarEl.textContent = guildName.charAt(0).toUpperCase() || '?'; };
    avatarEl.innerHTML = '';
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = guildName.charAt(0).toUpperCase() || '?';
    avatarEl.style.background = '#5865F2';
  }

  // Elements
  const progressFill = document.getElementById('progressFill');
  const statusText = document.getElementById('statusText');
  const detailText = document.getElementById('detailText');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeBtn = document.getElementById('closeBtn');
  const retryBtn = document.getElementById('retryBtn');

  // State
  let exportId = null;
  let completed = false;
  const currentTab = await browser.tabs.getCurrent();
  const currentTabId = currentTab?.id;

  // Start the export
  async function startExport() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'startExportInTab',
        tabId: currentTabId,
        guildId,
        channelId,
        format,
        after: after || null,
        before: before || null,
        allChannels,
        allTime
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to start export');
      }
      // Export started - we'll receive progress messages
    } catch (error) {
      statusText.textContent = 'Error: ' + error.message;
      statusText.className = 'status-text error';
      cancelBtn.classList.add('hidden');
      retryBtn.classList.remove('hidden');
    }
  }

  // Handle progress messages from background
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'exportProgress' && message.tabId === currentTabId) {
      const { percent, status, detail, complete, cancelled, error } = message;
      progressFill.style.width = Math.min(percent || 0, 100) + '%';
      statusText.textContent = status || 'Processing...';
      if (detail) detailText.textContent = detail;
      if (complete) {
        completed = true;
        statusText.className = 'status-text complete';
        statusText.textContent = 'Export complete!';
        detailText.textContent = 'File(s) downloaded.';
        cancelBtn.classList.add('hidden');
        closeBtn.classList.remove('hidden');
        // Optionally close after a delay, but let user decide.
      } else if (cancelled) {
        completed = true;
        statusText.className = 'status-text';
        statusText.textContent = 'Export cancelled.';
        detailText.textContent = '';
        cancelBtn.classList.add('hidden');
        closeBtn.classList.remove('hidden');
        retryBtn.classList.remove('hidden');
      } else if (error) {
        statusText.className = 'status-text error';
        statusText.textContent = 'Error: ' + error;
        detailText.textContent = '';
        cancelBtn.classList.add('hidden');
        closeBtn.classList.remove('hidden');
        retryBtn.classList.remove('hidden');
      }
      return true;
    }
  });

  // Cancel
  cancelBtn.addEventListener('click', async () => {
    cancelBtn.disabled = true;
    statusText.textContent = 'Cancelling...';
    const response = await browser.runtime.sendMessage({ action: 'cancelExport' });
    if (!response.success) {
      statusText.textContent = 'Failed to cancel: ' + (response.error || 'unknown');
      cancelBtn.disabled = false;
    }
  });

  // Retry
  retryBtn.addEventListener('click', () => {
    retryBtn.classList.add('hidden');
    closeBtn.classList.add('hidden');
    cancelBtn.classList.remove('hidden');
    cancelBtn.disabled = false;
    progressFill.style.width = '0%';
    statusText.textContent = 'Starting...';
    statusText.className = 'status-text';
    detailText.textContent = '';
    startExport();
  });

  // Close
  closeBtn.addEventListener('click', () => {
    window.close();
  });

  // Start
  await startExport();
});



