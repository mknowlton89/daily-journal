"use client";

import { useLayoutEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="mx-0.5 inline-block rounded-[5px] border border-black/10 bg-black/[0.04] px-1.5 py-px align-middle font-sans text-[0.75rem] leading-5 text-[#6f6a63] dark:border-white/10 dark:bg-white/10 dark:text-[#cfc8bc]">
      {children}
    </kbd>
  );
}

export function EmptyEntryHint({ editor }: { editor: Editor }) {
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = editor.view.dom.closest(".journal-editor");
    const paragraph = editor.view.dom.querySelector("p.is-empty");
    if (!root || !(paragraph instanceof HTMLElement)) {
      setTop(null);
      return;
    }
    const next =
      paragraph.getBoundingClientRect().top - root.getBoundingClientRect().top;
    setTop((current) =>
      current !== null && Math.abs(current - next) < 0.5 ? current : next
    );
  });

  if (top === null) return null;

  return (
    <p
      className="pointer-events-none absolute left-0 text-[1.15rem] leading-[1.55] text-[#8a847a]"
      style={{ top }}
    >
      Press <KeyCap>/</KeyCap> to insert blocks, or type <KeyCap>/prompt</KeyCap>{" "}
      for a new idea
    </p>
  );
}
