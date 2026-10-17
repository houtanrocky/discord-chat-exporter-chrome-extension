import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runExport } from '../../src/lib/export-service.js';
import { message, guild, channels } from '../fixtures.mjs';

const options = { guildId: guild.id, channelId: channels[0].id, format: 'json', allTime: true };
function dependencies() {
  const downloads = [];
  const progress = [];
  const api = {
    request: async path => path.startsWith('/guilds') ? guild : channels[0],
    getChannels: async () => channels.slice(0, 2),
    getDMs: async () => [{ id: '123', name: 'Alex', type: 1 }],
    fetchMessages: async (id, token, bounds, signal, onProgress) => { onProgress(2); return [message(), message(1)]; },
  };
  return { api, token: 'synthetic-test-token', signal: new AbortController().signal, downloads, progress, download: async result => downloads.push(result), onProgress: update => progress.push(update) };
}
for (const [format, ext] of [['json', 'json'], ['csv', 'csv'], ['plaintext', 'txt']]) {
  test(`single channel produces a valid ${format} download`, async () => {
    const deps = dependencies();
    const result = await runExport({ ...options, format }, deps);
    assert.equal(result.messageCount, 2);
    assert.equal(result.channelCount, 1);
    assert.match(deps.downloads[0].filename, new RegExp(`\\.${ext}$`));
    assert.ok(deps.downloads[0].content.includes(format === 'json' ? 'messages' : format === 'csv' ? 'MessageID' : 'Alex Rivera'));
  });
}
test('bulk server export downloads both text and announcement channels', async () => {
  const deps = dependencies();
  const result = await runExport({ ...options, allChannels: true }, deps);
  assert.equal(result.channelCount, 2);
  assert.equal(deps.downloads.length, 2);
  assert.equal(result.messageCount, 4);
});
test('bulk direct message export never requests a server', async () => {
  const deps = dependencies();
  deps.api.request = async () => assert.fail('No server request expected');
  const result = await runExport({ ...options, guildId: '@me', allChannels: true }, deps);
  assert.equal(result.channelCount, 1);
  assert.equal(JSON.parse(deps.downloads[0].content).guild, null);
});
test('all-time fetches without a newest-message cutoff', async () => {
  const deps = dependencies();
  deps.api.fetchMessages = async (id, token, bounds) => { assert.deepEqual(bounds, { after: null, before: null }); return []; };
  assert.equal((await runExport(options, deps)).messageCount, 0);
});
test('no token or empty source yields an error before downloads', async () => {
  const deps = dependencies();
  await assert.rejects(runExport(options, { ...deps, token: '' }), /token/);
  deps.api.getChannels = async () => [];
  await assert.rejects(runExport({ ...options, allChannels: true }, deps), /No readable/);
  assert.equal(deps.downloads.length, 0);
});
test('cancelled bulk exports stop before another file is downloaded', async () => {
  const deps = dependencies();
  const controller = new AbortController(); deps.signal = controller.signal;
  deps.download = async result => { deps.downloads.push(result); controller.abort(); };
  await assert.rejects(runExport({ ...options, allChannels: true }, deps), { name: 'AbortError' });
  assert.equal(deps.downloads.length, 1);
});
test('download failures propagate instead of reporting completion', async () => {
  const deps = dependencies(); deps.download = async () => { throw new Error('Disk unavailable'); };
  await assert.rejects(runExport(options, deps), /Disk unavailable/);
});
test('a permission failure does not create a misleading partial export file', async () => {
  const deps = dependencies(); deps.api.fetchMessages = async () => { throw new Error('Forbidden'); };
  await assert.rejects(runExport(options, deps), /Forbidden/);
  assert.equal(deps.downloads.length, 0);
});
