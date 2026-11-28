import type { JSONContent } from "@tiptap/react";
import {
  decryptContent,
  deriveUserContentKey,
  encryptContent,
  isSealedContent,
} from "@/lib/content-cipher";
import { sanitizeEntryDocument } from "@/lib/entry-document";

function masterKey() {
  const key = process.env.ENTRY_CONTENT_KEY;
  if (!key) throw new Error("ENTRY_CONTENT_KEY is not configured");
  return key;
}

export async function sealForUser(userId: string, content: JSONContent) {
  const key = await deriveUserContentKey(masterKey(), userId);
  return encryptContent(content, key, 2);
}

export async function openForUser(userId: string, stored: unknown): Promise<JSONContent | null> {
  if (stored == null) return null;
  const plain = isSealedContent(stored)
    ? await decryptContent(
        stored,
        stored.sealed === 1 ? masterKey() : await deriveUserContentKey(masterKey(), userId)
      )
    : stored;
  return sanitizeEntryDocument(plain);
}
