export type RichTextNode = {
  type?: string;
  text?: string;
  content?: RichTextNode[];
};

const BLOCKS = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "codeBlock",
  "taskItem",
]);

export function extractPlainText(
  content: RichTextNode | string | null | undefined
) {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  const chunks: string[] = [];

  const walk = (node: RichTextNode) => {
    if (node.text) {
      chunks.push(node.text);
      return;
    }
    node.content?.forEach(walk);
    if (node.type && BLOCKS.has(node.type)) chunks.push("\n");
  };

  walk(content);
  return chunks.join("").replace(/[ \t]+\n/g, "\n").replace(/\n+/g, "\n").trim();
}

export function buildPreview(plain: string, query?: string, max = 160) {
  const normalized = plain.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const needle = query?.trim();
  if (!needle) return truncate(normalized, max);

  const index = normalized.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return truncate(normalized, max);

  const start = Math.max(0, index - 48);
  const end = Math.min(normalized.length, start + max);
  let snippet = normalized.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < normalized.length) snippet = `${snippet}…`;
  return snippet;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

export function highlightParts(text: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const index = lower.indexOf(needle, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), match: false });
    }
    parts.push({
      text: text.slice(index, index + needle.length),
      match: true,
    });
    cursor = index + needle.length;
  }

  return parts;
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
