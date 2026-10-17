# Website publication

Site-only commit: b901b79bc4403b3243f56b5c07fd0e17380f5ebb

Branch: gh-pages

GitHub Pages: GitHub Actions publishing enabled.

Website: https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/

Support: https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/support.html

Privacy: https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/privacy.html

Deployment: SUCCESS on October 18, 2026 (local date).

Workflow: https://github.com/houtanrocky/discord-chat-exporter-chrome-extension/actions/runs/39080380849

Verified with HTTP 200 and SHA-256 equality against the local files: homepage, support, privacy, stylesheet, logo, export screenshot, social card, and sitemap. Recheck with `node scripts/check-site.mjs`.

The first deployment was rejected by the existing github-pages environment branch policy. With the user's explicit approval, gh-pages was added to its allowed branches; the existing main policy was retained. The rerun succeeded.

Only the static website and its deployment workflow were pushed on gh-pages. Application changes, tests, release assets, and the main-branch workflows remain in the local working tree for review/commit. No Chrome Web Store submission was performed.
