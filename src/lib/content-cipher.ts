import type { JSONContent } from "@tiptap/react";

export type SealedContent = {
  sealed: 1;
  iv: string;
  data: string;
};

export function isSealedContent(value: unknown): value is SealedContent {
  if (!value || typeof value !== "object") return false;
  const record = value as { sealed?: unknown; iv?: unknown; data?: unknown };
  return record.sealed === 1 && typeof record.iv === "string" && typeof record.data === "string";
}

export async function encryptContent(content: JSONContent, key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importKey(key),
    new TextEncoder().encode(JSON.stringify(content))
  );
  return {
    sealed: 1 as const,
    iv: encodeBase64(iv),
    data: encodeBase64(new Uint8Array(cipher)),
  };
}

export async function decryptContent(sealed: SealedContent, key: string) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(sealed.iv) },
    await importKey(key),
    decodeBase64(sealed.data)
  );
  return JSON.parse(new TextDecoder().decode(plain)) as JSONContent;
}

async function importKey(key: string) {
  const raw = decodeBase64(key);
  if (raw.byteLength !== 32) {
    throw new Error("ENTRY_CONTENT_KEY must be 32 bytes of base64");
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
