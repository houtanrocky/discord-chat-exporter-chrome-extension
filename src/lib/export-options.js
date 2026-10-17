export const FORMATS = {
  json: { label: 'JSON', mime: 'application/json', ext: 'json' },
  csv: { label: 'CSV', mime: 'text/csv', ext: 'csv' },
  plaintext: { label: 'Plain text', mime: 'text/plain', ext: 'txt' },
};

export function parseDiscordUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== 'discord.com' || url.protocol !== 'https:') return null;
    const match = url.pathname.match(/^\/channels\/(\d+|@me)\/(\d+)(?:\/|$)/);
    return match ? { guildId: match[1], channelId: match[2] } : null;
  } catch { return null; }
}

export function dateToSnowflake(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return (BigInt(Math.max(0, date.getTime() - 1420070400000)) << 22n).toString();
}

export function getDateBounds(after, before, allTime = false) {
  if (allTime) return { after: null, before: null };
  const start = after ? new Date(`${after}T00:00:00.000Z`) : null;
  const end = before ? new Date(`${before}T00:00:00.000Z`) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) throw new Error('Choose valid dates.');
  if (start && end && start > end) throw new Error('The start date must be on or before the end date.');
  if (end) end.setUTCDate(end.getUTCDate() + 1);
  return { after: dateToSnowflake(start), before: dateToSnowflake(end) };
}

export function validateExport(options) {
  if (!Object.hasOwn(FORMATS, options.format)) throw new Error('Choose a supported file format.');
  if (!/^(\d+|@me)$/.test(options.guildId || '')) throw new Error('Choose a server or direct messages.');
  if (!options.allChannels && !/^\d+$/.test(options.channelId || '')) throw new Error('Choose a conversation.');
  getDateBounds(options.after, options.before, options.allTime);
}

export function safeFilename(name) {
  return (name || 'conversation').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/^\.+|[. ]+$/g, '').slice(0, 100) || 'conversation';
}
