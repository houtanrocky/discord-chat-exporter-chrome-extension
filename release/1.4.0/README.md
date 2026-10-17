# Chrome Web Store release kit · 1.4.0

Start here. The version remains **1.4.0**, matching the pending release.

| Dashboard field | File |
| --- | --- |
| Title | `listing/title.txt` |
| Summary / manifest description | `listing/short-description.txt` |
| Detailed description | `listing/description.txt` |
| Store icon | `icons/icon-128.png` |
| Screenshots, in order | `screenshots/01-choose-conversation.png` through `05-direct-messages.png` |
| Small promo tile | `promo/small-tile-440x280.png` |
| Optional marquee | `promo/marquee-1400x560.png` |
| Chrome upload ZIP | `packages/discord-chat-exporter-1.4.0-chrome.zip` |
| Firefox ZIP | `packages/discord-chat-exporter-1.4.0-firefox.zip` |
| Firefox reviewer source ZIP | `packages/discord-chat-exporter-1.4.0-sources.zip` |
| Privacy, permissions, category, and URLs | `listing/dashboard-fields.md` |
| Reviewer setup instructions | `listing/reviewer-notes.md` |
| What changed | `listing/release-notes.txt` |
| Discovery guidance and official references | `listing/discovery.md` |
| Validation and remaining manual checks | `VALIDATION.md` |

All five store screenshots are 1280 × 800 RGB PNGs without alpha. The small tile is 440 × 280 and the marquee is 1400 × 560. The 1200 × 630 social card is for the public website, not a store screenshot.

The screenshots show the actual production extension with synthetic API responses. `source/` keeps the original popup captures and `provenance.json` with capture URLs, browser version, hashes, and reproduction instructions. Screenshots 01, 02, and 05 add explanatory captions around unmodified popup captures. Screenshots 03 and 04 show the export workspace directly. These do not represent a logged-in personal account.

The original logo is an editable SVG chat bubble with a downward arrow, with 16, 32, 48, 128, and 512 pixel PNG variants. It does not use Discord’s logo. It was drawn as a vector asset and rasterized using Sharp.

Website: https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/

Support: https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/support.html

Privacy: https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/privacy.html

Publication is tracked separately in `WEBSITE.md`. Verify public HTTP responses before adding URLs to the store. Account-level items (publisher contact details, distribution choices, privacy attestations, and the final store submission) must be completed in the publisher dashboard. A YouTube promo is optional; no placeholder video link is provided.

Regenerate assets with the commands in the root README. Run `node scripts/package-release.mjs` after changing release content to refresh `SHA256SUMS.txt`, then run `npm run release:verify`.
