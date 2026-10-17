import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Message, User, buildJson, buildCsv, buildPlainText, escapeCsv } from '../../src/lib/utils.js';
import { markdownToPlainText } from '../../src/lib/markdownParser.js';
import { FORMATS, dateToSnowflake, getDateBounds, parseDiscordUrl, safeFilename, validateExport } from '../../src/lib/export-options.js';
import { message, guild, channels } from '../fixtures.mjs';

test('User display names and avatar URLs have sensible defaults', () => {
  const user = new User({ id: '1', username: 'alex' });
  assert.equal(user.displayName, 'alex');
  assert.match(user.avatarUrl, /embed\/avatars/);
  assert.equal(new User({ id: '1', username: 'alex', global_name: 'Alex', avatar: 'abc' }).displayName, 'Alex');
});
test('Message preserves attachment, embed, mention, reaction, and reply metadata', () => {
  const value = new Message({ ...message(), edited_timestamp: '2026-10-18T10:00:00Z', attachments: [{ id: '2', filename: 'notes.txt', url: 'https://example.test/notes.txt', size: 20 }], embeds: [{ title: 'Notes' }], reactions: [{ emoji: { name: 'wave' }, count: 2 }], mentions: [{ id: '1', username: 'sam' }], message_reference: { message_id: '5' } });
  const json = JSON.parse(buildJson([value], channels[0], guild));
  assert.equal(json.messages[0].attachments[0].size, 20);
  assert.equal(json.messages[0].mentions[0].username, 'sam');
  assert.equal(json.messages[0].reference.message_id, '5');
  assert.equal(json.messages[0].reactions[0].count, 2);
  assert.equal(json.messages[0].editedTimestamp, '2026-10-18T10:00:00.000Z');
});
test('JSON keeps raw markdown, unicode, IDs, and code', () => {
  const raw = { ...message(), content: '**Hello** 👋\n```js\nconst answer = 42;\n```' };
  const result = JSON.parse(buildJson([new Message(raw)], channels[0], null));
  assert.equal(result.messages[0].content, raw.content);
  assert.equal(result.guild, null);
  assert.equal(result.messages[0].id, raw.id);
});
test('CSV escapes quotes once and retains embedded commas and newlines', () => {
  const csv = buildCsv([new Message({ ...message(), content: 'Hello, "team"\nNext line' })]);
  assert.match(csv, /"Hello, ""team""\nNext line"/);
  assert.doesNotMatch(csv, /"""Hello/);
});
for (const value of ['=1+2', '+SUM(A1)', '-1+2', '@SUM(A1)', '\t=1', '\r=1']) {
  test(`CSV neutralizes spreadsheet formula prefix ${JSON.stringify(value)}`, () => assert.ok(escapeCsv(value).startsWith('"\'')));
}
test('CSV handles null, numbers, and empty exports', () => {
  assert.equal(escapeCsv(null), '');
  assert.equal(escapeCsv(42), '"42"');
  assert.equal(buildCsv([]).split('\n').length, 1);
});
test('readable text retains attachments and code content', () => {
  const result = buildPlainText([new Message({ ...message(), content: '```js\nconst a = 1;\n```', attachments: [{ url: 'https://example.test/file' }] })]);
  assert.match(result, /const a = 1;/);
  assert.match(result, /Attachments: https:\/\/example.test\/file/);
});
for (const [input, expected] of [['**hello**', 'hello'], ['`code`', 'code'], ['||secret||', 'secret'], ['<@123> <#456> <@&789>', '@123 #456 @789'], ['<:wave:123> <a:dance:456>', ':wave: :dance:'], ['[docs](https://example.test)', 'docs (https://example.test)'], ['', '']]) {
  test(`readable markdown: ${input}`, () => assert.equal(markdownToPlainText(input), expected));
}
test('URL parsing only accepts the exact HTTPS Discord host', () => {
  assert.deepEqual(parseDiscordUrl('https://discord.com/channels/123/456'), { guildId: '123', channelId: '456' });
  assert.deepEqual(parseDiscordUrl('https://discord.com/channels/@me/456'), { guildId: '@me', channelId: '456' });
  for (const url of ['https://evil.test/discord.com/channels/123/456', 'https://discord.com.evil.test/channels/123/456', 'http://discord.com/channels/123/456', 'garbage', 'https://discord.com/channels/@me']) assert.equal(parseDiscordUrl(url), null);
});
test('snowflakes retain 64-bit precision and clamp pre-Discord dates', () => {
  assert.equal(dateToSnowflake(new Date('2015-01-01T00:00:00Z')), '0');
  assert.equal(dateToSnowflake(new Date('2010-01-01')), '0');
  assert.equal(dateToSnowflake(new Date('invalid')), null);
});
test('the through date includes the full UTC day', () => {
  const bounds = getDateBounds('2026-10-01', '2026-10-18');
  assert.equal(bounds.before, dateToSnowflake(new Date('2026-10-19T00:00:00Z')));
  assert.equal(bounds.after, dateToSnowflake(new Date('2026-10-01T00:00:00Z')));
  assert.throws(() => getDateBounds('2026-10-20', '2026-10-18'), /start date/);
  assert.deepEqual(getDateBounds('2026-10-20', '2026-10-18', true), { after: null, before: null });
});
test('validation rejects missing sources, channels, and unsupported formats', () => {
  const valid = { guildId: '123', channelId: '456', format: 'json' };
  assert.doesNotThrow(() => validateExport(valid));
  assert.doesNotThrow(() => validateExport({ ...valid, channelId: '', allChannels: true }));
  assert.throws(() => validateExport({ ...valid, format: 'html' }), /format/);
  assert.throws(() => validateExport({ ...valid, guildId: '../' }), /server/);
  assert.throws(() => validateExport({ ...valid, channelId: '' }), /conversation/);
  assert.equal(Object.keys(FORMATS).length, 3);
});
test('download names cannot introduce directories or reserved characters', () => {
  assert.equal(safeFilename('../secret:channel?'), '_secret_channel_');
  assert.equal(safeFilename('...'), 'conversation');
  assert.equal(safeFilename('a'.repeat(200)).length, 100);
});
