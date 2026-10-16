// content.js
(function() {
  const url = window.location.href;
  let guildId = null;
  let channelId = null;

  const match = url.match(/discord\.com\/channels\/(\d+)\/(\d+)/);
  if (match) {
    guildId = match[1];
    channelId = match[2];
  } else {
    const dmMatch = url.match(/discord\.com\/channels\/@me\/(\d+)/);
    if (dmMatch) {
      guildId = '@me';
      channelId = dmMatch[1];
    }
  }

  if (guildId && channelId) {
    chrome.runtime.sendMessage({
      action: 'setCurrentChannel',
      guildId: guildId,
      channelId: channelId
    });
  }
})();