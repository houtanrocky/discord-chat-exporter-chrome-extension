export function abortableDelay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function createDiscordApi({ fetchImpl = (...args) => fetch(...args), delay = abortableDelay } = {}) {
  async function request(endpoint, token, signal) {
    for (let attempt = 0; attempt < 4; attempt++) {
      signal?.throwIfAborted();
      const response = await fetchImpl(`https://discord.com/api/v9${endpoint}`, {
        headers: { Accept: 'application/json', Authorization: token }, credentials: 'omit', signal,
      });
      if (response.status === 429 && attempt < 3) {
        const data = await response.json();
        await delay(Math.min(Math.max(Number(data.retry_after) || 1, 0.2), 60) * 1000, signal);
        continue;
      }
      if (!response.ok) {
        const reason = {
          401: 'Your token was rejected. Clear it and enter a valid token.',
          403: 'You do not have permission to read this conversation.',
          404: 'This conversation is no longer available.',
          429: 'The rate limit was reached. Wait a moment and retry.',
        }[response.status] || 'The service is unavailable. Please retry.';
        throw new Error(`Discord API ${response.status}: ${reason}`);
      }
      return response.json();
    }
  }
  async function getGuilds(token, signal) {
    const guilds = [];
    let after = '';
    while (true) {
      const data = await request(`/users/@me/guilds?limit=200${after ? `&after=${after}` : ''}`, token, signal);
      guilds.push(...data.map(({ id, name }) => ({ id, name })));
      if (data.length < 200) return guilds;
      const next = data.at(-1).id;
      if (next === after) throw new Error('The server list did not advance. Please retry.');
      after = next;
    }
  }
  async function getChannels(guildId, token, signal) {
    const data = await request(`/guilds/${guildId}/channels`, token, signal);
    return data.filter(c => c.type === 0 || c.type === 5).map(({ id, name, type }) => ({ id, name, type }));
  }
  async function getDMs(token, signal) {
    const data = await request('/users/@me/channels', token, signal);
    return data.filter(c => c.type === 1 || c.type === 3).map(c => ({
      id: c.id, type: c.type,
      name: c.name || c.recipients?.map(r => r.global_name || r.username).join(', ') || 'Direct message',
    }));
  }
  async function fetchMessages(channelId, token, bounds, signal, onProgress = () => {}) {
    const messages = new Map();
    let before = bounds.before;
    while (true) {
      signal.throwIfAborted();
      const data = await request(`/channels/${channelId}/messages?limit=100${before ? `&before=${before}` : ''}`, token, signal);
      if (!data.length) break;
      for (const message of data) {
        if (!bounds.after || BigInt(message.id) >= BigInt(bounds.after)) messages.set(message.id, message);
      }
      onProgress(messages.size);
      const oldestId = data.at(-1).id;
      if (data.length < 100 || (bounds.after && BigInt(oldestId) < BigInt(bounds.after))) break;
      if (before && BigInt(oldestId) >= BigInt(before)) throw new Error('The message history did not advance. Please retry.');
      before = oldestId;
      await delay(250, signal);
    }
    return [...messages.values()].sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
  }
  return { request, getGuilds, getChannels, getDMs, fetchMessages };
}
