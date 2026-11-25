import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { JournalPrompt, insertPromptFromSlash } from "@/components/journal/journal-prompt";
import { filterSlashCommands, readSlash } from "@/components/journal/slash-menu";
import { extractPlainText } from "@/lib/entry-text";

function editorWith(text: string) {
  const editor = new Editor({
    extensions: [StarterKit, JournalPrompt],
    content: `<p>${text}</p>`,
  });
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  return editor;
}

describe("prompt slash command", () => {
  it("filters the Prompt item by typing", () => {
    const matches = filterSlashCommands("pro");
    expect(matches.map((item) => item.value)).toContain("prompt");
    expect(matches.find((item) => item.value === "prompt")?.description).toBe(
      "Insert a writing prompt"
    );
    expect(filterSlashCommands("zzzz")).toHaveLength(0);
  });

  it("inserts a prompt block and leaves the cursor in the paragraph below", () => {
    const editor = editorWith("/prompt");
    const match = readSlash(editor);
    expect(match?.query).toBe("prompt");
    if (!match) return;

    const text = "What felt different about today compared to yesterday?";
    expect(insertPromptFromSlash(editor, match, text)).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]).toMatchObject({
      type: "journalPrompt",
      attrs: { text },
    });
    expect(json.content?.[1]?.type).toBe("paragraph");
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(extractPlainText(json)).toContain(text);

    editor.commands.setContent(json);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "journalPrompt",
      attrs: { text },
    });

    const plain = new Editor({
      extensions: [StarterKit, JournalPrompt],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Existing note" }] }] },
    });
    expect(plain.getJSON().content?.[0]?.type).toBe("paragraph");
    plain.destroy();
    editor.destroy();
  });
});
