"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { JSONContent, useEditor, EditorContent } from "@tiptap/react";
import Emoji from "@tiptap/extension-emoji";
import {
  BulletList,
  ListItem,
  OrderedList,
  TaskItem,
  TaskList,
} from "@tiptap/extension-list";
import Blockquote from "@tiptap/extension-blockquote";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EntryInterface } from "@/app/lib/types/Entry/entries";
import { postApi } from "@/lib/hooks/useApi";
import { mutate } from "swr";
import {
  SlashMenu,
  createSlashExtension,
  filterSlashCommands,
  readSlash,
  type SlashController,
  type SlashMatch,
} from "@/components/journal/slash-menu";
import { exitCodeBlock } from "@/components/journal/exit-code-block";
import {
  JournalPrompt,
  PromptEntryRemovalToast,
  insertPromptFromSlash,
} from "@/components/journal/journal-prompt";
import { PromptDeletedToast, PromptMenu } from "@/components/journal/prompt-menu";
import { EmptyEntryHint } from "@/components/journal/EmptyEntryHint";
import { usePromptLibrary } from "@/components/journal/use-prompt-library";
import { extractPlainText, type RichTextNode } from "@/lib/entry-text";
import FormatChrome from "@/components/journal/FormatChrome";
import { applyBlockStyle, currentTextStyle } from "@/components/journal/format-commands";
import { placePopover, revealCaret } from "@/lib/caret-anchor";
import { composerState, pickerEndIndex, pickerHomeIndex, pickerRows, promptPlaceholder, showEmptyEntryHint } from "@/lib/prompts";

export type EntryEditorHandle = {
  flush: () => Promise<void>;
};

type SavedInfo = {
  id: string;
  savedAt: number;
  content: JSONContent;
};

function revalidateEntryList() {
  return mutate(
    (key) =>
      typeof key === "string" &&
      (key === "/api/auth/entries" || key.startsWith("/api/auth/entries?")),
    undefined,
    { revalidate: true }
  );
}

type SlashMenuState = SlashMatch & {
  index: number;
  top: number;
  left: number;
  mode: "commands" | "prompts" | "compose";
  promptFilter: string;
};

function slashPosition(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  pos: number,
  mode: SlashMenuState["mode"],
  itemCount: number
) {
  if (mode !== "commands") return placePopover(editor.view, pos, 320, 280);
  return placePopover(editor.view, pos, 200, Math.max(itemCount, 1) * 48 + 8);
}

const EntryCard = forwardRef<
  EntryEditorHandle,
  {
    entryId: string | null;
    entryDate: string;
    content?: JSONContent;
    onSaved: (info: SavedInfo) => void;
  }
