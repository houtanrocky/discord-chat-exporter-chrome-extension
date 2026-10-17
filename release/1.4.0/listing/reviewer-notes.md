# Reviewer testing notes

The extension requires an explicit, valid Discord API token with permission to read a selected conversation. It never extracts credentials. Do not publish real tokens in this repository or in public review notes.

1. Install the packaged extension and open a channel in the web version at https://discord.com/channels/<server>/<channel> (or a DM at /channels/@me/<channel>).
2. Open the extension popup, enter an authorized API token in the password input, and choose Connect.
3. Confirm the selected server/channel, select JSON, leave All time enabled, and choose Export conversation.
4. The internal export tab shows live progress. The browser asks where to save the file when configured to do so. Open the generated JSON and verify its channel and messages.
5. Repeat with CSV and TXT. Use a small test server and synthetic messages you control.
6. Turn off All time, select a date range in UTC, and verify the full Through day is included.
7. Select Every channel in this source on a small server. One file is generated per returned text/announcement channel. Categories/voice channels are excluded; a permission error stops the batch.
8. Select Direct messages in a context you are authorized to access. Choose a conversation and export it.
9. Start a longer export, cancel it, and retry. Already saved files remain.
10. Enter an invalid token and verify an actionable 401 error. Clear the token after testing.
11. On another website, the popup asks you to open a Discord channel and prevents exporting.

Screenshots use the actual production build with a deterministic, synthetic API fixture. They do not expose a real account or claim access to private messages.

Automated verification: npm run test:all. Chromium tests load the real MV3 extension, execute its worker, and verify actual downloaded file contents. Firefox UI tests load the compiled Firefox pages against a simulated browser extension API; a native Firefox add-on installation check remains part of the manual release checklist.
