"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { placeFormatPill } from "@/lib/format-chrome";
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
  const [aaExpanded, setAaExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [, setFrame] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectionEmpty = editor.state.selection.empty;

  useEffect(() => {
    const refresh = () => {
      if (editor.state.selection.empty) setPanelOpen(false);
      else {
        setAaExpanded(false);
        setBlockOpen(false);
      }
      setFrame((frame) => frame + 1);
    };
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  useEffect(() => {
    if (!focused) return;
    const refresh = () => setFrame((frame) => frame + 1);
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    window.visualViewport?.addEventListener("resize", refresh);
    window.visualViewport?.addEventListener("scroll", refresh);
    return () => {
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("scroll", refresh);
    };
  }, [focused]);

  useEffect(() => {
    if (!focused) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
        setBlockOpen(false);
        setAaExpanded(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut =
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "f";
      if (shortcut) {
        event.preventDefault();
        if (editor.state.selection.empty) setAaExpanded(true);
        else setPanelOpen(true);
        rootRef.current?.querySelector<HTMLElement>("[data-format-focus]")?.focus();
        return;
      }
      if (event.key !== "Escape") return;
      if (!panelOpen && !aaExpanded && !blockOpen) return;
      event.preventDefault();
      setPanelOpen(false);
      setBlockOpen(false);
      setAaExpanded(false);
      editor.commands.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [focused, panelOpen, aaExpanded, blockOpen, editor]);

  if (!focused || suppressed) return null;

  const style = currentTextStyle(editor);

  if (!selectionEmpty) {
    const placement = selectionPlacement(editor, panelOpen);
    return (
      <div
        ref={rootRef}
        data-format-chrome={panelOpen ? "panel" : "pill"}
        className="fixed z-30 motion-safe:transition-opacity"
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

  return (
    <div
      ref={rootRef}
      data-format-chrome={aaExpanded ? "aa-expanded" : "aa"}
      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-end motion-safe:transition-opacity"
    >
      {aaExpanded ? (
        <div className="relative flex items-center">
          {blockOpen && (
            <div className="absolute right-0 bottom-full mb-2">
              <BlockTypeList
                editor={editor}
                style={style}
                onPick={() => setBlockOpen(false)}
              />
            </div>
          )}
          <div className={cn(surfaceClass, "flex items-center rounded-full p-1")}>
            <button
              type="button"
              data-format-focus
              aria-label="Block type"
              aria-expanded={blockOpen}
              onPointerDown={keepFocus}
              onClick={() => setBlockOpen((open) => !open)}
              className="flex size-11 cursor-pointer items-center justify-center gap-0.5 rounded-full text-sm"
            >
              ¶
              <ChevronDownIcon className="size-3.5 opacity-60" />
            </button>
            {MARKS.map((item) => (
              <MarkButton key={item.mark} editor={editor} {...item} />
            ))}
            <button
              type="button"
              aria-label="Close formatting"
              onPointerDown={keepFocus}
              onClick={() => {
                setAaExpanded(false);
                setBlockOpen(false);
                editor.commands.focus();
              }}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full text-[#8a847a]"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-format-focus
          aria-label="Formatting"
          aria-expanded={false}
          onPointerDown={keepFocus}
          onClick={() => setAaExpanded(true)}
          className={cn(
            surfaceClass,
            "flex size-11 cursor-pointer items-center justify-center rounded-full text-sm"
          )}
        >
          Aa
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
      <BlockTypeList
        editor={editor}
        style={style}
        onPick={onClose}
      />
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
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  try {
    const from = editor.view.coordsAtPos(editor.state.selection.from);
    const to = editor.view.coordsAtPos(editor.state.selection.to);
    return placeFormatPill({
      selectionTop: Math.min(from.top, to.top),
      selectionBottom: Math.max(from.bottom, to.bottom),
      selectionLeft: Math.min(from.left, to.left),
      viewportWidth: width,
      viewportHeight: height,
      pillWidth: panelOpen ? 208 : 112,
      pillHeight: panelOpen ? 0 : 44,
      panelHeight: panelOpen ? 320 : 0,
    });
  } catch {
    return { top: 8, left: 8, above: false };
  }
}
