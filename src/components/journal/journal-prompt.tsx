"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { ChevronDown } from "lucide-react";
import { PromptDeletedToast, PromptMenu } from "@/components/journal/prompt-menu";
import { getPromptLibraryApi } from "@/components/journal/use-prompt-library";
import { cn } from "@/lib/utils";
import {
  blockPickerRows,
  composerState,
  emptyLibrary,
  pickerEndIndex,
  pickerHomeIndex,
  randomPrompt,
  type PickerRow,
} from "@/lib/prompts";

export const JOURNAL_PROMPT = "journalPrompt";

export function insertPromptFromSlash(
  editor: Editor,
  match: { from: number; to: number },
  text: string
) {
  const $from = editor.state.doc.resolve(match.from);
  const parent = $from.parent;
  const slashText = editor.state.doc.textBetween(match.from, match.to, "\n", "\ufffc");
  const replacesParagraph =
    parent.type.name === "paragraph" && parent.textContent === slashText;
  const range = replacesParagraph
    ? { from: $from.before(), to: $from.after() }
    : { from: match.from, to: match.to };

  const inserted = editor
    .chain()
    .focus()
    .insertContentAt(range, [
      { type: JOURNAL_PROMPT, attrs: { text } },
      { type: "paragraph" },
    ])
    .run();

  if (!inserted) return false;

  let seenPrompt = false;
  let paragraphPos = -1;
  editor.state.doc.descendants((node, pos) => {
    if (paragraphPos !== -1) return false;
    if (
      !seenPrompt &&
      node.type.name === JOURNAL_PROMPT &&
      node.attrs.text === text &&
      pos >= range.from - 1
    ) {
      seenPrompt = true;
      return false;
    }
    if (seenPrompt && node.type.name === "paragraph") {
      paragraphPos = pos + 1;
      return false;
    }
  });
  if (paragraphPos > 0) {
    editor.commands.setTextSelection(paragraphPos);
  }
  return true;
}

