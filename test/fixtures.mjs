// All names, IDs, tokens, and messages in this module are synthetic.
export const guild = { id: '100000000000000001', name: 'Design Collective' };
export const channels = [
  { id: '200000000000000001', name: 'project-notes', type: 0 },
  { id: '200000000000000002', name: 'announcements', type: 5 },
  { id: '200000000000000003', name: 'Design team', type: 4 },
  { id: '200000000000000004', name: 'Voice lounge', type: 2 },
];
export const dms = [
  { id: '300000000000000001', type: 1, recipients: [{ id: '400000000000000001', username: 'alex', global_name: 'Alex Rivera' }] },
  { id: '300000000000000002', type: 3, name: 'Weekend plans', recipients: [] },
];
const contents = ['The launch checklist is ready. Thanks, everyone!', 'Updated the **design notes** with today’s decisions.', 'Let’s keep the accessibility improvements in this release.', 'Next step: review the prototype and share feedback.'];
export function message(index = 0) {
  return {
    id: (BigInt('1550000000000000000') + BigInt(index)).toString(), type: 0,
    author: { id: '400000000000000001', username: index % 2 ? 'sam' : 'alex', global_name: index % 2 ? 'Sam Chen' : 'Alex Rivera' },
    content: contents[index % contents.length], timestamp: new Date(Date.UTC(2026, 9, 17, 10, index)).toISOString(),
    attachments: [], reactions: [], mentions: [], embeds: [],
  };
}

// Serializable so the same API fixture runs inside the real extension worker.
export function installApiFixture(data) {
  globalThis.__fixture = { mode: 'success', requests: [], ...data };
  globalThis.fetch = async (input, init = {}) => {
    const fixture = globalThis.__fixture;
    const url = new URL(input);
    fixture.requests.push(url.pathname + url.search);
    if (url.origin !== 'https://discord.com') throw new Error('Unexpected network request in test');
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (fixture.mode === 'unauthorized') return new Response('{}', { status: 401 });
    if (fixture.mode === 'forbidden' && url.pathname.includes('/messages')) return new Response('{}', { status: 403 });
    if ((fixture.mode === 'slow' || (fixture.mode === 'paused' && url.searchParams.has('before'))) && url.pathname.includes('/messages')) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 30000);
        init.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
      });
    }
    const path = url.pathname.replace('/api/v9', '');
    let result;
    if (path === '/users/@me/guilds') result = [fixture.guild];
    else if (path === '/users/@me/channels') result = fixture.dms;
    else if (/^\/guilds\/\d+\/channels$/.test(path)) result = fixture.channels;
    else if (/^\/guilds\/\d+$/.test(path)) result = fixture.guild;
    else if (/\/messages$/.test(path)) {
      result = fixture.mode === 'empty' ? [] : fixture.messages
        .filter(m => !url.searchParams.get('before') || BigInt(m.id) < BigInt(url.searchParams.get('before')))
        .sort((a, b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1)
        .slice(0, Number(url.searchParams.get('limit') || 100));
    } else if (/^\/channels\/\d+$/.test(path)) {
      const id = path.split('/')[2];
      result = fixture.channels.find(c => c.id === id) || { ...fixture.dms.find(c => c.id === id), name: 'Alex Rivera' };
    } else throw new Error(`Unhandled test endpoint: ${path}`);
    return Response.json(result);
  };
}

export const fixtureData = { guild, channels, dms, messages: Array.from({ length: 128 }, (_, i) => message(i)) };
