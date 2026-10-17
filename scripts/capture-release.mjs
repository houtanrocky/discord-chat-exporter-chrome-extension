import { mkdir, mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { expect } from '@playwright/test';
import { launchExtension } from '../test/browser/extension.mjs';

const root = 'release/1.4.0';
for (const path of ['.artifacts', `${root}/source`, `${root}/screenshots`, `${root}/promo`, 'docs/assets']) await mkdir(path, { recursive: true });
const profile = await mkdtemp(resolve('.artifacts/capture-'));
const extension = await launchExtension(profile);
const captures = [];
const encode = async path => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
async function save(page, path, locator) {
  const buffer = locator ? await page.locator(locator).screenshot({ animations: 'disabled' }) : await page.screenshot({ animations: 'disabled' });
  await sharp(buffer).flatten({ background: '#f3f6f5' }).removeAlpha().png().toFile(path);
  captures.push({ path, source: page.url().replace(new RegExp(extension.id, 'g'), '<unpacked-extension-id>'), sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
}
async function presentation({ path, title, subtitle, tag, image, points }) {
  const page = await extension.context.newPage();
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;width:1280px;height:800px;background:#eff3ec;font-family:'Segoe UI',system-ui,sans-serif;color:#19343e;overflow:hidden}.layout{height:100%;display:grid;grid-template-columns:1fr 490px;align-items:center;gap:66px;padding:48px 76px}.brand{display:flex;align-items:center;gap:12px;font-size:16px;font-weight:650;margin-bottom:56px}.brand img{width:42px;height:42px}.tag{font:11px ui-monospace,monospace;letter-spacing:2px;color:#416c58}h1{font-size:57px;line-height:1.08;font-weight:550;letter-spacing:-2.7px;margin:23px 0}p{font-size:18px;line-height:1.7;color:#526b73;max-width:490px}.points{margin-top:30px;display:flex;gap:9px;flex-wrap:wrap}.points span{padding:9px 12px;background:#dfeadd;color:#315d4c;border:1px solid #ceddcc;border-radius:5px;font-size:12px}.capture{display:flex;align-items:center;justify-content:center;height:704px;background:#dfe9dc;border:1px solid #ccdacb;border-radius:15px;padding:15px;position:relative}.capture img{width:440px;max-height:670px;object-fit:contain;filter:drop-shadow(0 12px 24px #12352d18)}.caption{position:absolute;bottom:10px;font-size:9px;color:#4f6d5c}.footer{position:absolute;bottom:25px;font:10px ui-monospace,monospace;letter-spacing:1px;color:#526b65}
    </style><div class="layout"><div><div class="brand"><img src="${await encode('release/1.4.0/icons/icon-128.png')}" alt="">Discord Chat Exporter</div><div class="tag">${tag}</div><h1>${title}</h1><p>${subtitle}</p><div class="points">${points.map(p => `<span>${p}</span>`).join('')}</div><div class="footer">YOUR CONVERSATIONS. YOUR FILES.</div></div><div class="capture"><img src="${await encode(image)}" alt="Actual extension popup"><div class="caption">Actual application · illustrative data</div></div></div></html>`);
  await save(page, path);
  await page.close();
}
try {
  const popup = await extension.popup();
  await expect(popup.locator('#channelSelect')).toHaveValue('200000000000000001');
  await save(popup, `${root}/source/popup-server.png`, '#app');
  await popup.locator('input[value="csv"]').check();
  await popup.locator('#allTime').uncheck();
  await popup.locator('#afterDate').fill('2026-09-01');
  await popup.locator('#beforeDate').fill('2026-10-18');
  await save(popup, `${root}/source/popup-formats-dates.png`, '#app');
  await popup.close();

  await extension.worker.evaluate(() => { globalThis.__fixture.mode = 'paused'; });
  const workspace = await extension.exportPage();
  await expect(workspace.locator('#messageCount')).toHaveText('100');
  await save(workspace, `${root}/screenshots/03-live-progress.png`);
  await workspace.locator('#cancelBtn').click();
  await expect(workspace.locator('#stateBadge')).toHaveText('Cancelled');
  await extension.worker.evaluate(() => { globalThis.__fixture.mode = 'success'; });
  await workspace.locator('#retryBtn').click();
  await expect(workspace.locator('#stateBadge')).toHaveText('Complete');
  await save(workspace, `${root}/screenshots/04-export-complete.png`);
  await copyFile(`${root}/screenshots/04-export-complete.png`, 'docs/assets/export-complete.png');

  await extension.discord.goto('https://discord.com/channels/@me/300000000000000001');
  const dm = await extension.popup();
  await expect(dm.locator('#channelSelect')).toHaveValue('300000000000000001');
  await dm.locator('input[value="plaintext"]').check();
  await save(dm, `${root}/source/popup-direct-messages.png`, '#app');

  await presentation({ path: `${root}/screenshots/01-choose-conversation.png`, title: 'Keep the<br>conversation.', subtitle: 'Save your Discord history.<br>Choose a channel. Make it yours.', tag: 'FROM CHANNEL TO COPY', image: `${root}/source/popup-server.png`, points: ['JSON', 'CSV', 'TXT', 'On your device'] });
  await presentation({ path: `${root}/screenshots/02-formats-and-dates.png`, title: 'Your history.<br>Your format.', subtitle: 'Take it to a spreadsheet, your own tools,<br>or a plain text file. Choose the dates<br>that matter to you.', tag: 'THREE WAYS TO KEEP IT', image: `${root}/source/popup-formats-dates.png`, points: ['Date ranges in UTC', 'All-time history', 'Bulk channels'] });
  await presentation({ path: `${root}/screenshots/05-direct-messages.png`, title: 'Small chats.<br>Worth keeping.', subtitle: 'Save individual or group messages<br>you’re authorized to access.', tag: 'DIRECT MESSAGES, TOO', image: `${root}/source/popup-direct-messages.png`, points: ['Individual messages', 'Group conversations', 'Readable text'] });

  const promo = await extension.context.newPage();
  await promo.setViewportSize({ width: 1400, height: 560 });
  await promo.setContent(`<!doctype html><html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#16343f;color:#f0f6ee;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden}.wrap{padding:54px 60px;display:flex;gap:46px}.copy{width:570px;flex-shrink:0}.brand{display:flex;align-items:center;gap:14px;font-size:20px;font-weight:600}.brand img{width:54px;height:54px}h1{font-size:66px;line-height:1.05;letter-spacing:-3px;font-weight:550;margin:35px 0 20px}h1 em{font-family:Georgia,serif;color:#a3ebca;font-weight:400}p{font-size:18px;color:#c1d8d1;line-height:1.6}.pills{display:flex;gap:10px;margin-top:27px}.pills span{border:1px solid #55756d;border-radius:5px;padding:8px 14px;font-size:12px;color:#cdebdc}.preview{width:660px;height:452px;background:#e5eee2;padding:15px;border-radius:14px;border:1px solid #a3c7b2;position:relative}.preview img{width:630px;height:394px;object-fit:cover;border-radius:5px}.caption{color:#375d4b;font:10px system-ui;text-align:center;margin-top:12px}</style><div class="wrap"><div class="copy"><div class="brand"><img src="${await encode(`${root}/icons/icon-128.png`)}">Discord Chat Exporter</div><h1>Keep the<br><em>conversation.</em></h1><p>Your chat history, in a format you can use.<br>Processed on your device.</p><div class="pills"><span>JSON</span><span>CSV</span><span>TXT</span></div></div><div class="preview"><img src="${await encode(`${root}/screenshots/04-export-complete.png`)}"><div class="caption">Actual application · illustrative conversation data</div></div></div></html>`);
  await save(promo, `${root}/promo/marquee-1400x560.png`);
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.setContent(`<!doctype html><html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:28px 30px;background:#16343f;color:#f0f6ee;font-family:'Segoe UI',system-ui,sans-serif}.brand{display:flex;align-items:center;gap:11px;font-size:15px;font-weight:600}.brand img{width:40px;height:40px}h1{font-size:37px;line-height:1.08;letter-spacing:-1.3px;font-weight:550;margin:23px 0 15px}h1 em{font-family:Georgia,serif;color:#a3ebca;font-weight:400}.formats{font:12px ui-monospace,monospace;letter-spacing:1px;color:#c4ded1}</style><div class="brand"><img src="${await encode(`${root}/icons/icon-128.png`)}">Discord Chat Exporter</div><h1>Keep the<br><em>conversation.</em></h1><div class="formats">JSON · CSV · TXT &nbsp; ↙</div></html>`);
  await save(promo, `${root}/promo/small-tile-440x280.png`);
  await sharp(`${root}/promo/marquee-1400x560.png`).resize(1200, 630, { fit: 'contain', background: '#16343f' }).png().toFile('docs/assets/social-card.png');
  await copyFile('docs/assets/social-card.png', `${root}/promo/social-card-1200x630.png`);
  await writeFile(`${root}/source/provenance.json`, JSON.stringify({ version: '1.4.0', capturedAt: new Date().toISOString(), browserVersion: extension.context.browser()?.version(), interface: 'Actual .output/chrome-mv3 production pages loaded as a native Chromium extension', data: 'Deterministic synthetic API fixture from test/fixtures.mjs. No live account, credentials, or private messages.', screenshots: '01, 02 and 05 add captions around unmodified native popup captures; 03 and 04 are full-page native export-workspace captures.', reproduction: 'npm run build && npm run screenshots', captures }, null, 2));
  console.log(`Release screenshots and promotional assets saved in ${root}`);
} finally { await extension.context.close(); }
