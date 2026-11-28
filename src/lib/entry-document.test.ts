import { describe, expect, it } from "vitest";
import { ENTRY_JSON_MAX_BYTES, sanitizeEntryDocument } from "@/lib/entry-document";

describe("entry documents", () => {
  it("keeps a normal document and strips unsafe link targets", () => {
    const clean = sanitizeEntryDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello",
              marks: [
                { type: "link", attrs: { href: "javascript:alert(1)" } },
                { type: "link", attrs: { href: " https://example.com" } },
                { type: "link", attrs: { href: "https://example.com/notes" } },
              ],
            },
          ],
        },
      ],
    });

    expect(clean?.content?.[0]?.content?.[0]?.marks?.map((mark) => mark.attrs?.href)).toEqual([
      "",
      "",
      "https://example.com/notes",
    ]);
  });

  it("rejects documents that are not a tip tap doc or are too large", () => {
    expect(sanitizeEntryDocument({ sealed: 1, iv: "aa", data: "bb" })).toBeNull();
    expect(sanitizeEntryDocument("private")).toBeNull();
    expect(sanitizeEntryDocument({ $gt: "" })).toBeNull();
    const oversized = sanitizeEntryDocument({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "a".repeat(ENTRY_JSON_MAX_BYTES) }] }],
    });
    expect(oversized).toBeNull();
  });
});
