import { defineConfig } from '@playwright/test';
import { chromium, firefox } from 'playwright';
import { browserExecutable } from './scripts/browser-path.mjs';

export default defineConfig({
  testDir: './test/browser', fullyParallel: false, workers: 1,
  timeout: 30000, expect: { timeout: 8000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4173/docs/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium-ui', testMatch: /ui\.spec\.mjs/, use: { browserName: 'chromium', launchOptions: { executablePath: browserExecutable('chromium', chromium.executablePath()) } } },
    { name: 'firefox-ui', testMatch: /ui\.spec\.mjs/, use: { browserName: 'firefox', launchOptions: { executablePath: browserExecutable('firefox', firefox.executablePath()) } } },
    { name: 'chromium-extension', testMatch: /extension\.spec\.mjs/ },
  ],
});
