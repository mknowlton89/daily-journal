"use client";

import { AlignJustify, ChevronLeft, ChevronRight } from "lucide-react";
import { formatNavDate, hrefForEntryDate } from "@/lib/dates";
import AccountMenu from "./AccountMenu";
import { journalMutedClass } from "./shell";

const navButtonClass = `${journalMutedClass} flex items-center gap-1 text-sm hover:text-[#1c1916] dark:hover:text-[#f3efe6]`;

export default function DayNav({
  date,
  today,
  previousDate,
  nextDate,
  onNavigate,
  onDelete,
}: {
  date: string;
  today: string;
  previousDate: string | null;
  nextDate: string | null;
  onNavigate: (href: string) => void;
  onDelete?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center border-b border-black/5 bg-[#f6f4f0] px-4 py-3 sm:px-6 dark:border-white/10 dark:bg-[#0e0e0c]">
      <div className="justify-self-start">
        {previousDate && (
          <button
            type="button"
            className={navButtonClass}
            onClick={() =>
              onNavigate(hrefForEntryDate(previousDate, today))
            }
          >
            <ChevronLeft className="size-4" />
            {formatNavDate(previousDate)}
          </button>
        )}
      </div>
      <button
        type="button"
        className={navButtonClass}
        onClick={() => onNavigate("/entries")}
      >
        <AlignJustify className="size-4" />
        All entries
      </button>
      <div className="flex items-center justify-end gap-2">
        {nextDate && nextDate !== date && (
          <button
            type="button"
            className={navButtonClass}
            onClick={() => onNavigate(hrefForEntryDate(nextDate, today))}
          >
            {formatNavDate(nextDate)}
            <ChevronRight className="size-4" />
          </button>
        )}
        <AccountMenu onDelete={onDelete} />
      </div>
    </header>
  );
}
