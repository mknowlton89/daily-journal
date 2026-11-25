"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JSONContent } from "@tiptap/react";
import { mutate } from "swr";
import { DayContext, EntryInterface } from "@/app/lib/types/Entry/entries";
import { useApi } from "@/lib/hooks/useApi";
import EntryCard, { EntryEditorHandle } from "@/components/ui/EntryCard";
import DayHeading from "./DayHeading";
import DayNav from "./DayNav";
import { journalColumnClass, journalMutedClass, journalShellClass } from "./shell";

export default function JournalDay({
  date,
  today,
}: {
  date: string;
  today: string;
}) {
  const router = useRouter();
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const deleteRef = useRef<(() => void) | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const { data, error, isLoading, mutate: mutateDay } = useApi<DayContext>(
    `/api/auth/entries/day?date=${date}`,
    { revalidateOnMount: true }
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [date]);

  const go = useCallback(
    async (href: string) => {
      await flushRef.current();
      router.push(href);
    },
    [router]
  );

  const nextDate =
    date >= today
      ? null
      : data?.next?.entryDate && data.next.entryDate <= today
        ? data.next.entryDate
        : today;

  return (
    <div className={journalShellClass}>
      <DayNav
        date={date}
        today={today}
        previousDate={data?.previous?.entryDate ?? null}
        nextDate={data ? nextDate : null}
        onNavigate={(href) => void go(href)}
        onDelete={canDelete ? () => deleteRef.current?.() : undefined}
      />
      <div className={journalColumnClass}>
        {isLoading && !data ? (
          <>
            <DayHeading date={date} today={today} savedAt={null} />
            <p className={journalMutedClass}>Loading…</p>
          </>
        ) : error || !data || data.date !== date ? (
          <>
            <DayHeading date={date} today={today} savedAt={null} />
            <p className={journalMutedClass}>
              {error ? "Couldn’t load this day." : "Loading…"}
            </p>
          </>
        ) : (
          <DayBody
            key={date}
            date={date}
            today={today}
            entry={data?.entry ?? null}
            registerFlush={(flush) => {
              flushRef.current = flush;
            }}
            registerDelete={(handler) => {
              deleteRef.current = handler;
            }}
            onCanDelete={setCanDelete}
            onSavedEntry={(info) => {
              void mutateDay(
                (current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    entry: {
                      id: info.id,
                      entryDate: date,
                      userId: current.entry?.userId ?? "",
                      dateCreated: current.entry?.dateCreated ?? new Date(info.savedAt),
                      dateUpdated: new Date(info.savedAt),
                      content: info.content,
                    },
                  };
                },
                { revalidate: false }
              );
            }}
            onDeleted={() => {
              void mutateDay();
            }}
          />
        )}
      </div>
    </div>
  );
}

function DayBody({
  date,
  today,
  entry,
  registerFlush,
  registerDelete,
  onCanDelete,
  onSavedEntry,
  onDeleted,
}: {
  date: string;
  today: string;
  entry: EntryInterface | null;
  registerFlush: (flush: () => Promise<void>) => void;
  registerDelete: (handler: (() => void) | null) => void;
  onCanDelete: (canDelete: boolean) => void;
  onSavedEntry: (info: {
    id: string;
    savedAt: number;
    content: JSONContent;
  }) => void;
  onDeleted: () => void;
}) {
  const editorRef = useRef<EntryEditorHandle>(null);
  const [entryId, setEntryId] = useState<string | null>(entry?.id ?? null);
  const [removed, setRemoved] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(
    entry?.dateUpdated ? new Date(entry.dateUpdated).getTime() : null
  );

  useEffect(() => {
    registerFlush(() => editorRef.current?.flush() ?? Promise.resolve());
    return () => registerFlush(async () => {});
  }, [registerFlush]);

  useEffect(() => {
    onCanDelete(Boolean(entryId) && !removed);
  }, [entryId, removed, onCanDelete]);

  const handleDelete = useCallback(async () => {
    if (!entryId) return;
    if (!window.confirm("Delete this entry?")) return;

    const res = await fetch(`/api/auth/entries/${entryId}`, {
      method: "DELETE",
    });
    if (!res.ok) return;

    setRemoved(true);
    setEntryId(null);
    setSavedAt(null);
    void mutate(
      (key) =>
        typeof key === "string" &&
        (key === "/api/auth/entries" || key.startsWith("/api/auth/entries?")),
      undefined,
      { revalidate: true }
    );
    onDeleted();
  }, [entryId, onDeleted]);

  useEffect(() => {
    registerDelete(() => {
      void handleDelete();
    });
    return () => registerDelete(null);
  }, [handleDelete, registerDelete]);

  const content: JSONContent | undefined = removed
    ? undefined
    : (entry?.content ?? undefined);

  return (
    <>
      <DayHeading date={date} today={today} savedAt={savedAt} />
      <EntryCard
        ref={editorRef}
        key={removed ? `${date}-cleared` : date}
        entryId={removed ? null : entryId}
        entryDate={date}
        content={content}
        onSaved={(info) => {
          setEntryId(info.id);
          setSavedAt(info.savedAt);
          onSavedEntry(info);
        }}
      />
    </>
  );
}
