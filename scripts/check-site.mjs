import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = 'https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/';
for (const path of ['index.html', 'support.html', 'privacy.html', 'style.css', 'assets/logo.svg', 'assets/export-complete.png', 'assets/social-card.png', 'sitemap.xml']) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  const remote = Buffer.from(await response.arrayBuffer());
  const local = await readFile(`docs/${path}`);
  assert.equal(createHash('sha256').update(remote).digest('hex'), createHash('sha256').update(local).digest('hex'), `Deployed file differs: ${path}`);
  console.log(`200 verified: ${base}${path}`);
}