>(function EntryCard({ entryId, entryDate, content, onSaved }, ref) {
  const [, setUpdateTrigger] = useState(0);
  const prompts = usePromptLibrary();
  const promptApiRef = useRef(prompts.api);
  promptApiRef.current = prompts.api;
  const [draft, setDraft] = useState("");
  const [saveForLater, setSaveForLater] = useState(false);
  const [favoriteDraft, setFavoriteDraft] = useState(false);
  const draftRef = useRef(draft);
  const saveRef = useRef(saveForLater);
  const favoriteRef = useRef(favoriteDraft);
  draftRef.current = draft;
  saveRef.current = saveForLater;
  favoriteRef.current = favoriteDraft;
  const [editorFocused, setEditorFocused] = useState(false);
  const entryIdRef = useRef(entryId);
  const onSavedRef = useRef(onSaved);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const slashMenuRef = useRef<SlashMenuState | null>(null);
  const dismissedSlashRef = useRef<number | null>(null);
  const slashControllerRef = useRef<SlashController>({
    onEnter: () => false,
    onArrow: () => false,
    onEscape: () => false,
    onBackspace: () => false,
    onText: () => false,
    onHome: () => false,
    onEnd: () => false,
  });
  const slashExtension = useRef(createSlashExtension(slashControllerRef)).current;

  useEffect(() => {
    entryIdRef.current = entryId;
  }, [entryId]);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const enqueueSave = () => {
    const run = async () => {
      const editorInstance = editorRef.current;
      if (!editorInstance) return;
      const savingRevision = revisionRef.current;
      if (savingRevision === savedRevisionRef.current) return;

      const doc = editorInstance.getJSON();
      try {
        let id = entryIdRef.current;
        if (!id) {
          const created = await postApi<EntryInterface>("/api/auth/entries", {
            entryDate,
            content: doc,
          });
          id = created.data.id;
          entryIdRef.current = id;
        } else {
          const res = await fetch(`/api/auth/entries/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: doc }),
          });
          if (!res.ok) throw new Error("Failed to save entry");
        }

        if (savedRevisionRef.current < savingRevision) {
          savedRevisionRef.current = savingRevision;
        }
        onSavedRef.current({ id, savedAt: Date.now(), content: doc });
        void revalidateEntryList();
      } catch (error) {
        console.error("Failed to save entry:", error);
      }
    };

    queueRef.current = queueRef.current.then(run, run);
    return queueRef.current;
  };

  const scheduleSave = () => {
    revisionRef.current += 1;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void enqueueSave();
    }, 800);
  };

  const scheduleRef = useRef(scheduleSave);
  scheduleRef.current = scheduleSave;

  const syncSlash = (current: NonNullable<ReturnType<typeof useEditor>>) => {
    let match: SlashMatch | null = null;
    try {
      match = readSlash(current);
    } catch {
      match = null;
    }

    if (dismissedSlashRef.current != null) {
      if (!match || match.from !== dismissedSlashRef.current) {
        dismissedSlashRef.current = null;
      } else {
        slashMenuRef.current = null;
        setSlashMenu((prev) => (prev === null ? prev : null));
        return;
      }
    }

    if (!match) {
      slashMenuRef.current = null;
      setSlashMenu((prev) => (prev === null ? prev : null));
      return;
    }

    const previous = slashMenuRef.current;
    const mode =
      previous && previous.from === match.from && previous.mode !== "commands"
        ? previous.mode
        : "commands";
    let position = { top: 8, left: 8 };
    try {
      const count =
        mode === "commands" ? filterSlashCommands(match.query).length : 1;
      position = slashPosition(current, match.to, mode, count);
    } catch {
      position = { top: 8, left: 8 };
    }
    if (previous && previous.from === match.from && previous.mode !== "commands") {
      const next = { ...previous, to: match.to, ...position };
      if (
        previous.to === next.to &&
        previous.top === next.top &&
        previous.left === next.left
      ) {
        return;
      }
      slashMenuRef.current = next;
      setSlashMenu(next);
      return;
    }

    let index = 0;
    if (previous && previous.from === match.from && previous.query === match.query) {
      index = previous.index;
    }
    const items = filterSlashCommands(match.query);
    if (items.length) index = Math.min(index, items.length - 1);

    const next: SlashMenuState = {
      ...match,
      index,
      ...position,
      mode: "commands",
      promptFilter: "",
    };
    if (
      previous &&
      previous.query === next.query &&
      previous.from === next.from &&
      previous.to === next.to &&
      previous.index === next.index &&
      previous.top === next.top &&
      previous.left === next.left
    ) {
      return;
    }
    slashMenuRef.current = next;
    setSlashMenu(next);
  };

  const syncSlashRef = useRef(syncSlash);
  syncSlashRef.current = syncSlash;

  useImperativeHandle(ref, () => ({
    flush: async () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      await enqueueSave();
    },
  }));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        underline: false,
      }),
      ListItem,
      BulletList,
      OrderedList,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Emoji,
      Blockquote,
      Underline,
      Placeholder.configure({
        placeholder: ({ node, editor: current }) =>
          promptPlaceholder({
            nodeName: node.type.name,
            entryIsEmpty: !extractPlainText(current.getJSON() as RichTextNode),
          }),
        showOnlyCurrent: true,
      }),
      JournalPrompt,
      slashExtension,
      exitCodeBlock,
    ],
    autofocus: "end",
    immediatelyRender: true,
    editorProps: {
      handleScrollToSelection(view) {
        revealCaret(view);
        return true;
      },
    },
    onUpdate: () => {
      scheduleRef.current();
    },
    onTransaction: ({ editor: current }) => {
      setUpdateTrigger((prev) => prev + 1);
      syncSlashRef.current(current);
    },
    content: content ?? undefined,
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => revealCaret(editor.view);
    editor.on("focus", refresh);
    window.visualViewport?.addEventListener("resize", refresh);
    return () => {
      editor.off("focus", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
      document.documentElement.style.removeProperty("--keyboard-overlap");
    };
  }, [editor]);

  if (editor) prompts.bindEditor(editor);

  useEffect(() => {
    if (!editor || !content || revisionRef.current !== 0) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  useEffect(() => {
    if (!editor) return;
    const syncFocus = () => {
      const dom = editor.view.dom;
      const domFocused =
        document.activeElement === dom || dom.contains(document.activeElement);
      setEditorFocused(editor.isFocused || domFocused);
    };
    editor.on("focus", syncFocus);
    editor.on("blur", syncFocus);
    document.addEventListener("focusin", syncFocus);
    document.addEventListener("focusout", syncFocus);
    queueMicrotask(syncFocus);
    return () => {
      editor.off("focus", syncFocus);
      editor.off("blur", syncFocus);
      document.removeEventListener("focusin", syncFocus);
      document.removeEventListener("focusout", syncFocus);
    };
  }, [editor]);

  const handleTextStyleChange = (value: string) => {
    if (!editor) return;
    applyBlockStyle(editor, value);
  };

  const applySlash = (match: SlashMatch, value: string) => {
    if (!editor) return;
    if (value === "prompt") {
      const current = slashMenuRef.current;
      const next: SlashMenuState = {
        ...match,
        index: 0,
        top: current?.top ?? 8,
        left: current?.left ?? 8,
        mode: "prompts",
        promptFilter: "",
      };
      slashMenuRef.current = next;
      setSlashMenu(next);
      return;
    }
    dismissedSlashRef.current = null;
    slashMenuRef.current = null;
    setSlashMenu(null);
    editor.chain().focus().deleteRange({ from: match.from, to: match.to }).run();
    handleTextStyleChange(value);
  };

  const closeSlash = () => {
    dismissedSlashRef.current = slashMenuRef.current?.from ?? null;
    slashMenuRef.current = null;
    setSlashMenu(null);
    setDraft("");
    setSaveForLater(false);
    setFavoriteDraft(false);
  };

  const insertPromptText = (text: string) => {
    const match = slashMenuRef.current;
    if (!editor || !match || !text) return;
    insertPromptFromSlash(editor, match, text);
    closeSlash();
  };

  const submitPromptDraft = () => {
    const state = composerState({
      text: draftRef.current,
      saveForLater: saveRef.current,
      favorite: favoriteRef.current,
    });
    if (!state.canInsert) return;
    if (state.saveForLater) {
      promptApiRef.current.addSaved(state.trimmed, state.favorite);
    }
    insertPromptText(state.trimmed);
  };

  const activatePromptRow = () => {
    const menu = slashMenuRef.current;
    if (!menu) return;
    const rows = pickerRows(promptApiRef.current.getLibrary(), menu.promptFilter).rows;
    const row = rows[Math.min(menu.index, Math.max(rows.length - 1, 0))];
    if (!row) return;
    if (row.kind === "surprise") {
      insertPromptText(promptApiRef.current.random());
      return;
    }
    if (row.kind === "prompt") {
      insertPromptText(row.prompt.text);
      return;
    }
    setDraft("");
    setSaveForLater(false);
    setFavoriteDraft(false);
    const next = { ...menu, mode: "compose" as const };
    slashMenuRef.current = next;
    setSlashMenu(next);
  };

  const activeSlash = () => {
    if (!editor) return null;
    const match = readSlash(editor);
    if (!match || dismissedSlashRef.current === match.from) return null;
    return match;
  };

  const movePromptPicker = (edge: "home" | "end") => {
    const menu = slashMenuRef.current;
    if (!menu || menu.mode !== "prompts") return false;
    const rows = pickerRows(promptApiRef.current.getLibrary(), menu.promptFilter).rows;
    const index = edge === "home" ? pickerHomeIndex(rows) : pickerEndIndex(rows);
    const next = { ...menu, index };
    slashMenuRef.current = next;
    setSlashMenu(next);
    return true;
  };

  slashControllerRef.current = {
    onEnter: () => {
      const menu = slashMenuRef.current;
      if (menu?.mode === "compose") {
        submitPromptDraft();
        return true;
      }
      if (menu?.mode === "prompts") {
        activatePromptRow();
        return true;
      }
      const match = activeSlash();
      if (!match) return false;
      const items = filterSlashCommands(match.query);
      if (!items.length) return false;
      const highlighted =
        menu && menu.from === match.from ? menu.index : 0;
      applySlash(match, items[Math.min(highlighted, items.length - 1)].value);
      return true;
    },
    onArrow: (delta) => {
      const menu = slashMenuRef.current;
      const match = activeSlash();
      if (!match || !menu) return false;
      const count =
        menu.mode === "commands"
          ? filterSlashCommands(match.query).length
          : pickerRows(promptApiRef.current.getLibrary(), menu.promptFilter).rows.length;
      if (!count) return false;
      const index = (menu.index + delta + count) % count;
      const next = { ...menu, ...match, index };
      slashMenuRef.current = next;
      setSlashMenu(next);
      return true;
    },
    onEscape: () => {
      const menu = slashMenuRef.current;
      if (menu?.mode === "compose") {
        const next = { ...menu, mode: "prompts" as const };
        slashMenuRef.current = next;
        setSlashMenu(next);
        setDraft("");
        return true;
      }
      if (menu?.mode === "prompts") {
        const next = { ...menu, mode: "commands" as const, index: 0, promptFilter: "" };
        slashMenuRef.current = next;
        setSlashMenu(next);
        return true;
      }
      const match = activeSlash();
      if (!match) return false;
      dismissedSlashRef.current = match.from;
      slashMenuRef.current = null;
      setSlashMenu(null);
      return true;
    },
    onBackspace: () => {
      const menu = slashMenuRef.current;
      if (!menu || menu.mode === "commands") return false;
      if (menu.mode === "compose") {
        setDraft((value) => value.slice(0, -1));
        return true;
      }
      if (!menu.promptFilter) {
        const next = { ...menu, mode: "commands" as const, index: 0 };
        slashMenuRef.current = next;
        setSlashMenu(next);
        return true;
      }
      const next = { ...menu, promptFilter: menu.promptFilter.slice(0, -1) };
      slashMenuRef.current = next;
      setSlashMenu(next);
      return true;
    },
    onText: (text) => {
      const menu = slashMenuRef.current;
      if (!menu || menu.mode === "commands") return false;
      if (menu.mode === "compose") {
        setDraft((value) => value + text);
        return true;
      }
      if (text === " ") {
        const rows = pickerRows(promptApiRef.current.getLibrary(), menu.promptFilter).rows;
        if (rows[menu.index]?.kind === "add") {
          activatePromptRow();
          return true;
        }
      }
      const promptFilter = menu.promptFilter + text;
      const rows = pickerRows(promptApiRef.current.getLibrary(), promptFilter).rows;
      const matchIndex = rows.findIndex((row) => row.kind === "prompt");
      const next = {
        ...menu,
        promptFilter,
        index: promptFilter.trim() && matchIndex >= 0 ? matchIndex : 0,
      };
      slashMenuRef.current = next;
      setSlashMenu(next);
      return true;
    },
    onHome: () => movePromptPicker("home"),
    onEnd: () => movePromptPicker("end"),
  };

  if (!editor) return null;

  const promptPicker =
    slashMenu && slashMenu.mode !== "commands"
      ? pickerRows(prompts.library, slashMenu.promptFilter)
      : null;

  return (
    <div className="journal-editor relative">
      <EditorContent editor={editor} />
      {showEmptyEntryHint(
        !extractPlainText(editor.getJSON() as RichTextNode),
        currentTextStyle(editor)
      ) && <EmptyEntryHint editor={editor} />}
      {slashMenu?.mode === "commands" && (
        <SlashMenu
          query={slashMenu.query}
          index={slashMenu.index}
          top={slashMenu.top}
          left={slashMenu.left}
          onHover={(index) => {
            const next = slashMenuRef.current
              ? { ...slashMenuRef.current, index }
              : null;
            slashMenuRef.current = next;
            setSlashMenu(next);
          }}
          onSelect={(value) => {
            const match = slashMenuRef.current;
            if (match) applySlash(match, value);
          }}
        />
      )}
      {slashMenu && promptPicker && (
        <div
          className="absolute z-40"
          style={{ top: slashMenu.top, left: slashMenu.left }}
        >
          <PromptMenu
            label="Insert a writing prompt"
            rows={promptPicker.rows}
            favorites={promptPicker.favorites}
            rest={promptPicker.rest}
            index={slashMenu.index}
            showSurprise
            composing={slashMenu.mode === "compose"}
            draft={draft}
            saveForLater={saveForLater}
            favorite={favoriteDraft}
            onHover={(index) => {
              const next = slashMenuRef.current
                ? { ...slashMenuRef.current, index }
                : null;
              slashMenuRef.current = next;
              setSlashMenu(next);
            }}
            onActivate={(index) => {
              const next = slashMenuRef.current
                ? { ...slashMenuRef.current, index }
                : null;
              slashMenuRef.current = next;
              if (next) setSlashMenu(next);
              activatePromptRow();
            }}
            onToggleFavorite={(id) => prompts.api.toggleFavorite(id)}
            onDelete={(id) => prompts.api.deletePrompt(id)}
            onDraftChange={setDraft}
            onSaveForLater={(value) => {
              setSaveForLater(value);
              if (!value) setFavoriteDraft(false);
            }}
            onFavoriteChange={setFavoriteDraft}
            onCancelCompose={() => {
              const next = slashMenuRef.current
                ? { ...slashMenuRef.current, mode: "prompts" as const }
                : null;
              slashMenuRef.current = next;
              setSlashMenu(next);
              setDraft("");
            }}
            onSubmitCompose={submitPromptDraft}
          />
        </div>
      )}
      {prompts.deletion && <PromptDeletedToast onUndo={prompts.undo} />}
      <PromptEntryRemovalToast className={prompts.deletion ? "bottom-40" : undefined} />
      <FormatChrome
        editor={editor}
        focused={editorFocused}
        suppressed={slashMenu !== null}
      />
    </div>
  );
});

export default EntryCard;
