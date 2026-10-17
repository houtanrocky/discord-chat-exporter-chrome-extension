import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDiscordApi, abortableDelay } from '../../src/lib/discord-api.js';
import { channels, dms, message } from '../fixtures.mjs';

const signal = () => new AbortController().signal;
const apiFor = fetchImpl => createDiscordApi({ fetchImpl, delay: async () => {} });
test('API omits cookies and uses only the explicitly supplied token', async () => {
  let captured;
  const api = apiFor(async (url, init) => { captured = { url, init }; return Response.json([]); });
  await api.getGuilds('synthetic-test-token', signal());
  assert.equal(captured.init.credentials, 'omit');
  assert.equal(captured.init.headers.Authorization, 'synthetic-test-token');
  assert.equal(Object.keys(captured.init.headers).length, 2);
  assert.ok(captured.url.startsWith('https://discord.com/api/v9/'));
});
test('text and announcement channels retain types; categories and voice are excluded', async () => {
  const result = await apiFor(async () => Response.json(channels)).getChannels('1', 'test', signal());
  assert.deepEqual(result.map(c => c.type), [0, 5]);
});
test('direct and group messages receive readable names', async () => {
  const result = await apiFor(async () => Response.json(dms)).getDMs('test', signal());
  assert.deepEqual(result.map(c => c.name), ['Alex Rivera', 'Weekend plans']);
});
for (const status of [401, 403, 404, 500]) {
  test(`API ${status} returns an actionable error without response content`, async () => {
    const api = apiFor(async () => new Response('private response data', { status }));
    await assert.rejects(api.getGuilds('test', signal()), error => error.message.includes(String(status)) && !error.message.includes('private response'));
  });
}
test('rate limits retry a bounded number of times', async () => {
  let attempts = 0;
  const delays = [];
  const api = createDiscordApi({ fetchImpl: async () => { attempts++; return attempts < 3 ? Response.json({ retry_after: 0.5 }, { status: 429 }) : Response.json([]); }, delay: async ms => delays.push(ms) });
  assert.deepEqual(await api.getGuilds('test', signal()), []);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [500, 500]);
});
test('persistent rate limits stop after four requests', async () => {
  let calls = 0;
  const api = apiFor(async () => { calls++; return Response.json({ retry_after: 1 }, { status: 429 }); });
  await assert.rejects(api.getGuilds('test', signal()), /429/);
  assert.equal(calls, 4);
});
test('message pagination deduplicates, sorts chronologically, and includes lower boundary', async () => {
  const requests = [];
  const data = Array.from({ length: 130 }, (_, i) => message(i));
  const api = apiFor(async input => {
    const url = new URL(input); requests.push(url);
    return Response.json(data.filter(m => !url.searchParams.has('before') || BigInt(m.id) < BigInt(url.searchParams.get('before'))).reverse().slice(0, 100));
  });
  const result = await api.fetchMessages('1', 'test', { after: data[10].id }, signal());
  assert.equal(result.length, 120);
  assert.equal(result[0].id, data[10].id);
  assert.equal(result.at(-1).id, data.at(-1).id);
  assert.equal(requests.length, 2);
});
test('message pagination applies an exclusive upper boundary', async () => {
  let requested;
  const api = apiFor(async url => { requested = url; return Response.json([]); });
  await api.fetchMessages('1', 'test', { before: '1550000000000000000' }, signal());
  assert.match(requested, /before=1550000000000000000/);
});
test('empty histories export no messages', async () => assert.deepEqual(await apiFor(async () => Response.json([])).fetchMessages('1', 'test', {}, signal()), []));
test('pagination fails safely if Discord repeats a full page', async () => {
  const data = Array.from({ length: 100 }, (_, i) => message(i)).reverse();
  await assert.rejects(apiFor(async () => Response.json(data)).fetchMessages('1', 'test', {}, signal()), /did not advance/);
});
test('cancellation interrupts both pending delays and subsequent requests', async () => {
  const controller = new AbortController();
  const pending = abortableDelay(10000, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(apiFor(async () => assert.fail('No fetch expected')).fetchMessages('1', 'test', {}, controller.signal), { name: 'AbortError' });
});
test('server list pagination fetches servers past the first 200', async () => {
  let calls = 0;
  const api = apiFor(async () => { calls++; return Response.json(calls === 1 ? Array.from({ length: 200 }, (_, i) => ({ id: String(i), name: `Server ${i}` })) : [{ id: '201', name: 'Last server' }]); });
  assert.equal((await api.getGuilds('test', signal())).length, 201);
});
