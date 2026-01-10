"use client";

import { useRef, useState } from "react";
import { JSONContent, useEditor, EditorContent } from "@tiptap/react";
import Emoji from "@tiptap/extension-emoji";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export default function EntryCard({
  entryId,
  content,
  dateUpdated,
}: {
  entryId: string;
  content?: JSONContent;
  dateUpdated: number;
}) {
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
        <div>Loading...</div>
      ) : (
        <div>
          <div className="flex justify-end pb-4">
            <span className="font-light text-sm color-gray-500">
              {/* MKTODO: I need to update this so it shows a relative time like "Last saved 10 minutes ago", but if its greater than 1 hour, it shows the full date and time. */}
              {lastSavedAt
                ? `Last updated: ${new Date(lastSavedAt).toLocaleString()}`
                : "No updates yet"}
              {/* It feels like we should probably have an error state here if the update does fail. */}
            </span>
          </div>
          <EditorContent editor={editor} className="min-h-[200px]" />
        </div>
      )}
    </div>
  );
}
