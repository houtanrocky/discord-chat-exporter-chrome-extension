import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

// Publish only docs/ and a site-only deployment workflow. Git's index and the
// application's current branch are untouched; pushes are ordinary fast forwards.
const repository = 'houtanrocky/discord-chat-exporter-chrome-extension';
const git = (args, input) => execFileSync('git', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const gh = (args, input) => execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
let pages;
try { pages = JSON.parse(gh(['api', `repos/${repository}/pages`])); }
catch (error) {
  if (!String(error.stderr).includes('404')) throw error;
  pages = JSON.parse(gh(['api', '--method', 'POST', `repos/${repository}/pages`, '--input', '-'], JSON.stringify({ build_type: 'workflow' })));
}
if (pages.build_type !== 'workflow') throw new Error('Pages already uses another publishing configuration. Inspect it before replacing it.');
const files = new Map();
function collect(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) collect(path, `${relative}/`);
    else files.set(relative, readFileSync(path));
  }
}
collect('docs');
const workflow = readFileSync('.github/workflows/pages.yml', 'utf8')
  .replace('branches: [main]', 'branches: [gh-pages]')
  .replace("    paths: ['docs/**', '.github/workflows/pages.yml']\n", '')
  .replace('path: docs', 'path: .');
files.set('.github/workflows/pages.yml', Buffer.from(workflow));
function tree(prefix = '') {
  const entries = [];
  const directories = new Set();
  for (const [path, content] of files) {
    if (!path.startsWith(prefix)) continue;
    const name = path.slice(prefix.length);
    if (name.includes('/')) directories.add(name.split('/')[0]);
    else entries.push(`100644 blob ${git(['hash-object', '-w', '--stdin'], content)}\t${name}`);
  }
  for (const name of directories) entries.push(`040000 tree ${tree(`${prefix}${name}/`)}\t${name}`);
  return git(['mktree'], `${entries.sort().join('\n')}\n`);
}
const existing = git(['ls-remote', '--heads', 'origin', 'gh-pages']).split(/\s/)[0];
const parents = [];
if (existing) { git(['fetch', 'origin', 'gh-pages']); parents.push('-p', existing); }
const commit = git(['commit-tree', tree(), ...parents], 'Publish Discord Chat Exporter website and support pages\n');
console.log(git(['push', 'origin', `${commit}:refs/heads/gh-pages`]));
writeFileSync('release/1.4.0/WEBSITE.md', `# Website publication\n\nSite-only commit: ${commit}\n\nBranch: gh-pages\n\nGitHub Pages: GitHub Actions publishing enabled.\n\nWebsite: ${pages.html_url}\n\nSupport: ${pages.html_url}support.html\n\nPrivacy: ${pages.html_url}privacy.html\n\nThe workflow must finish successfully before these links are live. Check with gh run list and verify HTTP responses. Application changes remain in the local working tree.\n`);
console.log(`Published the site snapshot on gh-pages: ${commit}. Watch its GitHub Actions deployment before using ${pages.html_url}`);
