"use client";

import JournalDay from "@/components/journal/JournalDay";
import { journalShellClass } from "@/components/journal/shell";
import { useClientToday } from "@/components/journal/use-client-today";

export default function Home() {
  const today = useClientToday();
  if (!today) return <div className={journalShellClass} />;
  return <JournalDay date={today} today={today} />;
}
