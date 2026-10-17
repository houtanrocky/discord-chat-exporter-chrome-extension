import { Message, buildJson, buildCsv, buildPlainText } from './utils.js';
import { FORMATS, getDateBounds, safeFilename, validateExport } from './export-options.js';

export async function runExport(options, { api, token, signal, download, onProgress = () => {} }) {
  validateExport(options);
  if (!token) throw new Error('Enter your API token in the extension first.');
  const bounds = getDateBounds(options.after, options.before, options.allTime);
  const channels = options.allChannels
    ? await (options.guildId === '@me' ? api.getDMs(token, signal) : api.getChannels(options.guildId, token, signal))
    : [await api.request(`/channels/${options.channelId}`, token, signal)];
  if (!channels.length) throw new Error('No readable text channels were found.');
  const guild = options.guildId === '@me' ? null : await api.request(`/guilds/${options.guildId}`, token, signal);
  let messageCount = 0;
  for (let index = 0; index < channels.length; index++) {
    signal.throwIfAborted();
    const channel = channels[index];
    const channelName = channel.name || 'direct-messages';
    const raw = await api.fetchMessages(channel.id, token, bounds, signal, count => {
      onProgress({ percent: Math.round(index / channels.length * 90), status: `Reading ${channelName}`, detail: `${count.toLocaleString()} messages fetched in this conversation`, messageCount: messageCount + count });
    });
    signal.throwIfAborted();
    const messages = raw.map(m => new Message(m));
    const builders = { json: () => buildJson(messages, channel, guild), csv: () => buildCsv(messages), plaintext: () => buildPlainText(messages) };
    const format = FORMATS[options.format];
    onProgress({ percent: Math.round((index + 0.9) / channels.length * 100), status: 'Saving your file', detail: 'Choose a location if your browser asks.' });
    await download({ content: builders[options.format](), mime: format.mime, filename: `${safeFilename(channelName)}_${channel.id}_export.${format.ext}` });
    messageCount += messages.length;
  }
  signal.throwIfAborted();
  return { channelCount: channels.length, messageCount };
}
