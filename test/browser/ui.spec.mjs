import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupHarness } from './harness.mjs';

const browserErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }) => expect(browserErrors.get(page)).toEqual([]));

const params = 'guildId=100000000000000001&channelId=200000000000000001&guildName=Design+Collective&channelName=project-notes&format=json&allTime=true';
function target(info) { return info.project.name.startsWith('firefox') ? 'firefox-mv2' : 'chrome-mv3'; }
async function openPopup(page, info, options = {}) {
  const build = target(info);
  await setupHarness(page, { target: build, ...options });
  await page.goto(`/.output/${build}/popup.html`);
  await expect(page.locator('#connectionStatus')).not.toHaveText('Connecting…');
}
async function openExport(page, info, options = {}) {
  const build = target(info);
  await setupHarness(page, { target: build, ...options });
  await page.goto(`/.output/${build}/export.html?${params}`);
  await expect(page.locator('#stateBadge')).toHaveText(options.startError ? 'Needs attention' : 'In progress');
}

test('popup selects current server/channel and supports formats, dates, and bulk choice', async ({ page }, info) => {
  await openPopup(page, info);
  await expect(page.locator('#guildSelect')).toHaveValue('100000000000000001');
  await expect(page.locator('#channelSelect')).toHaveValue('200000000000000001');
  await expect(page.locator('#afterDate')).toBeDisabled();
  await page.locator('input[value="csv"]').check();
  await page.locator('#allTime').uncheck();
  await page.locator('#afterDate').fill('2026-10-01');
  await page.locator('#beforeDate').fill('2026-10-18');
  await page.locator('#allChannels').check();
  await expect(page.locator('#channelSelect')).toBeDisabled();
  await expect(page.locator('#previewChannelName')).toHaveText('All text channels');
  // Prevent the real UI's window.close so the harness can inspect the created URL.
  await page.evaluate(() => { window.close = () => {}; });
  await page.locator('#exportBtn').click();
  const url = await page.evaluate(() => window.__harness.createdTab.url);
  expect(url).toContain('format=csv'); expect(url).toContain('allChannels=true');
  expect(url).toContain('after=2026-10-01'); expect(url).not.toContain('token');
});
test('a missing token can connect immediately and can always be cleared', async ({ page }, info) => {
  await openPopup(page, info, { noToken: true });
  await expect(page.locator('#exportBtn')).toBeDisabled();
  await page.locator('#connectBtn').click();
  await expect(page.locator('#status')).toContainText('Enter an API token');
  await page.locator('#tokenInput').fill('synthetic-test-token');
  await page.locator('#connectBtn').click();
  await expect(page.locator('#connectionStatus')).toHaveText('Connected');
  await expect(page.locator('#channelSelect')).toHaveValue('200000000000000001');
  await page.locator('#clearTokenBtn').click();
  await expect(page.locator('#exportBtn')).toBeDisabled();
  expect(await page.evaluate(() => window.__harness.store.discordToken)).toBeUndefined();
});
test('token help explains the supported setup boundary without exposing credentials', async ({ page }, info) => {
  await page.setViewportSize({ width: 440, height: 600 });
  await openPopup(page, info, { noToken: true });
  const guide = page.locator('#tokenGuide');
  await expect(guide.locator('summary')).toHaveText('Where do I get a token?');
  await guide.locator('summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  await expect(guide).toContainText('Discord does not provide a supported way');
  await expect(guide).toContainText('cannot use this version yet');
  await expect(guide.locator('a')).toHaveAttribute('href', /support\.html#about-the-api-token/);
});
test('non-Discord tabs disable exports while allowing token clearing', async ({ page }, info) => {
  await openPopup(page, info, { tabUrl: 'https://example.test/discord.com/channels/123/456' });
  await expect(page.locator('#notDiscordWarning')).toBeVisible();
  await expect(page.locator('#exportBtn')).toBeDisabled();
  await page.locator('#clearTokenBtn').click();
  await expect(page.locator('#status')).toContainText('Token cleared');
});
test('DM source is detected and can switch back to server mode', async ({ page }, info) => {
  await openPopup(page, info, { tabUrl: 'https://discord.com/channels/@me/300000000000000001' });
  await expect(page.locator('#modeSelect')).toHaveValue('dm');
  await expect(page.locator('#guildField')).toBeHidden();
  await expect(page.locator('#channelSelect')).toHaveValue('300000000000000001');
  await page.locator('#modeSelect').selectOption('guild');
  await expect(page.locator('#guildField')).toBeVisible();
});
test('invalid date ranges do not open an export tab', async ({ page }, info) => {
  await openPopup(page, info);
  await page.locator('#allTime').uncheck();
  await page.locator('#afterDate').fill('2026-10-20');
  await page.locator('#beforeDate').fill('2026-10-18');
  await page.locator('#exportBtn').click();
  await expect(page.locator('#status')).toContainText('start date');
  expect(await page.evaluate(() => window.__harness.createdTab)).toBeUndefined();
});
test('storage fallback is disclosed and API errors are visible', async ({ page }, info) => {
  await openPopup(page, info, { localFallback: true, apiError: 'Discord API 401: Your token was rejected.' });
  await expect(page.locator('#storageHint')).toContainText('saved locally until you clear it');
  await expect(page.locator('#status')).toContainText('401');
  await expect(page.locator('#exportBtn')).toBeDisabled();
  await expect(page.locator('#connectionStatus')).toHaveText('Not connected');
});
test('running export disables a duplicate start in the popup', async ({ page }, info) => {
  await openPopup(page, info, { running: true });
  await expect(page.locator('#exportBtn')).toBeDisabled();
  await expect(page.locator('#progressArea')).toBeVisible();
});
test('progress ignores unrelated tabs and handles completion, errors, cancellation and retry', async ({ page }, info) => {
  await openExport(page, info);
  await page.evaluate(() => window.__harness.listeners.forEach(listener => listener({ action: 'exportProgress', tabId: 99, complete: true })));
  await expect(page.locator('#stateBadge')).toHaveText('In progress');
  await page.evaluate(() => window.__harness.emit({ percent: 140, status: 'Reading', messageCount: 128 }));
  await expect(page.locator('#progressBar')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('#messageCount')).toHaveText('128');
  await page.locator('#cancelBtn').click();
  await expect(page.locator('#stateBadge')).toHaveText('Cancelled');
  await page.locator('#retryBtn').click();
  await expect(page.locator('#stateBadge')).toHaveText('In progress');
  await page.evaluate(() => window.__harness.emit({ error: 'Permission denied' }));
  await expect(page.locator('#stateBadge')).toHaveText('Needs attention');
  await page.locator('#retryBtn').click();
  await page.evaluate(() => window.__harness.emit({ percent: 100, complete: true, status: 'Export complete', detail: '128 messages saved.' }));
  await expect(page.locator('#stateBadge')).toHaveText('Complete');
  await expect(page.locator('#cancelBtn')).toBeHidden();
  await expect(page.locator('#closeBtn')).toBeVisible();
});
test('export start failure shows retry and renders hostile names as text', async ({ page }, info) => {
  await openExport(page, info, { startError: 'Another export is already running.' });
  await expect(page.locator('#statusText')).toContainText('already running');
  await expect(page.locator('#retryBtn')).toBeVisible();
  const url = new URL(page.url()); url.searchParams.set('guildName', '<img src=x onerror=alert(1)>');
  await page.goto(url.href);
  await expect(page.locator('#guildName')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#guildName img')).toHaveCount(0);
});
test('popup and export workspace pass accessibility checks and fit their viewports', async ({ page }, info) => {
  await openPopup(page, info);
  const popup = await new AxeBuilder({ page }).analyze();
  expect(popup.violations).toEqual([]);
  expect(await page.evaluate(() => document.querySelector('#app').getBoundingClientRect().height)).toBeLessThanOrEqual(600);
  await page.goto(`/.output/${target(info)}/export.html?${params}`);
  await expect(page.locator('#stateBadge')).toHaveText('In progress');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
for (const path of ['index.html', 'support.html', 'privacy.html']) {
  test(`public ${path} has working internal links, accessibility, and mobile layout`, async ({ page, request }) => {
    await page.goto(`/docs/${path}`);
    await expect(page.locator('h1')).toBeVisible();
    const links = await page.locator('a[href]').evaluateAll(elements => elements.map(el => el.getAttribute('href')).filter(href => href.startsWith('./')));
    for (const link of new Set(links)) expect((await request.get(new URL(link, page.url()).href)).ok()).toBeTruthy();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
}
