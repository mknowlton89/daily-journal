import {
  dayRelation,
  formatLongDate,
  formatSavedTime,
} from "@/lib/dates";
import { journalGoldClass, journalMutedClass } from "./shell";

export default function DayHeading({
  date,
  today,
  savedAt,
}: {
  date: string;
  today: string;
  savedAt: number | null;
}) {
  const relation = dayRelation(date, today);

  return (
    <header className="pb-8 pt-14">
      {relation !== "other" && (
        <p
          className={`${journalGoldClass} text-[11px] font-medium tracking-[0.2em]`}
        >
          {relation === "today" ? "TODAY" : "YESTERDAY"}
        </p>
      )}
      <h1 className="font-journal mt-2 text-4xl leading-tight sm:text-5xl">
        {formatLongDate(date)}
      </h1>
      <p className={`${journalMutedClass} mt-2 text-sm`}>
        {date.slice(0, 4)}
        {savedAt ? ` · Saved ${formatSavedTime(savedAt)}` : ""}
      </p>
    </header>
  );
}
