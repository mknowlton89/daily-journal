import type { JSONContent } from "@tiptap/react";

export const ENTRY_JSON_MAX_BYTES = 500_000;
const MAX_DEPTH = 30;
const MAX_NODES = 8_000;
const MAX_TEXT_LENGTH = 100_000;
const MAX_ATTR_LENGTH = 2_000;
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|ftp:\/\/|ftps:\/\/|sms:)/i;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSafeHref(value: string) {
  if (!value || value !== value.trim()) return false;
  if (/[\u0000-\u001F\u007F]/.test(value)) return false;
  return SAFE_HREF.test(value);
}

function sanitizeAttrs(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const attrs: Record<string, unknown> = {};
  for (const [key, attr] of Object.entries(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") return null;
    if (key.length > 64) return null;
    if (typeof attr === "string") {
      if (attr.length > MAX_ATTR_LENGTH) return null;
      attrs[key] = key === "href" || key === "src" ? (isSafeHref(attr) ? attr.trim() : "") : attr;
      continue;
    }
    if (typeof attr === "number" && Number.isFinite(attr)) {
      attrs[key] = attr;
      continue;
    }
    if (typeof attr === "boolean" || attr === null) {
      attrs[key] = attr;
      continue;
    }
    return null;
  }
  return attrs;
}

export function sanitizeEntryDocument(value: unknown): JSONContent | null {
  if (!isRecord(value) || value.type !== "doc") return null;
  let nodes = 0;

  const sanitize = (node: unknown, depth: number): JSONContent | null => {
    if (depth > MAX_DEPTH || !isRecord(node)) return null;
    nodes += 1;
    if (nodes > MAX_NODES) return null;
    if (typeof node.type !== "string" || node.type.length === 0 || node.type.length > 64) {
      return null;
    }
    for (const key of Object.keys(node)) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") return null;
    }

    const next: JSONContent = { type: node.type };
    if (node.text !== undefined) {
      if (typeof node.text !== "string" || node.text.length > MAX_TEXT_LENGTH) return null;
      next.text = node.text;
    }
    if (node.attrs !== undefined) {
      const attrs = sanitizeAttrs(node.attrs);
      if (!attrs) return null;
      next.attrs = attrs;
    }
    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) return null;
      const marks: JSONContent["marks"] = [];
      for (const mark of node.marks) {
        if (!isRecord(mark) || typeof mark.type !== "string" || mark.type.length > 64) return null;
        const clean: { type: string; attrs?: Record<string, unknown> } = { type: mark.type };
        if (mark.attrs !== undefined) {
          const attrs = sanitizeAttrs(mark.attrs);
          if (!attrs) return null;
          clean.attrs = attrs;
        }
        marks.push(clean);
      }
      next.marks = marks;
    }
    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) return null;
      const children: JSONContent[] = [];
      for (const child of node.content) {
        const clean = sanitize(child, depth + 1);
        if (!clean) return null;
        children.push(clean);
      }
      next.content = children;
    }
    return next;
  };

  const clean = sanitize(value, 0);
  if (!clean) return null;
  if (JSON.stringify(clean).length > ENTRY_JSON_MAX_BYTES) return null;
  return clean;
}
