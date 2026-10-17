import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  zip: {
    includeSources: ['src/**/*', 'public/**/*', 'test/**/*', 'scripts/**/*', 'docs/**/*', 'package.json', 'package-lock.json', 'wxt.config.ts', 'playwright.config.mjs', 'README.md'],
  },
  manifest: ({ browser }) => ({
    name: 'Discord Chat Exporter: Save to JSON/CSV/TXT',
    version: '1.4.0',
    description:
      'Export Discord channels and DMs to JSON, CSV, or plain text. Date ranges, bulk channel export, live progress. Local-only.',
    permissions: ['storage', 'downloads', 'activeTab', 'tabs'],
    host_permissions: ['https://discord.com/*'],
    homepage_url: 'https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/',
    icons: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    browser_specific_settings: browser === 'firefox' ? {
      gecko: {
        id: 'discord-chat-exporter@example.com',
        data_collection_permissions: { required: ['none'] },
      },
    } : undefined,
  }),
});
