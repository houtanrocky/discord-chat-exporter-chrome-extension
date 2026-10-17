export function markdownToPlainText(text) {
  if (!text) return '';

  let result = text;

  // Remove code blocks (multiline)
  result = result.replace(/```[\s\S]*?```/g, '');

  // Inline code
  result = result.replace(/`([^`]+)`/g, '$1');

  // Spoiler (remove ||...||)
  result = result.replace(/\|\|([\s\S]+?)\|\|/g, '$1');

  // Bold, italic, underline, strikethrough
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/\*(.+?)\*/g, '$1');
  result = result.replace(/__(.+?)__/g, '$1');
  result = result.replace(/~~(.+?)~~/g, '$1');

  // Quotes
  result = result.replace(/^>\s(.+)$/gm, '$1');
  result = result.replace(/^>>>\s([\s\S]+)$/gm, '$1');

  // Mentions: <@123>, <#123>, <@&123> -> keep as @id, #id
  result = result.replace(/<@!?(\d+)>/g, '@$1');
  result = result.replace(/<#(\d+)>/g, '#$1');
  result = result.replace(/<@&(\d+)>/g, '@$1');
  // @everyone and @here remain.

  // Custom emoji: <:name:id> -> :name:
  result = result.replace(/<a?:\w+:(\d+)>/g, ':$1:');

  // Links: [text](url) -> text (url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // Auto links: keep as is
  // Timestamps: <t:123456...> -> keep as raw
  return result;
}
