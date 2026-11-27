"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { EntrySummary, StoredEntry } from "@/app/lib/types/Entry/entries";
import {
  formatMonthHeading,
  formatWeekday,
  hrefForEntryDate,
  parseEntryDateKey,
} from "@/lib/dates";
import { buildPreview, extractPlainText, highlightParts, type RichTextNode } from "@/lib/entry-text";
import { openEntryContent } from "@/lib/content-key";
import { useApi } from "@/lib/hooks/useApi";
import AccountMenu from "./AccountMenu";
import { useClientToday } from "./use-client-today";
import {
  journalColumnClass,
  journalGoldClass,
  journalMutedClass,
  journalShellClass,
} from "./shell";

export default function EntriesIndex() {
  const today = useClientToday();
  const [query, setQuery] = useState("");
  const [deferred, setDeferred] = useState("");
  const [opened, setOpened] = useState<{
    key: string;
    rows: { entry: StoredEntry; text: string }[];
  } | null>(null);
  const [openError, setOpenError] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDeferred(query.trim()), 200);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, error, isLoading } = useApi<StoredEntry[]>("/api/auth/entries");
  const dataKey = (data ?? [])
    .map((entry) => `${entry.id}:${String(entry.dateUpdated)}`)
    .join("|");

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    Promise.all(
      data.map(async (entry) => {
        const doc = await openEntryContent(entry.content);
        return { entry, text: extractPlainText(doc as RichTextNode) };
      })
    )
      .then((rows) => {
        if (!cancelled) setOpened({ key: dataKey, rows });
      })
      .catch(() => {
        if (!cancelled) setOpenError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [data, dataKey]);

  const ready = opened?.key === dataKey ? opened.rows : null;
  const visible = (ready ?? []).filter((row) => {
    if (!deferred) return true;
    return row.text.toLowerCase().includes(deferred.toLowerCase());
  });
  const summaries: EntrySummary[] = visible.map((row) => ({
    id: row.entry.id,
    entryDate: row.entry.entryDate,
    dateUpdated: String(row.entry.dateUpdated ?? ""),
    preview: buildPreview(row.text, deferred || undefined),
  }));

  const groups: { label: string; entries: EntrySummary[] }[] = [];
  for (const entry of summaries) {
    const label = formatMonthHeading(entry.entryDate);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, entries: [entry] });
    } else {
      last.entries.push(entry);
    }
  }

  return (
    <div className={journalShellClass}>
      <header className="sticky top-0 z-20 bg-[#f6f4f0] dark:bg-[#0e0e0c]">
        <div className={`${journalColumnClass} flex items-center justify-between py-3`}>
          <Link
            href="/"
            className={`${journalMutedClass} flex items-center gap-1 text-sm hover:text-[#1c1916] dark:hover:text-[#f3efe6]`}
          >
            <ChevronLeft className="size-4" />
            Today
          </Link>
          <AccountMenu />
        </div>
      </header>
      <div className={`${journalColumnClass} pb-16`}>
        <h1 className="font-journal mt-8 text-5xl">All entries</h1>

        <label className="relative mt-8 block">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#8a847a]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search entries"
            aria-label="Search entries"
            className="w-full min-w-0 rounded-xl border border-black/5 bg-white/80 py-3 pr-4 pl-11 text-base outline-none placeholder:text-[#8a847a] focus:border-black/10 dark:border-white/5 dark:bg-[#1c1c1a] dark:focus:border-white/10"
          />
        </label>

        {deferred && ready && (
          <p className={`${journalMutedClass} mt-4 text-sm`}>
            {summaries.length === 0
              ? `No entries match “${deferred}”`
              : `${summaries.length} ${summaries.length === 1 ? "entry" : "entries"} match “${deferred}”`}
          </p>
        )}

        {isLoading || (data && !ready && !openError) ? (
          <p className={`${journalMutedClass} mt-8 text-sm`}>Loading…</p>
        ) : error || openError ? (
          <p className={`${journalMutedClass} mt-8 text-sm`}>
            Couldn’t load entries.
          </p>
        ) : summaries.length === 0 && !deferred ? (
          <p className={`${journalMutedClass} mt-8 text-sm`}>No entries yet.</p>
        ) : (
          <div className="mt-8">
            {groups.map((group) => (
              <section key={group.label} className="mt-8 first:mt-0">
                <div className="mb-1 flex items-center gap-3">
                  <h2
                    className={`${journalGoldClass} text-[11px] font-medium tracking-[0.16em]`}
                  >
                    {group.label}
                  </h2>
                  <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                </div>
                <ul>
                  {group.entries.map((entry) => {
                    const href = today
                      ? hrefForEntryDate(entry.entryDate, today)
                      : `/day/${entry.entryDate}`;
                    return (
                      <li
                        key={entry.id}
                        className="border-b border-black/10 dark:border-white/10"
                      >
                        <Link href={href} className="flex gap-5 py-4">
                          <div className="w-12 shrink-0 text-center">
                            <div className="font-journal text-4xl leading-none">
                              {parseEntryDateKey(entry.entryDate).getDate()}
                            </div>
                            <div
                              className={`${journalMutedClass} mt-1 text-[10px] tracking-[0.14em]`}
                            >
                              {formatWeekday(entry.entryDate)}
                            </div>
                          </div>
                          <p className="pt-1 text-[15px] leading-relaxed">
                            <HighlightedText
                              text={entry.preview}
                              query={deferred}
                            />
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  return highlightParts(text, query).map((part, index) =>
    part.match ? (
      <mark
        key={index}
        className="bg-transparent text-inherit underline decoration-2 underline-offset-[3px]"
      >
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    )
  );
}
