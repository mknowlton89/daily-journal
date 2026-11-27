import { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  JournalPrompt,
  PromptEntryRemovalToast,
  insertPromptFromSlash,
} from "@/components/journal/journal-prompt";
import { filterSlashCommands, readSlash } from "@/components/journal/slash-menu";
import { bindPromptLibrary, type PromptLibraryApi } from "@/components/journal/use-prompt-library";
import { extractPlainText } from "@/lib/entry-text";
import { emptyLibrary } from "@/lib/prompts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CURRENT = "What drained my energy today, and what helped recharge me?";
const OTHER =
  "What do I really want in my life right now, separate from other people's expectations?";

function editorWith(text: string) {
  const editor = new Editor({
    extensions: [StarterKit, JournalPrompt],
    content: `<p>${text}</p>`,
  });
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  return editor;
}

function PromptHarness({
  text,
  api,
  onEditor,
}: {
  text: string;
  api: PromptLibraryApi;
  onEditor: (editor: Editor) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ trailingNode: false }), JournalPrompt],
    content: {
      type: "doc",
      content: [
        { type: "journalPrompt", attrs: { text } },
        { type: "paragraph", content: [{ type: "text", text: "Kept writing" }] },
      ],
    },
    onCreate: ({ editor: created }) => {
      bindPromptLibrary(created, api);
      onEditor(created);
    },
  });
  useEffect(() => {
    if (!editor) return;
    bindPromptLibrary(editor, api);
    onEditor(editor);
  }, [editor, api, onEditor]);
  return createElement(
    "div",
    null,
    createElement(EditorContent, { editor }),
    createElement(PromptEntryRemovalToast)
  );
}

function mountPrompt(text = CURRENT) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  const deleted: string[] = [];
  let editor!: Editor;
  const api: PromptLibraryApi = {
    getLibrary: () => emptyLibrary(),
    random: () => OTHER,
    toggleFavorite: () => undefined,
    deletePrompt: (id) => {
      deleted.push(id);
    },
    addSaved: () => undefined,
    subscribe: () => () => undefined,
  };
  act(() => {
    root.render(
      createElement(PromptHarness, {
        text,
        api,
        onEditor: (created: Editor) => {
          editor = created;
        },
      })
    );
  });
  return {
    get editor() {
      return editor;
    },
    deleted,
    destroy() {
      act(() => {
        root.unmount();
      });
      if (editor && !editor.isDestroyed) editor.destroy();
      host.remove();
    },
  };
}

function labelButton() {
  const button = document.querySelector('button[aria-haspopup="listbox"]');
  if (!(button instanceof HTMLButtonElement)) throw new Error("missing prompt label");
  return button;
}

function picker() {
  const panel = document.querySelector("[data-prompt-picker]");
  if (!(panel instanceof HTMLElement)) throw new Error("missing prompt picker");
  return panel;
}

function optionNamed(name: string) {
  const option = [...document.querySelectorAll('[role="option"]')].find((node) =>
    node.textContent?.includes(name)
  );
  if (!(option instanceof HTMLElement)) throw new Error(`missing option ${name}`);
  return option;
}

function press(key: string) {
  act(() => {
    picker().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
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

describe("prompt label picker", () => {
  it("opens from the label and returns focus when closed", () => {
    const mounted = mountPrompt();
    const label = labelButton();
    expect(label.getAttribute("aria-expanded")).toBe("false");
    expect(label.textContent).toContain("Prompt");
    expect(document.querySelector("button[aria-label='Choose a prompt']")).toBeNull();

    act(() => {
      label.click();
    });
    expect(label.getAttribute("aria-expanded")).toBe("true");
    expect(picker().contains(document.activeElement)).toBe(true);
    expect(optionNamed("Surprise me").getAttribute("aria-selected")).toBe("true");

    press("Escape");
    expect(label.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector("[data-prompt-picker]")).toBeNull();
    expect(document.activeElement).toBe(label);
    mounted.destroy();
  });

  it("marks the current prompt and replaces the block when another is chosen", () => {
    const mounted = mountPrompt();
    act(() => {
      labelButton().click();
    });
    const current = document.querySelector('[aria-label="Current prompt"]')?.closest('[role="option"]');
    expect(current?.textContent).toContain(CURRENT);

    act(() => {
      optionNamed(OTHER).click();
    });
    expect(mounted.editor.getJSON().content?.[0]).toMatchObject({
      type: "journalPrompt",
      attrs: { text: OTHER },
    });
    expect(document.activeElement).toBe(labelButton());
    mounted.destroy();
  });

  it("replaces the block text from Surprise me", () => {
    const mounted = mountPrompt();
    act(() => {
      labelButton().click();
    });
    press("Enter");
    expect(mounted.editor.getJSON().content?.[0]).toMatchObject({
      type: "journalPrompt",
      attrs: { text: OTHER },
    });
    mounted.destroy();
  });

  it("jumps to the footer with End and back to Surprise me with Home", () => {
    const mounted = mountPrompt();
    act(() => {
      labelButton().click();
    });
    press("End");
    expect(optionNamed("Add your own prompt").getAttribute("aria-selected")).toBe("true");
    press("ArrowDown");
    expect(optionNamed("Remove from entry").getAttribute("aria-selected")).toBe("true");
    press("Home");
    expect(optionNamed("Surprise me").getAttribute("aria-selected")).toBe("true");
    mounted.destroy();
  });

  it("removes the block from the entry and restores it with Undo", () => {
    const mounted = mountPrompt();
    act(() => {
      labelButton().click();
    });
    press("End");
    press("ArrowDown");
    expect(optionNamed("Remove from entry").getAttribute("aria-selected")).toBe("true");
    press(" ");

    const content = mounted.editor.getJSON().content ?? [];
    expect(content.some((node) => node.type === "journalPrompt")).toBe(false);
    expect(extractPlainText(mounted.editor.getJSON())).toContain("Kept writing");
    expect(mounted.editor.state.selection.$from.parent.textContent).toContain("Kept writing");
    expect(mounted.deleted).toEqual([]);
    expect(document.body.textContent).toContain("Prompt removed");

    const undo = [...document.querySelectorAll("button")].find((button) => button.textContent === "Undo");
    if (!(undo instanceof HTMLButtonElement)) throw new Error("missing undo");
    act(() => {
      undo.click();
    });
    expect(mounted.editor.getJSON().content?.[0]).toMatchObject({
      type: "journalPrompt",
      attrs: { text: CURRENT },
    });
    expect(extractPlainText(mounted.editor.getJSON())).toContain("Kept writing");
    expect(document.body.textContent).not.toContain("Prompt removed");
    mounted.destroy();
  });
});
