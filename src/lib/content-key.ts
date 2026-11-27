import type { JSONContent } from "@tiptap/react";
import { decryptContent, isSealedContent } from "@/lib/content-cipher";

let pending: Promise<string> | null = null;

export function loadContentKey() {
  pending ??= fetch("/api/auth/content-key", { credentials: "include" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Encryption key is unavailable");
      const body = (await response.json()) as { key?: unknown };
      if (typeof body.key !== "string" || body.key.length === 0) {
        throw new Error("Encryption key is unavailable");
      }
      return body.key;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

export async function openEntryContent(content: unknown) {
  if (content == null) return undefined;
  if (!isSealedContent(content)) return content as JSONContent;
  return decryptContent(content, await loadContentKey());
}
