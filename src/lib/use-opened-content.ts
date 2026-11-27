"use client";

import { useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { isSealedContent } from "@/lib/content-cipher";
import { openEntryContent } from "@/lib/content-key";

export function useOpenedContent(content: unknown) {
  const serialized = JSON.stringify(content ?? null);
  const parsed = JSON.parse(serialized) as unknown;
  const [opened, setOpened] = useState<{
    key: string;
    content?: JSONContent;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    const value = JSON.parse(serialized) as unknown;
    if (!isSealedContent(value)) return;
    let cancelled = false;
    openEntryContent(value)
      .then((plain) => {
        if (cancelled) return;
        setOpened({ key: serialized, content: plain, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        setOpened({ key: serialized, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [serialized]);

  if (!isSealedContent(parsed)) {
    return {
      content: parsed == null ? undefined : (parsed as JSONContent),
      ready: true,
      failed: false,
    };
  }

  const matches = opened?.key === serialized;
  return {
    content: matches ? opened?.content : undefined,
    ready: Boolean(matches),
    failed: matches ? opened.failed : false,
  };
}
