import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { parseDiscordUrl } from '../lib/export-options.js';

export default defineContentScript({
  matches: ['https://discord.com/channels/*'],
  runAt: 'document_end',
  main() {
    const selection = parseDiscordUrl(window.location.href);
    if (selection) browser.runtime.sendMessage({ action: 'setCurrentChannel', ...selection }).catch(() => {});
  },
});
