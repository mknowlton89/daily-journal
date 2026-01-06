"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { useEditor, EditorContent } from "@tiptap/react";
import Emoji from "@tiptap/extension-emoji";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { BulletList, ListItem } from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Strike from "@tiptap/extension-strike";
import Document from "@tiptap/extension-document";
import { useState } from "react";
import { Button } from "./button";
import { useRouter } from "next/navigation";

export default function EntryCard() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      BulletList,
      ListItem,
      Emoji,
      HorizontalRule,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Strike,
    ],
    autofocus: true,
    content: "",
    immediatelyRender: false,
  });

  const handleSubmit = async () => {
    if (!editor) return;

    setLoading(true);
    try {
      const payload: { content: string } = {
        content: editor.getText(), // We'll probably need to update to support more complex content
      };
      const res = await fetch("/api/auth/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      editor.commands.clearContent();
      router.push(`/`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 w-4/5">
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s on your mind?</CardTitle>
        </CardHeader>
        <CardContent>
          {!editor ? (
            <div>Loading...</div>
          ) : (
            <div>
              <EditorContent editor={editor} className="min-h-[200px]" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={async () => await handleSubmit()}
          >
            Submit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
