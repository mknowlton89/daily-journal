export function formatEntryDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return formatEntryDateKey(date) === value;
}

export function parseEntryDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDateKey(dateKey: string, days: number) {
  const date = parseEntryDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatEntryDateKey(date);
}

export function dayRelation(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return "today" as const;
  if (dateKey === shiftDateKey(todayKey, -1)) return "yesterday" as const;
  return "other" as const;
}

export function formatLongDate(dateKey: string) {
  return parseEntryDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatNavDate(dateKey: string) {
  return parseEntryDateKey(dateKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatMonthHeading(dateKey: string) {
  return parseEntryDateKey(dateKey)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toUpperCase();
}

export function formatWeekday(dateKey: string) {
  return parseEntryDateKey(dateKey)
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
}

export function formatSavedTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function hrefForEntryDate(dateKey: string, todayKey: string) {
  return dateKey === todayKey ? "/" : `/day/${dateKey}`;
}
