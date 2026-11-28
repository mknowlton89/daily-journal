import { Editor } from "@tiptap/core";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";
import FormatChrome from "@/components/journal/FormatChrome";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({
  focused,
  onEditor,
}: {
  focused: boolean;
  onEditor: (editor: Editor) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ underline: false }), Underline],
    content: "<p>Hello journal text</p>",
    immediatelyRender: true,
    onCreate: ({ editor: created }) => onEditor(created),
  });
  useEffect(() => {
    if (editor) onEditor(editor);
  }, [editor, onEditor]);
  if (!editor) return null;
  return createElement(
    "div",
    { className: "relative" },
    createElement(EditorContent, { editor }),
    createElement(FormatChrome, { editor, focused })
  );
}

function mount(focused: boolean) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  let editor!: Editor;
  act(() => {
    root.render(
      createElement(Harness, {
        focused,
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
    destroy() {
      act(() => root.unmount());
      if (editor && !editor.isDestroyed) editor.destroy();
      host.remove();
    },
  };
}

function chrome() {
  return document.querySelector("[data-format-chrome]");
}

describe("FormatChrome", () => {
  it("renders nothing while the editor is unfocused", () => {
    const view = mount(false);
    act(() => {
      view.editor.commands.setTextSelection({ from: 1, to: 6 });
    });
    expect(chrome()).toBeNull();
    view.destroy();
  });

  it("shows the Format pill only while text is selected", () => {
    const view = mount(true);
    expect(chrome()).toBeNull();

    act(() => {
      view.editor.commands.setTextSelection({ from: 1, to: 6 });
    });
    expect(chrome()?.getAttribute("data-format-chrome")).toBe("pill");
    expect(chrome()?.textContent).toContain("Format");
    expect(document.body.textContent).not.toContain("Aa");

    act(() => {
      view.editor.commands.setTextSelection(1);
    });
    expect(chrome()).toBeNull();
    view.destroy();
  });

  it("applies inline and block commands without taking focus on pointer down", () => {
    const view = mount(true);
    act(() => {
      view.editor.commands.setTextSelection({ from: 1, to: 6 });
    });
    const format = document.querySelector('[aria-label="Formatting"]');
    if (!(format instanceof HTMLButtonElement)) throw new Error("missing Format");
    act(() => {
      format.click();
    });

    const bold = document.querySelector('[aria-label="Bold"]');
    if (!(bold instanceof HTMLButtonElement)) throw new Error("missing Bold");
    const pointer = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    bold.dispatchEvent(pointer);
    expect(pointer.defaultPrevented).toBe(true);

    for (const label of ["Bold", "Italic", "Underline", "Strikethrough"] as const) {
      const button = document.querySelector(`[aria-label="${label}"]`);
      if (!(button instanceof HTMLButtonElement)) throw new Error(`missing ${label}`);
      act(() => {
        button.click();
      });
    }
    expect(view.editor.isActive("bold")).toBe(true);
    expect(view.editor.isActive("italic")).toBe(true);
    expect(view.editor.isActive("underline")).toBe(true);
    expect(view.editor.isActive("strike")).toBe(true);

    const heading = Array.from(document.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent?.includes("Heading 1")
    );
    if (!(heading instanceof HTMLButtonElement)) throw new Error("missing heading");
    act(() => {
      heading.click();
    });
    expect(view.editor.isActive("heading", { level: 1 })).toBe(true);
    view.destroy();
  });
});
