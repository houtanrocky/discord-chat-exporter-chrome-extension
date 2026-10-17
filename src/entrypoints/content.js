import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['*://discord.com/channels/*', '*://discord.com/channels/@me/*'],
  runAt: 'document_end',
  main() {
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
      browser.runtime.sendMessage({
        action: 'setCurrentChannel',
        guildId,
        channelId,
      });
    }
  },
});
