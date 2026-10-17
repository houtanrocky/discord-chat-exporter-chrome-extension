import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('release/1.4.0/icons', { recursive: true });
await mkdir('docs/assets', { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp('public/icons/logo.svg').resize(size, size).png().toFile(`public/icons/icon${size}.png`);
  await copyFile(`public/icons/icon${size}.png`, `release/1.4.0/icons/icon-${size}.png`);
}
await sharp('public/icons/logo.svg').resize(512, 512).png().toFile('release/1.4.0/icons/icon-512.png');
await copyFile('public/icons/logo.svg', 'release/1.4.0/icons/logo.svg');
await copyFile('public/icons/logo.svg', 'docs/assets/logo.svg');
console.log('Original vector mark and all icon sizes generated.');
