class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.global_name = data.global_name || data.username;
    this.avatar = data.avatar;
    this.bot = data.bot || false;
  }
  get displayName() { return this.global_name || this.username; }
  get avatarUrl() {
    return this.avatar ? `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}

class Message {
  constructor(data) {
    this.id = data.id;
    this.type = data.type;
    this.author = new User(data.author);
    this.content = data.content || '';
    this.timestamp = new Date(data.timestamp);
    this.editedTimestamp = data.edited_timestamp ? new Date(data.edited_timestamp) : null;
    this.attachments = (data.attachments || []).map(a => ({
      id: a.id,
      url: a.url,
      filename: a.filename,
      size: a.size
    }));
    this.embeds = (data.embeds || []).map(e => ({
      title: e.title,
      url: e.url,
      description: e.description
    }));
    this.reactions = (data.reactions || []).map(r => ({
      emoji: r.emoji.name,
      count: r.count
    }));
    this.mentions = (data.mentions || []).map(u => new User(u));
    this.reference = data.message_reference;
    this.flags = data.flags || 0;
  }
}

// ---------- Export Builders ----------
function buildJson(messages, channel, guild) {
  const data = {
    guild: guild ? { id: guild.id, name: guild.name } : null,
    channel: { id: channel.id, name: channel.name, type: channel.type },
    exportedAt: new Date().toISOString(),
    messages: messages.map(m => ({
      id: m.id,
      type: m.type,
      author: {
        id: m.author.id,
        username: m.author.username,
        displayName: m.author.displayName,
        bot: m.author.bot
      },
      content: markdownToPlainText(m.content),
      timestamp: m.timestamp.toISOString(),
      editedTimestamp: m.editedTimestamp ? m.editedTimestamp.toISOString() : null,
      attachments: m.attachments,
      embeds: m.embeds,
      reactions: m.reactions,
      mentions: m.mentions.map(u => ({ id: u.id, username: u.username })),
      reference: m.reference
    }))
  };
  return JSON.stringify(data, null, 2);
}

function buildCsv(messages) {
  const headers = ['MessageID', 'AuthorID', 'AuthorName', 'Timestamp', 'Content', 'AttachmentURLs', 'Reactions'];
  let rows = [headers.join(',')];
  for (const m of messages) {
    const content = escapeCsv(markdownToPlainText(m.content));
    const attachments = m.attachments.map(a => a.url).join(';');
    const reactions = m.reactions.map(r => `${r.emoji}:${r.count}`).join(';');
    rows.push([
      m.id,
      m.author.id,
      m.author.displayName,
      m.timestamp.toISOString(),
      content,
      attachments,
      reactions
    ].map(v => escapeCsv(v)).join(','));
  }
  return rows.join('\n');
}
function escapeCsv(str) {
  if (str == null) return '';
  const s = String(str).replace(/"/g, '""');
  return `"${s}"`;
}

function buildPlainText(messages) {
  let text = '';
  for (const m of messages) {
    const date = m.timestamp.toLocaleString();
    const author = m.author.displayName;
    const content = markdownToPlainText(m.content);
    text += `[${date}] ${author}: ${content}\n`;
    if (m.attachments.length) {
      text += '  Attachments: ' + m.attachments.map(a => a.url).join(', ') + '\n';
    }
  }
  return text;
}