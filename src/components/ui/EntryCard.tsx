"use client";

import { useRef, useState } from "react";
import { JSONContent, useEditor, EditorContent } from "@tiptap/react";
import Emoji from "@tiptap/extension-emoji";
import {
  BulletList,
  OrderedList,
  TaskItem,
  TaskList,
} from "@tiptap/extension-list";
import Blockquote from "@tiptap/extension-blockquote";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Button } from "./button";
import Link from "next/link";

import {
  FaArrowLeft,
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaTrash,
  FaUnderline,
} from "react-icons/fa6";
import { Badge } from "./badge";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

export default function EntryCard({
  entryId,
  content,
  dateUpdated,
}: {
  entryId: string;
  content?: JSONContent;
  dateUpdated: number;
}) {
  const router = useRouter();
  const [lastSavedAt, setLastSavedAt] = useState<number>(dateUpdated);
  const [, setUpdateTrigger] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedAtRef = useRef<number>(dateUpdated);

  const handleSave = async (content: JSONContent) => {
    const now = Date.now();

    // prevent double-saving
    if (now - lastSavedAtRef.current < 500) return;

    try {
      const res = await fetch(`/api/auth/entries/${entryId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        // Only update timestamp on successful save
        lastSavedAtRef.current = now;
        setLastSavedAt(now);
      } else {
        console.error("Failed to save entry");
      }
    } catch (error) {
      console.error("Error saving entry:", error);
    }
  };

  const scheduleSave = (content: JSONContent) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(content);
    }, 1000);
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/auth/entries/${entryId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/");
    }
  };

  const getCurrentTextStyle = () => {
    if (!editor) return "paragraph";

    if (editor.isActive("codeBlock")) return "codeBlock";
    if (editor.isActive("blockquote")) return "blockquote";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    if (editor.isActive("heading", { level: 4 })) return "h4";
    if (editor.isActive("heading", { level: 5 })) return "h5";
    if (editor.isActive("heading", { level: 6 })) return "h6";
    if (editor.isActive("orderedList")) return "orderedList";
    if (editor.isActive("bulletList")) return "bulletList";
    if (editor.isActive("taskList")) return "taskList";

    return "paragraph";
  };

  const handleTextStyleChange = (value: string) => {
    if (!editor) return;

    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else if (value === "blockquote") {
      editor.chain().focus().toggleBlockquote().run();
    } else if (value === "codeBlock") {
      editor.chain().focus().toggleCodeBlock().run();
    } else if (value === "orderedList") {
      editor.chain().focus().toggleOrderedList().run();
    } else if (value === "bulletList") {
      editor.chain().focus().toggleBulletList().run();
    } else if (value === "taskList") {
      editor.chain().focus().toggleTaskList().run();
    } else {
      const level = parseInt(value.replace("h", "")) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Emoji,
      TaskList,
      OrderedList,
      BulletList,
      Blockquote.configure({
        HTMLAttributes: {
          class: "border-l-4 border-gray-300 pl-4 my-6 italic text-gray-700",
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return "What's on your mind...";
          }
          return "Start writing…";
        },
      }),
      TaskItem.configure({
        nested: true,
      }),
    ],
    autofocus: false,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      scheduleSave(editor.getJSON());
    },
    onTransaction: () => {
      // Force immediate re-render on any transaction (including formatting changes)
      setUpdateTrigger((prev) => prev + 1);
    },
    content: content || undefined, // Let TipTap create default empty content if no content
  });

  return (
    <div className="w-full">
      {!editor ? (
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center w-full p-4 border-b">
            <div>
              <Link href="/">
                <div className="flex items-center justify-center gap-2">
                  <FaArrowLeft size={16} />
                  <span>Exit Editor</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {lastSavedAt
                  ? `Last updated: ${new Date(lastSavedAt).toLocaleString()}`
                  : "No updates yet"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete()}
              >
                <FaTrash size={16} className="text-red-400" />
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-center mb-6 ">
              <div className="flex items-center justify-center rounded drop-shadow-sm bg-gray-50 gap-2">
                <div>
                  <Select
                    value={getCurrentTextStyle()}
                    onValueChange={handleTextStyleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Text Style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Text Style</SelectLabel>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectItem value="h1">H1</SelectItem>
                        <SelectItem value="h2">H2</SelectItem>
                        <SelectItem value="h3">H3</SelectItem>
                        <SelectItem value="h4">H4</SelectItem>
                        <SelectItem value="h5">H5</SelectItem>
                        <SelectItem value="h6">H6</SelectItem>
                        <SelectItem value="blockquote">Blockquote</SelectItem>
                        <SelectItem value="taskList">Task List</SelectItem>
                        <SelectItem value="orderedList">
                          Ordered List
                        </SelectItem>
                        <SelectItem value="bulletList">Bullet List</SelectItem>
                        <SelectItem value="codeBlock">Code Block</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <FaBold size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <FaItalic size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      editor.chain().focus().toggleUnderline().run()
                    }
                  >
                    <FaUnderline size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                  >
                    <FaStrikethrough size={16} />
                  </Button>
                </div>
              </div>
            </div>
            <EditorContent editor={editor} className="min-h-[200px]" />
          </div>
        </div>
      )}
    </div>
  );
}
