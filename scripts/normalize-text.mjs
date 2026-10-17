import { readdir, readFile, writeFile } from 'node:fs/promises';

async function normalize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await normalize(path);
    else if (/\.(js|mjs|ts|css|html|txt|md|xml|yml|json|svg)$/.test(path)) {
      const content = await readFile(path, 'utf8');
      if (content.startsWith('\uFEFF')) await writeFile(path, content.slice(1));
    }
  }
}
for (const path of ['src', 'docs', 'release', 'scripts', 'test']) await normalize(path);
