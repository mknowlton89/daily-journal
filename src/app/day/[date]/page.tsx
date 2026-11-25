"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import JournalDay from "@/components/journal/JournalDay";
import { journalShellClass } from "@/components/journal/shell";
import { useClientToday } from "@/components/journal/use-client-today";
import { isValidDateKey } from "@/lib/dates";

export default function DayPage() {
  const params = useParams();
  const router = useRouter();
  const today = useClientToday();
  const date = String(params.date ?? "");

  useEffect(() => {
    if (!today) return;
    if (!isValidDateKey(date) || date > today) router.replace("/");
  }, [today, date, router]);

  if (!today || !isValidDateKey(date) || date > today) {
    return <div className={journalShellClass} />;
  }

  return <JournalDay date={date} today={today} />;
}
