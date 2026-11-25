"use client";

import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

export type SlashCommand = {
  value: string;
  label: string;
  keywords: string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { value: "paragraph", label: "Paragraph", keywords: "p text" },
  { value: "h1", label: "Heading 1", keywords: "h1 heading title" },
  { value: "h2", label: "Heading 2", keywords: "h2 heading" },
  { value: "h3", label: "Heading 3", keywords: "h3 heading" },
  { value: "blockquote", label: "Blockquote", keywords: "quote blockquote" },
  { value: "taskList", label: "Task List", keywords: "task todo checkbox list" },
  { value: "orderedList", label: "Ordered List", keywords: "ordered numbered list ol" },
  { value: "bulletList", label: "Bullet List", keywords: "bullet list ul" },
  { value: "codeBlock", label: "Code Block", keywords: "code codeblock" },
];

export type SlashMatch = {
  query: string;
  from: number;
  to: number;
};

export function filterSlashCommands(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((command) => {
    const haystack = `${command.label} ${command.keywords} ${command.value}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function readSlash(editor: Editor): SlashMatch | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const $from = selection.$from;
  if (!$from.parent.isTextblock || $from.parent.type.spec.code) return null;

  const before = $from.parent.textBetween(0, $from.parentOffset, "\n", "\ufffc");
  const match = /(?:^|\s)\/(\S*)$/.exec(before);
  if (!match) return null;

  const query = match[1] ?? "";
  return {
    query,
    from: $from.pos - query.length - 1,
    to: $from.pos,
  };
}

export type SlashController = {
  onEnter: () => boolean;
  onArrow: (delta: number) => boolean;
  onEscape: () => boolean;
};

export function createSlashExtension(controller: { current: SlashController }) {
  return Extension.create({
    name: "slashCommand",
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        Enter: () => controller.current.onEnter(),
        ArrowDown: () => controller.current.onArrow(1),
        ArrowUp: () => controller.current.onArrow(-1),
        Escape: () => controller.current.onEscape(),
        Tab: () => controller.current.onEnter(),
      };
    },
  });
}

export function SlashMenu({
  query,
  index,
  top,
  left,
  onHover,
  onSelect,
}: {
  query: string;
  index: number;
  top: number;
  left: number;
  onHover: (index: number) => void;
  onSelect: (value: string) => void;
}) {
  const items = filterSlashCommands(query);

  return (
    <div
      role="listbox"
      aria-label="Styles"
      style={{ top, left }}
      className="fixed z-40 min-w-44 rounded-md border border-black/10 bg-white p-1 shadow-md dark:border-white/10 dark:bg-[#2a2a28]"
    >
      {items.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-[#8a847a]">No matches</p>
      ) : (
        items.map((item, itemIndex) => (
          <button
            key={item.value}
            type="button"
            role="option"
            aria-selected={itemIndex === index}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(itemIndex)}
            onClick={() => onSelect(item.value)}
            className={cn(
              "flex w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm",
              itemIndex === index && "bg-black/5 dark:bg-white/10"
            )}
          >
            {item.label}
          </button>
        ))
      )}
    </div>
  );
}
