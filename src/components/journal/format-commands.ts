import type { Editor } from "@tiptap/core";

export const TEXT_STYLES = [
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

export type TextStyleValue = (typeof TEXT_STYLES)[number]["value"];

export function currentTextStyle(editor: Editor) {
  if (editor.isActive("codeBlock")) return "codeBlock";
  if (editor.isActive("blockquote")) return "blockquote";
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("orderedList")) return "orderedList";
  if (editor.isActive("bulletList")) return "bulletList";
  if (editor.isActive("taskList")) return "taskList";
  return "paragraph";
}

export function applyBlockStyle(editor: Editor, value: string) {
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
}

export function toggleInlineStyle(
  editor: Editor,
  mark: "bold" | "italic" | "underline" | "strike"
) {
  const chain = editor.chain().focus();
  if (mark === "bold") chain.toggleBold().run();
  else if (mark === "italic") chain.toggleItalic().run();
  else if (mark === "underline") chain.toggleUnderline().run();
  else chain.toggleStrike().run();
}
