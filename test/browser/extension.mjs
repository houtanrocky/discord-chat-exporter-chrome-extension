import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { browserExecutable } from '../../scripts/browser-path.mjs';
import { fixtureData, installApiFixture } from '../fixtures.mjs';

export async function launchExtension(profile) {
  const extension = resolve('.output/chrome-mv3');
  await mkdir(resolve('.artifacts/downloads'), { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', executablePath: browserExecutable('chromium', chromium.executablePath()),
    headless: true, viewport: { width: 1280, height: 800 }, acceptDownloads: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  await worker.evaluate(installApiFixture, fixtureData);
  await worker.evaluate(async () => {
    await chrome.storage.session.set({ discordToken: 'synthetic-store-demo-token' });
    const nativeDownload = chrome.downloads.download.bind(chrome.downloads);
    chrome.downloads.download = options => nativeDownload({ ...options, saveAs: false });
  });
  await context.route('https://discord.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Synthetic Discord context</title><body>Local test fixture. No Discord account is connected.</body></html>' }));
  const discord = await context.newPage();
  await discord.goto(`https://discord.com/channels/${fixtureData.guild.id}/${fixtureData.channels[0].id}`);
  const session = await context.newCDPSession(discord);
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: resolve('.artifacts/downloads'), eventsEnabled: true });
  async function popup() {
    await discord.bringToFront();
    const page = await context.newPage();
    // Creating a tab changes activeTab; keep the Discord context active while the popup loads.
    await discord.bringToFront();
    await page.goto(`chrome-extension://${id}/popup.html`);
    return page;
  }
  async function exportPage(extra = {}) {
    const params = new URLSearchParams({ guildId: fixtureData.guild.id, channelId: fixtureData.channels[0].id, guildName: fixtureData.guild.name, channelName: fixtureData.channels[0].name, format: 'json', allTime: 'true', ...extra });
    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/export.html?${params}`);
    return page;
  }
  return { context, worker, id, discord, popup, exportPage };
}
