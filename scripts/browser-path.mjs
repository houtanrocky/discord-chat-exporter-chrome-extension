import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function browserExecutable(type, bundled) {
  const explicit = process.env[type === 'chromium' ? 'PLAYWRIGHT_CHROMIUM_EXECUTABLE' : 'PLAYWRIGHT_FIREFOX_EXECUTABLE'];
  if (explicit) return explicit;
  if (existsSync(bundled)) return bundled;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || (process.platform === 'win32' ? join(homedir(), 'AppData/Local/ms-playwright') : process.platform === 'darwin' ? join(homedir(), 'Library/Caches/ms-playwright') : join(homedir(), '.cache/ms-playwright'));
  if (existsSync(root)) {
    const names = readdirSync(root).filter(name => new RegExp(`^${type}-\\d+$`).test(name)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const name of names) {
      const relative = type === 'chromium' ? (process.platform === 'win32' ? 'chrome-win64/chrome.exe' : process.platform === 'darwin' ? 'chrome-mac/Chromium.app/Contents/MacOS/Chromium' : 'chrome-linux/chrome') : (process.platform === 'win32' ? 'firefox/firefox.exe' : process.platform === 'darwin' ? 'firefox/Nightly.app/Contents/MacOS/firefox' : 'firefox/firefox');
      const candidate = join(root, name, relative);
      if (existsSync(candidate)) {
        console.warn(`Using cached ${type}: ${candidate}`);
        return candidate;
      }
    }
  }
  return bundled;
}
