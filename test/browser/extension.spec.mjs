import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { launchExtension } from './extension.mjs';

let extension;
test.beforeEach(async ({}, info) => { extension = await launchExtension(info.outputPath('profile')); });
test.afterEach(async () => { await extension?.context.close(); });

test('real extension popup detects the active channel and exports JSON through its worker', async () => {
  const page = await extension.popup();
  await expect(page.locator('#previewGuildName')).toHaveText('Design Collective');
  await expect(page.locator('#channelSelect')).toHaveValue('200000000000000001');
  await expect(page.locator('#exportBtn')).toBeEnabled();
  const created = extension.context.waitForEvent('page');
  await page.locator('#exportBtn').click();
  const exportPage = await created;
  await expect(exportPage.locator('#stateBadge')).toHaveText('Complete');
  await expect(exportPage.locator('#messageCount')).toHaveText('128');
  await expect.poll(() => extension.worker.evaluate(async () => (await chrome.downloads.search({})).filter(d => d.state === 'complete').length)).toBe(1);
  const [download] = await extension.worker.evaluate(() => chrome.downloads.search({}));
  const data = JSON.parse(await readFile(download.filename, 'utf8'));
  expect(data.messages).toHaveLength(128);
  expect(data.messages[0].author.displayName).toBe('Alex Rivera');
  expect(data.messages[0].id).toBe('1550000000000000000');
});
for (const format of ['csv', 'plaintext']) {
  test(`real worker creates a ${format} download`, async () => {
    const page = await extension.exportPage({ format });
    await expect(page.locator('#stateBadge')).toHaveText('Complete');
    await expect.poll(() => extension.worker.evaluate(async () => (await chrome.downloads.search({})).filter(d => d.state === 'complete').length)).toBe(1);
    const [download] = await extension.worker.evaluate(() => chrome.downloads.search({}));
    const content = await readFile(download.filename, 'utf8');
    expect(content).toContain(format === 'csv' ? 'MessageID,AuthorID' : 'Alex Rivera:');
  });
}
test('real worker exports every readable text and announcement channel', async () => {
  const page = await extension.exportPage({ allChannels: 'true', channelId: '' });
  await expect(page.locator('#stateBadge')).toHaveText('Complete');
  await expect(page.locator('#detailText')).toContainText('2 file(s)');
  await expect.poll(() => extension.worker.evaluate(async () => (await chrome.downloads.search({})).length)).toBe(2);
});
test('real worker exports a DM without a guild lookup', async () => {
  const page = await extension.exportPage({ guildId: '@me', channelId: '300000000000000001', guildName: 'Direct messages', channelName: 'Alex Rivera' });
  await expect(page.locator('#stateBadge')).toHaveText('Complete');
  const requests = await extension.worker.evaluate(() => globalThis.__fixture.requests);
  expect(requests.some(path => /^\/api\/v9\/guilds\//.test(path))).toBe(false);
});
test('cancel, retry, and concurrent export rejection work in the real worker', async () => {
  await extension.worker.evaluate(() => { globalThis.__fixture.mode = 'slow'; });
  const first = await extension.exportPage();
  await expect(first.locator('#stateBadge')).toHaveText('In progress');
  const second = await extension.exportPage();
  await expect(second.locator('#statusText')).toContainText('Another export is already running');
  await first.locator('#cancelBtn').click();
  await expect(first.locator('#stateBadge')).toHaveText('Cancelled');
  await extension.worker.evaluate(() => { globalThis.__fixture.mode = 'success'; });
  await first.locator('#retryBtn').click();
  await expect(first.locator('#stateBadge')).toHaveText('Complete');
});
test('API errors are displayed and recover after reconnecting', async () => {
  await extension.worker.evaluate(() => { globalThis.__fixture.mode = 'forbidden'; });
  const page = await extension.exportPage();
  await expect(page.locator('#stateBadge')).toHaveText('Needs attention');
  await expect(page.locator('#statusText')).toContainText('403');
  await extension.worker.evaluate(() => { globalThis.__fixture.mode = 'success'; });
  await page.locator('#retryBtn').click();
  await expect(page.locator('#stateBadge')).toHaveText('Complete');
});
test('empty history yields a valid empty export and token clearing removes stored credentials', async () => {
  await extension.worker.evaluate(() => { globalThis.__fixture.mode = 'empty'; });
  const page = await extension.exportPage();
  await expect(page.locator('#stateBadge')).toHaveText('Complete');
  await expect(page.locator('#messageCount')).toHaveText('0');
  const popup = await extension.popup();
  await popup.locator('#clearTokenBtn').click();
  await expect(popup.locator('#status')).toContainText('Token cleared');
  expect(await extension.worker.evaluate(async () => (await chrome.storage.session.get('discordToken')).discordToken)).toBeUndefined();
});