export const JournalPrompt = Node.create({
  name: JOURNAL_PROMPT,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      text: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-prompt") ?? "",
        renderHTML: (attributes: { text?: string }) => ({
          "data-prompt": attributes.text ?? "",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-journal-prompt]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { "data-journal-prompt": "" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(JournalPromptView);
  },
});

function JournalPromptView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const text = String(node.attrs.text ?? "");
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [filter, setFilter] = useState("");
  const [index, setIndex] = useState(0);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveForLater, setSaveForLater] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [, setTick] = useState(0);
  const labelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = getPromptLibraryApi(editor);
    if (!api) return;
    return api.subscribe(() => setTick((value) => value + 1));
  }, [editor]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (panelRef.current?.contains(target) || labelRef.current?.contains(target)) return;
      setOpen(false);
      setComposing(false);
      setFilter("");
      labelRef.current?.focus();
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open && !composing) panelRef.current?.focus();
  }, [open, composing]);

  const library = getPromptLibraryApi(editor)?.getLibrary() ?? emptyLibrary();
  const picked = blockPickerRows(library, filter);

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !labelRef.current) return;
    const label = labelRef.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - label.bottom;
    const spaceAbove = label.top;
    const needed = panel.height + 8;
    setAbove(spaceBelow < needed && spaceAbove > spaceBelow);
  }, [open, composing, filter, picked.rows.length]);

  const closePicker = () => {
    setOpen(false);
    setComposing(false);
    setFilter("");
    setAbove(false);
    labelRef.current?.focus();
  };

  const openPicker = () => {
    setComposing(false);
    setFilter("");
    setIndex(0);
    setAbove(false);
    setOpen(true);
  };

  const activate = (rowIndex: number) => {
    const row = picked.rows[rowIndex];
    if (!row) return;
    if (row.kind === "surprise") {
      const next =
        getPromptLibraryApi(editor)?.random(text) ??
        randomPrompt(emptyLibrary(), { excluding: text });
      if (next) updateAttributes({ text: next });
      closePicker();
      return;
    }
    if (row.kind === "add") {
      setComposing(true);
      setDraft("");
      setSaveForLater(false);
      setFavorite(false);
      return;
    }
    if (row.kind === "remove") {
      const pos = getPos();
      setOpen(false);
      if (typeof pos === "number") {
        removePromptFromEntry(editor, pos, node.nodeSize, text);
      }
      return;
    }
    updateAttributes({ text: row.prompt.text });
    closePicker();
  };

  const submit = () => {
    const state = composerState({ text: draft, saveForLater, favorite });
    if (!state.canInsert) return;
    if (state.saveForLater) {
      getPromptLibraryApi(editor)?.addSaved(state.trimmed, state.favorite);
    }
    updateAttributes({ text: state.trimmed });
    closePicker();
  };

  const onPickerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (composing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setIndex((value) => (value + delta + picked.rows.length) % picked.rows.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setIndex(pickerHomeIndex(picked.rows));
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setIndex(pickerEndIndex(picked.rows));
      return;
    }
    if (event.key === "Enter" || (event.key === " " && isFooterRow(picked.rows[index]))) {
      event.preventDefault();
      activate(index);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = filter.slice(0, -1);
      setFilter(next);
      setIndex(highlightForFilter(blockPickerRows(library, next).rows, next));
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      const next = filter + event.key;
      setFilter(next);
      setIndex(highlightForFilter(blockPickerRows(library, next).rows, next));
    }
  };

  return (
    <NodeViewWrapper
      as="aside"
      data-journal-prompt=""
      className="journal-prompt my-4 border-l-2 border-[#9a7340] py-1 pl-4 leading-none dark:border-[#d4b483]"
    >
      <div className="relative flex w-fit">
        <button
          ref={labelRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={() => {
            if (open) closePicker();
            else openPicker();
          }}
          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium uppercase leading-none tracking-[0.16em] text-[#9a7340] focus-visible:outline-none dark:text-[#d4b483]"
        >
          Prompt
          <ChevronDown
            className={cn("size-3 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {open && (
          <div
            ref={panelRef}
            data-prompt-picker=""
            tabIndex={-1}
            className={cn(
              "absolute left-0 z-40 w-80 outline-none",
              above ? "bottom-full mb-1" : "top-full mt-1"
            )}
            onKeyDown={onPickerKeyDown}
          >
            <PromptMenu
              label="Choose a prompt"
              rows={picked.rows}
              favorites={picked.favorites}
              rest={picked.rest}
              index={index}
              currentText={text}
              showSurprise
              composing={composing}
              draft={draft}
              saveForLater={saveForLater}
              favorite={favorite}
              onHover={setIndex}
              onActivate={activate}
              onToggleFavorite={(id) => getPromptLibraryApi(editor)?.toggleFavorite(id)}
              onDelete={(id) => getPromptLibraryApi(editor)?.deletePrompt(id)}
              onDraftChange={setDraft}
              onSaveForLater={(value) => {
                setSaveForLater(value);
                if (!value) setFavorite(false);
              }}
              onFavoriteChange={setFavorite}
              onCancelCompose={() => setComposing(false)}
              onSubmitCompose={submit}
            />
          </div>
        )}
      </div>
      <p className="font-journal text-[1.05rem] italic leading-tight text-[#8a847a]">
        {text}
      </p>
    </NodeViewWrapper>
  );
}

function isFooterRow(row: PickerRow | undefined) {
  return row?.kind === "add" || row?.kind === "remove";
}

function highlightForFilter(rows: PickerRow[], filter: string) {
  if (!filter.trim()) return pickerHomeIndex(rows);
  const match = rows.findIndex((row) => row.kind === "prompt");
  return match >= 0 ? match : pickerHomeIndex(rows);
}

type PromptEntryRemoval = {
  editor: Editor;
  pos: number;
  text: string;
};

let entryRemoval: PromptEntryRemoval | null = null;
const removalListeners = new Set<() => void>();
let removalTimer: number | undefined;

function emitRemoval() {
  removalListeners.forEach((listener) => listener());
}

function clearRemoval() {
  window.clearTimeout(removalTimer);
  entryRemoval = null;
  emitRemoval();
}

export function subscribePromptEntryRemoval(listener: () => void) {
  removalListeners.add(listener);
  return () => removalListeners.delete(listener);
}

export function getPromptEntryRemoval() {
  return entryRemoval;
}

export function removePromptFromEntry(
  editor: Editor,
  pos: number,
  nodeSize: number,
  text: string
) {
  const tr = editor.state.tr.delete(pos, pos + nodeSize);
  const at = Math.max(0, Math.min(pos, tr.doc.content.size));
  tr.setSelection(TextSelection.near(tr.doc.resolve(at), 1));
  editor.view.dispatch(tr);
  window.clearTimeout(removalTimer);
  entryRemoval = { editor, pos, text };
  emitRemoval();
  removalTimer = window.setTimeout(() => {
    entryRemoval = null;
    emitRemoval();
  }, 6000);
}

export function undoPromptEntryRemoval() {
  const current = entryRemoval;
  clearRemoval();
  if (!current || current.editor.isDestroyed) return;
  const at = Math.max(0, Math.min(current.pos, current.editor.state.doc.content.size));
  current.editor
    .chain()
    .insertContentAt(at, { type: JOURNAL_PROMPT, attrs: { text: current.text } })
    .run();
}

export function PromptEntryRemovalToast({ className }: { className?: string }) {
  const removal = useSyncExternalStore(
    subscribePromptEntryRemoval,
    getPromptEntryRemoval,
    () => null
  );
  if (!removal) return null;
  return (
    <PromptDeletedToast
      message="Prompt removed"
      onUndo={undoPromptEntryRemoval}
      className={className}
    />
  );
}
