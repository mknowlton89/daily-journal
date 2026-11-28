import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import {
  decryptContent,
  deriveUserContentKey,
  encryptContent,
  isSealedContent,
} from "@/lib/content-cipher";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

const key = Buffer.from(new Uint8Array(32).map((_, index) => index + 1)).toString("base64");

describe("content cipher", () => {
  it("seals the document so the stored payload is not the journal text", async () => {
    const sealed = await encryptContent(
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Private line" }] }] },
      key
    );
    expect(isSealedContent(sealed)).toBe(true);
    expect(JSON.stringify(sealed)).not.toContain("Private line");
    expect(await decryptContent(sealed, key)).toMatchObject({
      content: [{ content: [{ text: "Private line" }] }],
    });
  });

  it("uses a fresh iv so two saves of the same note differ", async () => {
    const doc = { type: "doc", content: [] };
    const first = await encryptContent(doc, key);
    const second = await encryptContent(doc, key);
    expect(first.data).not.toBe(second.data);
  });

  it("rejects a key that is not 32 bytes", async () => {
    await expect(encryptContent({ type: "doc" }, "aGVsbG8=")).rejects.toThrow(/32 bytes/);
  });

  it("derives a different key for each user and keeps legacy seals on the master key", async () => {
    const doc = { type: "doc", content: [{ type: "text", text: "Private line" }] };
    const ada = await deriveUserContentKey(key, "ada");
    const grace = await deriveUserContentKey(key, "grace");
    expect(ada).not.toBe(key);
    expect(ada).not.toBe(grace);
    expect(await deriveUserContentKey(key, "ada")).toBe(ada);

    const legacy = await encryptContent(doc, key, 1);
    const current = await encryptContent(doc, ada, 2);
    expect(legacy.sealed).toBe(1);
    expect(await decryptContent(legacy, key)).toMatchObject({ content: doc.content });
    expect(await decryptContent(current, ada)).toMatchObject({ content: doc.content });
    await expect(decryptContent(current, key)).rejects.toThrow();
  });
});
