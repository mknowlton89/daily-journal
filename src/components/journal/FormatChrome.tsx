"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { placePopover } from "@/lib/caret-anchor";
import { cn } from "@/lib/utils";
import {
  TEXT_STYLES,
  applyBlockStyle,
  currentTextStyle,
  toggleInlineStyle,
} from "./format-commands";

const MARKS = [
  { mark: "bold", label: "Bold", glyph: "B", className: "font-semibold" },
  { mark: "italic", label: "Italic", glyph: "I", className: "italic" },
  { mark: "underline", label: "Underline", glyph: "U", className: "underline" },
  { mark: "strike", label: "Strikethrough", glyph: "S", className: "line-through" },
] as const;

const surfaceClass =
  "border border-black/10 bg-white text-[#1c1916] shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#2a2a28] dark:text-[#f3efe6]";

function keepFocus(event: { preventDefault: () => void }) {
  event.preventDefault();
}

export default function FormatChrome({
  editor,
  focused,
  suppressed = false,
}: {
  editor: Editor;
  focused: boolean;
  suppressed?: boolean;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [, setFrame] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectionEmpty = editor.state.selection.empty;

  useEffect(() => {
    const refresh = () => {
      if (editor.state.selection.empty) setPanelOpen(false);
      setFrame((frame) => frame + 1);
    };
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    window.visualViewport?.addEventListener("resize", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
    };
  }, [editor]);

  useEffect(() => {
    if (!focused) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanelOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut =
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "f";
      if (shortcut && !editor.state.selection.empty) {
        event.preventDefault();
        setPanelOpen(true);
        return;
      }
      if (event.key !== "Escape" || !panelOpen) return;
      event.preventDefault();
      setPanelOpen(false);
      editor.commands.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [focused, panelOpen, editor]);

  if (!focused || suppressed || selectionEmpty) return null;

  const style = currentTextStyle(editor);
  const placement = selectionPlacement(editor, panelOpen);

  return (
    <div
      ref={rootRef}
      data-format-chrome={panelOpen ? "panel" : "pill"}
      className="absolute z-30"
      style={{ top: placement.top, left: placement.left }}
    >
      {panelOpen ? (
        <FormatPanel
          editor={editor}
          style={style}
          onClose={() => {
            setPanelOpen(false);
            editor.commands.focus();
          }}
        />
      ) : (
        <button
          type="button"
          data-format-focus
          aria-label="Formatting"
          aria-expanded={false}
          onPointerDown={keepFocus}
          onClick={() => setPanelOpen(true)}
          className={cn(
            surfaceClass,
            "flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-3 text-sm"
          )}
        >
          Format
          <ChevronDownIcon className="size-4 opacity-60" />
        </button>
      )}
    </div>
  );
}

function FormatPanel({
  editor,
  style,
  onClose,
}: {
  editor: Editor;
  style: string;
  onClose: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Formatting"
      className={cn(surfaceClass, "w-52 rounded-xl p-1")}
    >
      <BlockTypeList editor={editor} style={style} onPick={onClose} />
      <div className="mx-2 my-1 h-px bg-black/10 dark:bg-white/15" />
      <div className="flex items-center justify-between px-1">
        {MARKS.map((item) => (
          <MarkButton key={item.mark} editor={editor} {...item} />
        ))}
      </div>
    </div>
  );
}

function BlockTypeList({
  editor,
  style,
  onPick,
}: {
  editor: Editor;
  style: string;
  onPick: () => void;
}) {
  return (
    <div role="listbox" aria-label="Block type" className="max-h-72 overflow-auto">
      {TEXT_STYLES.map((item) => {
        const selected = item.value === style;
        return (
          <button
            key={item.value}
            type="button"
            role="option"
            aria-selected={selected}
            onPointerDown={keepFocus}
            onClick={() => {
              applyBlockStyle(editor, item.value);
              onPick();
            }}
            className={cn(
              "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10",
              selected && "bg-black/5 dark:bg-white/10"
            )}
          >
            <CheckIcon className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function MarkButton({
  editor,
  mark,
  label,
  glyph,
  className,
}: {
  editor: Editor;
  mark: (typeof MARKS)[number]["mark"];
  label: string;
  glyph: string;
  className: string;
}) {
  const pressed = editor.isActive(mark);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onPointerDown={keepFocus}
      onClick={() => toggleInlineStyle(editor, mark)}
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-full text-sm",
        pressed ? "text-inherit" : "text-[#8a847a]",
        className
      )}
    >
      {glyph}
    </button>
  );
}

function selectionPlacement(editor: Editor, panelOpen: boolean) {
  try {
    const start = editor.view.coordsAtPos(editor.state.selection.from);
    const end = editor.view.coordsAtPos(editor.state.selection.to);
    return placePopover(
      {
        dom: editor.view.dom,
        coordsAtPos: () => ({
          top: Math.min(start.top, end.top),
          bottom: Math.max(start.bottom, end.bottom),
          left: Math.min(start.left, end.left),
        }),
      },
      0,
      panelOpen ? 208 : 112,
      panelOpen ? 280 : 44
    );
  } catch {
    return { top: 8, left: 8 };
  }
}
