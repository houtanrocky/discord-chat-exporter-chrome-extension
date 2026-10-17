# Store fields and privacy declarations

Version: 1.4.0 (intentionally unchanged for the pending release)
Category: Tools (choose the closest available utility category in your dashboard)
Language: English
Distribution: Public; all regions you intend to support. No language or regional keyword stuffing.
Mature content: The extension does not supply mature content itself. Reassess if your product content changes.
Pricing: Confirm in the publisher dashboard; do not introduce payment claims not verified for the existing listing.

Existing listing:
https://chromewebstore.google.com/detail/discord-chat-exporter/hecekgpcppmbmajfbmdmdnpjcnhofaoa
Homepage:
https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/
Support:
https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/support.html
Privacy:
https://houtanrocky.github.io/discord-chat-exporter-chrome-extension/privacy.html
Source:
https://github.com/houtanrocky/discord-chat-exporter-chrome-extension

Single purpose:
Export Discord conversations the user is authorized to access into downloadable JSON, CSV, or text files.

Permission justifications:
- storage: Store the API token explicitly provided by the user and selected conversation context. Session storage is preferred, with a disclosed local-storage fallback.
- downloads: Save the conversation export files requested by the user.
- activeTab: Identify the active Discord conversation when the user opens the extension.
- tabs: Read Discord tab navigation, detect the selected channel, and open the export progress workspace.
- https://discord.com/*: Read the current Discord channel URL and make direct authenticated API requests for server/channel lists and messages.

Remote code:
No remote executable code. All extension scripts and styles are bundled locally. The API returns data only.

Data-use review:
The extension handles authentication information (explicit token), personally identifiable information (message author names and IDs), personal communications (selected messages), and limited web context (Discord channel URLs). These are processed to perform the requested export. No data is sent to the maintainer, analytics provider, advertising service, or developer-operated server. Authentication is sent directly to Discord. Files are handed to the browser’s download manager.

Use this behavior inventory to answer the CURRENT dashboard questions, which may distinguish data handled locally from data collected/transmitted. Do not automatically select “no data handled” solely because there is no developer backend. Ensure selections match the actual behavior and the public privacy policy. The publisher must attest to the dashboard’s certifications.

The data is not sold, used for unrelated purposes, or used to determine creditworthiness. No analytics, ads, credential extraction, or browser sync. Do not add “offline” or “no network requests” claims: exporting requires the Discord API.

Manifest changes in this release:
- Keep version 1.4.0 and the user's pending title/description edits.
- Add homepage_url.
- Restrict host access from *://discord.com/* to https://discord.com/*.
- Restrict the content script to https://discord.com/channels/*.
- Remove export.html from web_accessible_resources with <all_urls>. It is opened internally.
- No new permission names; existing storage/downloads/activeTab/tabs retained.
- Emit Firefox-specific manifest settings only for Firefox, avoiding an unrecognized-key warning in Chrome.
