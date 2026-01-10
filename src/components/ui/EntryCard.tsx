"use client";

import { useRef, useState } from "react";
import { JSONContent, useEditor, EditorContent } from "@tiptap/react";
import Emoji from "@tiptap/extension-emoji";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "./button";
import Link from "next/link";

import { FaArrowLeft, FaTrash } from "react-icons/fa6";
import { Badge } from "./badge";
import { useRouter } from "next/navigation";

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Emoji,
      TaskList,
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
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      scheduleSave(editor.getJSON());
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
            <EditorContent editor={editor} className="min-h-[200px]" />
          </div>
        </div>
      )}
    </div>
  );
}
