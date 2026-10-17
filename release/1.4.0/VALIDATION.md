# Release verification · 1.4.0

Verified October 18, 2026.

## Automated results

- `npm run test:all`: PASS. 49 unit tests and 34 browser tests, 83 total.
- Chrome MV3 and Firefox MV2 production builds: PASS.
- Native Chromium extension: actual popup, background worker, runtime messaging, generated JSON/CSV/TXT downloads and their contents, bulk text/announcement channels, DM export, cancellation, concurrent-export rejection, retry, empty history, API errors, and token clearing.
- Chromium and Firefox compiled UI: source/format/date selection, validation, token connection/clearing, local-storage disclosure, non-Discord context, error/retry/progress states, safe rendering of channel names, accessibility with axe, and mobile export layouts.
- Public homepage/support/privacy pages: accessibility with axe, internal links, mobile layout, and no browser console errors in both tested engines.
- Default connected popup fits within 600 CSS pixels in both engines. Custom dates and warning/progress states may require scrolling.
- `npm run test:coverage`: shared `src/lib/` files report 100% line, 89.09% branch, and 90% function coverage. This is unit coverage of the shared libraries, not coverage of the entrypoints or the whole application.
- `git diff --check`: PASS.
- Screenshot capture: actual native production Chromium extension with synthetic API fixtures; original captures and provenance retained. Full-screen captures are 1280 × 800. Promotional tiles and composed store images are RGB PNGs with no alpha.

Environment: Node 24.18.0, Playwright 1.64.1. The current Chromium download was region-blocked, so compatible cached Chromium 145 was used; Firefox 157 was downloaded and used. Browser versions for capture are recorded in `source/provenance.json`.

## Manual release checks still required

These need the publisher’s authorized Discord context and browser interaction. They were not claimed as completed by the synthetic automation.

- [ ] Load/reload the Chrome package in the publisher’s browser; check the popup on a real authorized test channel.
- [ ] Load/reload the Firefox add-on natively using about:debugging; verify extension messaging, storage, downloads, and console output.
- [ ] Use an authorized test token with a small synthetic Discord server and DM. Exercise success, invalid token, inaccessible channel, empty range, bulk export, cancellation, and retry.
- [ ] Open real generated JSON, CSV, and TXT files in the intended applications; confirm names, quotes, Unicode, code blocks, dates, and message order.
- [ ] Verify save dialogs and completion in each browser’s Downloads manager, including disk/download failures.
- [ ] Keep the browser active for a longer export and check cancellation while rate-limited. Browser sleep/restarts can interrupt work.
- [ ] Inspect Chrome and Firefox extension consoles for warnings in the real account flow.
- [x] Confirm homepage/support/privacy return HTTP 200 after GitHub Pages deployment; deployed files also match local SHA-256 hashes.
- [ ] Confirm the existing store item accepts the 1.4.0 ZIP. If that version is already published rather than only pending, the store may require a higher version; this kit intentionally preserves the requested version.
- [ ] Review privacy dashboard declarations and publisher contact/distribution settings, then submit the pending version yourself.

The extension requests no new permission names. HTTPS-only Discord hosts and removal of the all-sites web-accessible export resource narrow exposure. See `listing/dashboard-fields.md`.
