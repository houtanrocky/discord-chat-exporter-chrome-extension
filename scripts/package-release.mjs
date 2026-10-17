import { copyFile, writeFile, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = 'release/1.4.0';
for (const [source, target] of [['chrome', 'chrome'], ['firefox', 'firefox']]) {
  await copyFile(`.output/discord-chat-exporter-1.4.0-${source}.zip`, `${root}/packages/discord-chat-exporter-1.4.0-${target}.zip`);
}
await copyFile('.output/discord-chat-exporter-1.4.0-sources.zip', `${root}/packages/discord-chat-exporter-1.4.0-sources.zip`);
const lines = [];
async function hashes(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await hashes(path);
    else if (entry.name !== 'SHA256SUMS.txt') lines.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${path.slice(root.length + 1)}`);
  }
}
await hashes(root);
await writeFile(`${root}/SHA256SUMS.txt`, `${lines.join('\n')}\n`);
console.log('Browser ZIP packages copied to the release directory and checksums generated.');
