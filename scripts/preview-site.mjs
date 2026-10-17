import { chromium } from 'playwright';
import { browserExecutable } from './browser-path.mjs';

const browser = await chromium.launch({ executablePath: browserExecutable('chromium', chromium.executablePath()), headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4173/docs/');
  await page.screenshot({ path: '.artifacts/website-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '.artifacts/website-mobile.png', fullPage: true });
  console.log('Website previews saved in .artifacts/.');
} finally { await browser.close(); }
