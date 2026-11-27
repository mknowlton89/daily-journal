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
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
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

const TEXT_STYLES = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "blockquote", label: "Blockquote" },
  { value: "taskList", label: "Task List" },
  { value: "orderedList", label: "Ordered List" },
  { value: "bulletList", label: "Bullet List" },
  { value: "codeBlock", label: "Code Block" },
] as const;

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
  itemCount: number
) {
  const coords = editor.view.coordsAtPos(pos);
  const menuHeight = Math.max(itemCount, 1) * 34 + 12;
  const left = Math.max(8, Math.min(coords.left, window.innerWidth - 196));
  const spaceBelow = window.innerHeight - coords.bottom;
  if (spaceBelow < menuHeight + 80) {
    return { top: Math.max(8, coords.top - menuHeight - 8), left };
  }
  return { top: coords.bottom + 8, left };
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
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!styleMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!styleMenuRef.current?.contains(event.target as Node)) {
        setStyleMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStyleMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [styleMenuOpen]);

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
    let position = { top: 8, left: 8 };
    try {
      position = slashPosition(current, match.to, 6);
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

  if (editor) prompts.bindEditor(editor);

  useEffect(() => {
    if (!editor || !content || revisionRef.current !== 0) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  const getCurrentTextStyle = () => {
    if (!editor) return "paragraph";
    if (editor.isActive("codeBlock")) return "codeBlock";
    if (editor.isActive("blockquote")) return "blockquote";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    if (editor.isActive("orderedList")) return "orderedList";
    if (editor.isActive("bulletList")) return "bulletList";
    if (editor.isActive("taskList")) return "taskList";
    return "paragraph";
  };

  const handleTextStyleChange = (value: string) => {
    if (!editor) return;

    let chain = editor.chain().focus();
    const inTask = editor.isActive("taskItem");
    const inList = editor.isActive("listItem");

    if (value !== "taskList" && inTask) chain = chain.liftListItem("taskItem");
    if (value !== "bulletList" && value !== "orderedList" && inList) {
      chain = chain.liftListItem("listItem");
    }
    if (value === "taskList" && inList) chain = chain.liftListItem("listItem");
    if (value !== "blockquote" && editor.isActive("blockquote")) {
      chain = chain.toggleBlockquote();
    }
    if (value !== "codeBlock" && editor.isActive("codeBlock")) {
      chain = chain.toggleCodeBlock();
    }

    if (value === "paragraph") {
      chain = chain.setParagraph();
    } else if (value === "blockquote") {
      chain = chain.toggleBlockquote();
    } else if (value === "codeBlock") {
      chain = chain.toggleCodeBlock();
    } else if (value === "orderedList") {
      if (!editor.isActive("orderedList")) chain = chain.toggleOrderedList();
    } else if (value === "bulletList") {
      if (!editor.isActive("bulletList")) chain = chain.toggleBulletList();
    } else if (value === "taskList") {
      if (!inTask) chain = chain.toggleTaskList();
    } else {
      const level = parseInt(value.replace("h", ""), 10) as 1 | 2 | 3;
      chain = chain.setHeading({ level });
    }

    chain.run();
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
    <div className="journal-editor relative pb-28">
      <EditorContent editor={editor} />
      {showEmptyEntryHint(
        !extractPlainText(editor.getJSON() as RichTextNode),
        getCurrentTextStyle()
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
          className="fixed z-40"
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
      <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-black/5 bg-white px-1.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#2a2a28]">
        <div ref={styleMenuRef} className="relative">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setStyleMenuOpen((open) => !open)}
            className="flex h-8 cursor-pointer items-center gap-2 px-3 text-sm"
          >
            {TEXT_STYLES.find((style) => style.value === getCurrentTextStyle())
              ?.label ?? "Paragraph"}
            <ChevronDownIcon className="size-4 opacity-50" />
          </button>
          {styleMenuOpen && (
            <div className="absolute bottom-full left-0 z-40 mb-2 min-w-40 rounded-md border border-black/10 bg-white p-1 shadow-md dark:border-white/10 dark:bg-[#2a2a28]">
              {TEXT_STYLES.map((style) => {
                const active = style.value === getCurrentTextStyle();
                return (
                  <button
                    key={style.value}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      handleTextStyleChange(style.value);
                      setStyleMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10",
                      active && "bg-black/5 dark:bg-white/10"
                    )}
                  >
                    {style.label}
                    {active && <CheckIcon className="size-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <span className="mx-1 h-4 w-px bg-black/10 dark:bg-white/15" />
        <FormatButton
          label="B"
          active={editor.isActive("bold")}
          className="font-semibold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <FormatButton
          label="I"
          active={editor.isActive("italic")}
          className="italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <FormatButton
          label="U"
          active={editor.isActive("underline")}
          className="underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <FormatButton
          label="S"
          active={editor.isActive("strike")}
          className="line-through"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
      </div>
    </div>
  );
});

function FormatButton({
  label,
  active,
  className,
  onClick,
}: {
  label: string;
  active: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "cursor-pointer px-2 text-sm",
        active ? "text-inherit" : "text-[#8a847a]",
        className
      )}
    >
      {label}
    </button>
  );
}

export default EntryCard;
