document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const modeSelect = document.getElementById('modeSelect');
  const guildSelect = document.getElementById('guildSelect');
  const channelSelect = document.getElementById('channelSelect');
  const formatSelect = document.getElementById('formatSelect');
  const afterDate = document.getElementById('afterDate');
  const beforeDate = document.getElementById('beforeDate');
  const exportBtn = document.getElementById('exportBtn');
  const statusDiv = document.getElementById('status');
  const allChannelsCheck = document.getElementById('allChannels');
  const allTimeCheck = document.getElementById('allTime');
  const tokenInput = document.getElementById('tokenInput');
  const notDiscordWarning = document.getElementById('notDiscordWarning');
  const previewGuild = document.getElementById('previewGuildName');
  const previewChannel = document.getElementById('previewChannelName');
  const progressArea = document.getElementById('progressArea');
  const progressFill = document.getElementById('progressFill');
  const progressStatus = document.getElementById('progressStatus');
  const progressDetail = document.getElementById('progressDetail');
  const cancelBtn = document.getElementById('cancelBtn');
  const guildField = document.getElementById('guildField');

  // State
  let currentMode = 'guild';
  let guildsData = [];
  let dmsData = [];

  // --- Helpers ---
  function getColorFromId(id, offset = 0) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = (Math.abs(hash) + offset) % 360;
    return `hsl(${hue}, 60%, 70%)`;
  }

  function setAvatar(guildName, channelName, guildId, channelId, iconUrl) {
    const container = document.getElementById('previewAvatar');
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.fontSize = '22px';
    container.style.fontWeight = '600';
    container.style.color = '#ffffff';

    const isChannelSelected = channelName && !['Select a channel','Loading channels…','All text channels','All DMs'].includes(channelName);
    const isAllChannels = channelName === 'All text channels' || channelName === 'All DMs';

    if (isAllChannels) {
      container.textContent = '📁';
      container.style.fontSize = '24px';
      container.style.background = '#8e8e93';
      return;
    }
    if (isChannelSelected && channelId) {
      const letter = channelName.charAt(0).toUpperCase();
      container.textContent = letter;
      container.style.background = getColorFromId(channelId, 120);
      return;
    }
    if (guildName && guildName !== 'Select a guild' && guildName !== 'Select DM') {
      if (iconUrl) {
        const img = document.createElement('img');
        img.src = iconUrl;
        img.alt = `${guildName} icon`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onerror = () => {
          img.remove();
          const letter = guildName.charAt(0).toUpperCase();
          container.textContent = letter;
          container.style.background = guildId ? getColorFromId(guildId) : '#d1d5db';
        };
        container.appendChild(img);
      } else {
        const letter = guildName.charAt(0).toUpperCase();
        container.textContent = letter;
        container.style.background = guildId ? getColorFromId(guildId) : '#d1d5db';
      }
      return;
    }
    container.textContent = '?';
    container.style.background = '#d1d5db';
  }

  function updatePreview(guildName, channelName, guildId, channelId, iconUrl) {
    previewGuild.textContent = guildName || 'Select a guild';
    previewChannel.textContent = channelName || 'Select a channel';
    setAvatar(guildName, channelName, guildId, channelId, iconUrl);
  }

  // --- Token ---
  chrome.storage.sync.get(['discordToken'], (r) => {
    if (r.discordToken) tokenInput.value = r.discordToken;
  });
  tokenInput.addEventListener('input', () => {
    const t = tokenInput.value.trim();
    if (t) chrome.storage.sync.set({ discordToken: t });
  });

  // --- All Time ---
  allTimeCheck.addEventListener('change', () => {
    const checked = allTimeCheck.checked;
    afterDate.disabled = checked;
    beforeDate.disabled = checked;
    if (checked) { afterDate.value = ''; beforeDate.value = ''; }
  });

  // --- Check export status ---
  async function checkExportStatus() {
    const resp = await chrome.runtime.sendMessage({ action: 'getExportStatus' });
    if (resp && resp.inProgress) {
      progressArea.style.display = 'block';
      progressFill.style.width = '0%';
      progressStatus.textContent = 'Export already in progress…';
      progressDetail.textContent = 'Check the export tab.';
      cancelBtn.style.display = 'inline-block';
      exportBtn.disabled = true;
    }
  }

  // --- Load Guilds ---
  async function loadGuilds() {
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'getGuilds' });
      if (!resp) throw new Error('No response from background script.');
      if (!resp.success) throw new Error(resp.error || 'Failed to load guilds.');
      guildsData = resp.data;
      guildSelect.innerHTML = '<option value="">Select guild</option>';
      guildsData.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        opt.dataset.icon = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=48` : '';
        opt.dataset.guildId = g.id;
        guildSelect.appendChild(opt);
      });
      // Auto-select stored guild (if not DM)
      const session = await chrome.storage.session.get(['currentGuildId', 'currentChannelId']);
      if (session.currentGuildId && session.currentGuildId !== '@me') {
        guildSelect.value = session.currentGuildId;
        guildSelect.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      statusDiv.textContent = 'Error loading guilds: ' + e.message;
      statusDiv.className = 'status-message error';
    }
  }

  // --- Load DMs ---
  async function loadDMs() {
    try {
      console.log('Loading DMs...');
      const resp = await chrome.runtime.sendMessage({ action: 'getDMs' });
      console.log('DM response:', resp);
      if (!resp) throw new Error('No response from background script for DMs.');
      if (!resp.success) throw new Error(resp.error || 'Failed to load DMs.');
      dmsData = resp.data;
      console.log('DMs loaded:', dmsData);
      
      // Populate channel dropdown with DMs
      channelSelect.innerHTML = '<option value="">Select DM</option>';
      dmsData.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        opt.dataset.channelId = d.id;
        opt.dataset.icon = d.icon ? `https://cdn.discordapp.com/channel-icons/${d.id}/${d.icon}.png?size=48` : '';
        channelSelect.appendChild(opt);
      });
      
      // Auto-select stored channel
      const session = await chrome.storage.session.get(['currentChannelId']);
      if (session.currentChannelId && channelSelect.querySelector(`option[value="${session.currentChannelId}"]`)) {
        channelSelect.value = session.currentChannelId;
        channelSelect.dispatchEvent(new Event('change'));
      } else {
        updatePreview('Direct Messages', 'Select a DM', '@me', '', '');
      }
    } catch (e) {
      console.error('Error loading DMs:', e);
      statusDiv.textContent = 'Error loading DMs: ' + e.message;
      statusDiv.className = 'status-message error';
    }
  }

  // --- Mode switching ---
  function switchToGuildMode() {
    currentMode = 'guild';
    modeSelect.value = 'guild';
    guildField.style.display = 'block';
    channelSelect.innerHTML = '<option value="">Select channel</option>';
    loadGuilds();
  }

  function switchToDMMode() {
    currentMode = 'dm';
    modeSelect.value = 'dm';
    guildField.style.display = 'none';
    channelSelect.innerHTML = '<option value="">Loading DMs...</option>';
    loadDMs();
  }

  modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'guild') {
      switchToGuildMode();
    } else {
      switchToDMMode();
    }
  });

  // --- Detect current tab and switch mode automatically ---
  async function detectAndSwitchMode() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showWarning(true);
      return;
    }
    
    console.log('Current tab URL:', tab.url);
    
    // Check for DM URL first
    const dmMatch = tab.url.match(/discord\.com\/channels\/@me\/(\d+)/);
    const guildMatch = tab.url.match(/discord\.com\/channels\/(\d+)\/(\d+)/);
    
    if (dmMatch) {
      console.log('Detected DM mode, channel ID:', dmMatch[1]);
      showWarning(false);
      switchToDMMode();
      // After DMs load, auto-select the current DM
      setTimeout(() => {
        const session = chrome.storage.session.get(['currentChannelId'], (result) => {
          if (result.currentChannelId && channelSelect.querySelector(`option[value="${result.currentChannelId}"]`)) {
            channelSelect.value = result.currentChannelId;
            channelSelect.dispatchEvent(new Event('change'));
          }
        });
      }, 500);
    } else if (guildMatch) {
      console.log('Detected guild mode, guild ID:', guildMatch[1], 'channel ID:', guildMatch[2]);
      showWarning(false);
      switchToGuildMode();
    } else {
      showWarning(true);
    }
  }

  // --- Guild change -> load channels ---
  guildSelect.addEventListener('change', async () => {
    const guildId = guildSelect.value;
    const opt = guildSelect.options[guildSelect.selectedIndex];
    const iconUrl = opt ? opt.dataset.icon : '';
    const guildName = opt ? opt.textContent : '';
    const guildIdAttr = opt ? opt.dataset.guildId : '';
    if (!guildId) {
      channelSelect.innerHTML = '<option value="">Select channel</option>';
      updatePreview('', '', '', '', '');
      return;
    }
    updatePreview(guildName, 'Loading channels…', guildIdAttr, '', iconUrl);

    try {
      const resp = await chrome.runtime.sendMessage({ action: 'getChannels', guildId });
      if (!resp) throw new Error('No response from background script.');
      if (!resp.success) throw new Error(resp.error || 'Failed to load channels.');
      const channels = resp.data;
      channelSelect.innerHTML = '<option value="">Select channel</option>';
      channels.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        opt.dataset.channelId = c.id;
        channelSelect.appendChild(opt);
      });
      channelSelect.disabled = allChannelsCheck.checked;
      // Auto-select stored channel
      const session = await chrome.storage.session.get(['currentChannelId']);
      if (session.currentChannelId && channelSelect.querySelector(`option[value="${session.currentChannelId}"]`)) {
        channelSelect.value = session.currentChannelId;
        channelSelect.dispatchEvent(new Event('change'));
      } else {
        updatePreview(guildName, 'Select a channel', guildIdAttr, '', iconUrl);
      }
    } catch (e) {
      statusDiv.textContent = 'Error loading channels: ' + e.message;
      statusDiv.className = 'status-message error';
    }
  });

  // --- Channel change (for both guild and DM) ---
  channelSelect.addEventListener('change', () => {
    const sel = channelSelect.options[channelSelect.selectedIndex];
    const channelName = sel ? sel.textContent : '';
    const channelId = sel ? sel.dataset.channelId : '';
    const iconUrl = sel ? sel.dataset.icon : '';

    if (currentMode === 'guild') {
      const gOpt = guildSelect.options[guildSelect.selectedIndex];
      const guildName = gOpt ? gOpt.textContent : '';
      const guildIdAttr = gOpt ? gOpt.dataset.guildId : '';
      const guildIcon = gOpt ? gOpt.dataset.icon : '';
      updatePreview(guildName, channelName || 'Select a channel', guildIdAttr, channelId, guildIcon);
    } else {
      // DM mode
      updatePreview('Direct Messages', channelName || 'Select a DM', '@me', channelId, iconUrl);
    }
  });

  // --- All Channels ---
  allChannelsCheck.addEventListener('change', () => {
    channelSelect.disabled = allChannelsCheck.checked;
    if (allChannelsCheck.checked) {
      channelSelect.value = '';
      if (currentMode === 'guild') {
        const gOpt = guildSelect.options[guildSelect.selectedIndex];
        const guildName = gOpt ? gOpt.textContent : '';
        const iconUrl = gOpt ? gOpt.dataset.icon : '';
        const guildIdAttr = gOpt ? gOpt.dataset.guildId : '';
        updatePreview(guildName, 'All text channels', guildIdAttr, '', iconUrl);
      } else {
        updatePreview('Direct Messages', 'All DMs', '@me', '', '');
      }
    } else {
      channelSelect.dispatchEvent(new Event('change'));
    }
  });

  // --- Storage changes for auto-update ---
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'session' && changes.currentGuildId && changes.currentChannelId) {
      const newGuild = changes.currentGuildId.newValue;
      const newChannel = changes.currentChannelId.newValue;
      if (newGuild === '@me') {
        switchToDMMode();
        setTimeout(() => {
          const cOpt = Array.from(channelSelect.options).find(o => o.value === newChannel);
          if (cOpt) {
            channelSelect.value = newChannel;
            channelSelect.dispatchEvent(new Event('change'));
          }
        }, 300);
      } else {
        switchToGuildMode();
        setTimeout(() => {
          const gOpt = Array.from(guildSelect.options).find(o => o.value === newGuild);
          if (gOpt) {
            guildSelect.value = newGuild;
            guildSelect.dispatchEvent(new Event('change'));
            setTimeout(() => {
              const cOpt = Array.from(channelSelect.options).find(o => o.value === newChannel);
              if (cOpt) {
                channelSelect.value = newChannel;
                channelSelect.dispatchEvent(new Event('change'));
              }
            }, 300);
          }
        }, 300);
      }
    }
  });

  // --- Not Discord warning ---
  function showWarning(show) {
    if (show) {
      notDiscordWarning.style.display = 'flex';
      document.querySelectorAll('#exportForm input, #exportForm select, #exportForm button')
        .forEach(el => { if (el.id !== 'tokenInput') el.disabled = true; });
      exportBtn.disabled = true;
      guildSelect.innerHTML = '<option value="">Select guild</option>';
      channelSelect.innerHTML = '<option value="">Select channel</option>';
      updatePreview('Not on Discord', 'Please open a Discord page', '', '', '');
    } else {
      notDiscordWarning.style.display = 'none';
      document.querySelectorAll('#exportForm input, #exportForm select, #exportForm button')
        .forEach(el => { if (el.id !== 'tokenInput') el.disabled = false; });
      exportBtn.disabled = false;
    }
  }

  // --- Export - opens new tab ---
  exportBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const guildId = currentMode === 'guild' ? guildSelect.value : '@me';
    const channelId = channelSelect.value;
    const format = formatSelect.value;
    const after = afterDate.value;
    const before = beforeDate.value;
    const allChannels = allChannelsCheck.checked;
    const allTime = allTimeCheck.checked;

    if (currentMode === 'guild' && !guildId) {
      statusDiv.textContent = 'Please select a guild.';
      statusDiv.className = 'status-message error';
      return;
    }
    if (!allChannels && !channelId) {
      statusDiv.textContent = 'Select a channel or enable "Export all".';
      statusDiv.className = 'status-message error';
      return;
    }

    // Get names for the export tab
    let guildName, channelName, iconUrl;
    if (currentMode === 'guild') {
      const gOpt = guildSelect.options[guildSelect.selectedIndex];
      guildName = gOpt ? gOpt.textContent : '';
      iconUrl = gOpt ? gOpt.dataset.icon : '';
      const cOpt = channelSelect.options[channelSelect.selectedIndex];
      channelName = cOpt ? cOpt.textContent : '';
    } else {
      guildName = 'Direct Messages';
      const cOpt = channelSelect.options[channelSelect.selectedIndex];
      channelName = cOpt ? cOpt.textContent : '';
      iconUrl = cOpt ? cOpt.dataset.icon : '';
    }

    const params = new URLSearchParams({
      guildId,
      channelId: channelId || '',
      format,
      after: after || '',
      before: before || '',
      allChannels: allChannels ? 'true' : 'false',
      allTime: allTime ? 'true' : 'false',
      guildName,
      channelName: allChannels ? (currentMode === 'guild' ? 'All text channels' : 'All DMs') : channelName,
      iconUrl: iconUrl || ''
    });

    const url = chrome.runtime.getURL('export.html') + '?' + params.toString();
    chrome.tabs.create({ url });
    window.close();
  });

  // --- Init ---
  await detectAndSwitchMode();
  await checkExportStatus();
});