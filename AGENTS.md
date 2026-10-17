# Repository Guidelines

## Project Structure & Module Organization

This repository is a WXT extension targeting Chrome MV3 and Firefox. `src/entrypoints/background.js` contains the service worker, `content.js` tracks the active Discord channel, and `popup/` and `export/` contain the HTML UIs. Shared export models and formatters live in `src/lib/`. Static icons belong in `public/icons/`; WXT generates manifests and bundles in `.output/`.

## Build, Test, and Development Commands

Use the package scripts for development and packaging:

- `npm run dev` starts WXT development mode for Chromium.
- `npm run dev:firefox` starts the Firefox target.
- `npm run build` creates a Chrome MV3 package in `.output/chrome-mv3/`.
- `npm run build:firefox` creates a Firefox package in `.output/firefox-mv2/`.
- `npm run zip` and `npm run zip:firefox` create store-uploadable archives.

For manual checks, load `.output/` from `chrome://extensions` or Firefox `about:debugging`, then exercise the popup and export page on Discord. Inspect each DevTools console.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, and single-quoted JavaScript strings. Prefer `const`/`let`, small functions, and descriptive camelCase names; use UPPER_SNAKE_CASE only for true constants. Import WXT's `browser` API instead of using `chrome` directly. Keep DOM IDs and CSS class names descriptive and colocate entrypoint styles with their HTML. Run both WXT builds before submitting changes.

## Testing Guidelines

No automated framework or coverage threshold is configured. For every change, manually test loading/reloading the extension, opening the popup on a Discord channel, starting and cancelling an export when applicable, and opening the generated export. Verify both success and error states in Chrome and Firefox, and check each browser console for warnings.

## Commit & Pull Request Guidelines

The history currently contains only `Initialize`, so no established convention is available. Use short, imperative subjects such as `Fix export progress handling`; keep unrelated changes in separate commits. Pull requests should describe user-visible behavior, list manual test steps and affected browsers, link an issue when one exists, and include screenshots or a short recording for popup/export UI changes. Call out manifest permission or host-permission changes explicitly.

## Security & Configuration Tips

Treat Discord message content and downloaded exports as sensitive. The token remains an explicit user input and is kept in browser session storage when available; never read or extract Discord cookies, page storage, or session credentials. Do not commit tokens, cookies, personal exports, or local browser data. Keep permissions and host matches narrowly scoped, and review `wxt.config.ts` before submitting manifest changes.
