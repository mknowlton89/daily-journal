"use client";

import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { RefreshCw } from "lucide-react";
import { rerollPrompt } from "@/lib/prompts";

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

function JournalPromptView({ node, updateAttributes }: NodeViewProps) {
  const text = String(node.attrs.text ?? "");

  return (
    <NodeViewWrapper
      as="aside"
      data-journal-prompt=""
      className="journal-prompt my-4 border-l-2 border-[#9a7340] pl-4 dark:border-[#d4b483]"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a7340] dark:text-[#d4b483]">
        Prompt
      </p>
      <p className="mt-1 font-journal text-[1.05rem] italic leading-snug text-[#8a847a]">
        {text}
      </p>
      <button
        type="button"
        contentEditable={false}
        aria-label="New prompt"
        className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 text-sm text-[#8a847a] hover:text-[#1c1916] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7340] dark:hover:text-[#f3efe6]"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={() => updateAttributes({ text: rerollPrompt(text) })}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        New prompt
      </button>
    </NodeViewWrapper>
  );
}
