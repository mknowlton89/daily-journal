"use client";

import { useEffect, useState } from "react";
import { formatEntryDateKey } from "@/lib/dates";

export function useClientToday() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(formatEntryDateKey(new Date()));
  }, []);

  return today;
}
