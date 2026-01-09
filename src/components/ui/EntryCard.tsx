"use client";

import { JSONContent, useEditor, EditorContent } from "@tiptap/react";
import Emoji from "@tiptap/extension-emoji";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { BulletList, ListItem } from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import StarterKit from "@tiptap/starter-kit";
import Text from "@tiptap/extension-text";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Strike from "@tiptap/extension-strike";
import Document from "@tiptap/extension-document";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState } from "react";

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
      Document,
      Paragraph,
      Text,
      BulletList,
      ListItem,
      StarterKit,
      Emoji,
      HorizontalRule,
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
      Strike,
    ],
    autofocus: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      scheduleSave(editor.getJSON());
    },
    content:
      content && content.content && content.content.length > 0
        ? content
        : {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 1 },
              },
            ],
          },
  });

  return (
    <div className="p-4 w-4/5">
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
