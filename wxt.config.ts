import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Discord Chat Exporter',
    version: '1.4.0',
    description: 'Export Discord chat text for analysis with progress tracking.',
    permissions: ['storage', 'downloads', 'activeTab', 'tabs'],
    host_permissions: ['*://discord.com/*'],
    icons: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    web_accessible_resources: [
      {
        resources: ['export.html'],
        matches: ['<all_urls>'],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: 'discord-chat-exporter@example.com',
        data_collection_permissions: { required: ['none'] },
      },
    },
  },
});
