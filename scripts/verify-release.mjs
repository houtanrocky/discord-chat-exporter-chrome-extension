import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { zipEntries } from './zip-entries.mjs';

const root = 'release/1.4.0';
const text = async path => (await readFile(path, 'utf8')).replace(/^\uFEFF/, '').trim();
const manifest = JSON.parse(await text('.output/chrome-mv3/manifest.json'));
const firefox = JSON.parse(await text('.output/firefox-mv2/manifest.json'));
assert.equal(manifest.version, '1.4.0');
assert.equal(firefox.version, manifest.version);
assert.equal(manifest.browser_specific_settings, undefined);
assert.equal(firefox.browser_specific_settings.gecko.id, 'discord-chat-exporter@example.com');
assert.equal(await text(`${root}/listing/title.txt`), manifest.name);
assert.equal(await text(`${root}/listing/short-description.txt`), manifest.description);
assert.ok(manifest.name.length <= 75);
assert.ok(manifest.description.length <= 132);
assert.ok((await text(`${root}/listing/description.txt`)).length <= 16000);
assert.deepEqual(manifest.host_permissions, ['https://discord.com/*']);
assert.ok(!manifest.web_accessible_resources);
assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'downloads', 'storage', 'tabs']);

const screenshots = (await readdir(`${root}/screenshots`)).filter(name => name.endsWith('.png')).sort();
assert.equal(screenshots.length, 5);
const specifications = [
  ...screenshots.map(name => [`${root}/screenshots/${name}`, 1280, 800, false]),
  [`${root}/promo/small-tile-440x280.png`, 440, 280, false],
  [`${root}/promo/marquee-1400x560.png`, 1400, 560, false],
  [`${root}/promo/social-card-1200x630.png`, 1200, 630, false],
  ...[16, 32, 48, 128, 512].map(size => [`${root}/icons/icon-${size}.png`, size, size, true]),
];
for (const [path, width, height, alphaAllowed] of specifications) {
  const metadata = await sharp(path).metadata();
  assert.equal(metadata.width, width, path);
  assert.equal(metadata.height, height, path);
  if (!alphaAllowed) { assert.equal(metadata.hasAlpha, false, path); assert.equal(metadata.channels, 3, path); }
  assert.equal(metadata.format, 'png', path);
}
const provenance = JSON.parse(await text(`${root}/source/provenance.json`));
for (const capture of provenance.captures) {
  assert.equal(createHash('sha256').update(await readFile(capture.path)).digest('hex'), capture.sha256, capture.path);
}
for (const path of ['docs/index.html', 'docs/support.html', 'docs/privacy.html']) {
  const html = await text(path);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="description"/);
  assert.match(html, /rel="canonical"/);
  assert.doesNotMatch(html, /TODO|YOUR_EXTENSION_ID|example\.com/);
}
for (const name of ['chrome', 'firefox']) {
  const path = `${root}/packages/discord-chat-exporter-1.4.0-${name}.zip`;
  assert.ok((await stat(path)).size > 1000);
  const entries = zipEntries(await readFile(path));
  const packaged = JSON.parse(entries.get('manifest.json').toString('utf8'));
  assert.equal(packaged.version, manifest.version);
  const build = name === 'chrome' ? 'chrome-mv3' : 'firefox-mv2';
  assert.deepEqual(packaged, JSON.parse(await readFile(`.output/${build}/manifest.json`, 'utf8')));
  assert.equal(entries.get('background.js').toString('utf8'), await readFile(`.output/${build}/background.js`, 'utf8'));
  for (const [entry, content] of entries) {
    assert.doesNotMatch(entry, /test-results|playwright-report|profile|node_modules|\.env/);
    assert.deepEqual(content, await readFile(`.output/${build}/${entry}`), entry);
  }
}
const sources = zipEntries(await readFile(`${root}/packages/discord-chat-exporter-1.4.0-sources.zip`));
for (const name of sources.keys()) assert.doesNotMatch(name, /test-results|playwright-report|\.artifacts|Default\/|Cookies|\.env|^release\//);
assert.ok(sources.has('src/entrypoints/background.js'));
assert.ok(sources.has('package-lock.json'));
for (const line of (await text(`${root}/SHA256SUMS.txt`)).split('\n')) {
  const [expected, path] = line.split('  ');
  assert.equal(createHash('sha256').update(await readFile(`${root}/${path}`)).digest('hex'), expected, path);
}
console.log(`Release verified: ${screenshots.length} screenshots, promo dimensions, RGB/no alpha, icon sizes, metadata, provenance hashes, privacy permissions, and both packages.`);
