const STARTERS = [
  {
    id: "starter-1",
    text: "What drained my energy today, and what helped recharge me?",
  },
  {
    id: "starter-2",
    text: "What do I really want in my life right now, separate from other people's expectations?",
  },
  {
    id: "starter-3",
    text: "What is one pattern or habit I'm noticing in my week so far?",
  },
  {
    id: "starter-4",
    text: "What am I holding onto out of comfort, fear, or habit that I'm ready to let go of?",
  },
  {
    id: "starter-5",
    text: "What is one small win or good thing I have today that I didn't have a year ago?",
  },
  {
    id: "starter-6",
    text: 'Where could I set a clearer boundary or say "no" to protect my time and focus?',
  },
  {
    id: "starter-7",
    text: "If I repeated this week's routine for the next several years, where would it lead me?",
  },
  {
    id: "starter-8",
    text: "What did I avoid today, and what was underneath that avoidance?",
  },
  {
    id: "starter-9",
    text: "How would I talk to myself right now if I were speaking to a close friend?",
  },
  {
    id: "starter-10",
    text: "What is one small, practical action I can take tomorrow to move forward?",
  },
] as const;

export type SavedPrompt = {
  id: string;
  text: string;
  favorite: boolean;
};

export type PromptLibrary = {
  hiddenStarterIds: string[];
  favoriteStarterIds: string[];
  saved: SavedPrompt[];
};

export type ListedPrompt = {
  id: string;
  text: string;
  source: "starter" | "saved";
  favorite: boolean;
};

export type PromptDeletion =
  | { type: "starter"; id: string; favorite: boolean }
  | { type: "saved"; index: number; prompt: SavedPrompt };

export type PickerRow =
  | { kind: "surprise" }
  | { kind: "prompt"; prompt: ListedPrompt }
  | { kind: "add" }
  | { kind: "remove" };

const STARTER_IDS = new Set<string>(STARTERS.map((prompt) => prompt.id));

export function emptyLibrary(): PromptLibrary {
  return { hiddenStarterIds: [], favoriteStarterIds: [], saved: [] };
}

export function normalizeLibrary(value: unknown): PromptLibrary {
  const record = value && typeof value === "object" ? (value as PromptLibrary) : null;
  const hidden = Array.isArray(record?.hiddenStarterIds)
    ? record.hiddenStarterIds.filter(
        (id): id is string => typeof id === "string" && STARTER_IDS.has(id)
      )
    : [];
  const favorites = Array.isArray(record?.favoriteStarterIds)
    ? record.favoriteStarterIds.filter(
        (id): id is string =>
          typeof id === "string" && STARTER_IDS.has(id) && !hidden.includes(id)
      )
    : [];
  const saved = Array.isArray(record?.saved)
    ? record.saved.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const prompt = item as SavedPrompt;
        const text = typeof prompt.text === "string" ? prompt.text.trim() : "";
        if (!text || typeof prompt.id !== "string" || !prompt.id) return [];
        return [{ id: prompt.id, text: text.slice(0, 500), favorite: Boolean(prompt.favorite) }];
      })
    : [];
  return {
    hiddenStarterIds: hidden,
    favoriteStarterIds: favorites,
    saved: saved.slice(0, 200),
  };
}

export function listPrompts(library: PromptLibrary): ListedPrompt[] {
  const hidden = new Set(library.hiddenStarterIds);
  const favorites = new Set(library.favoriteStarterIds);
  const prompts: ListedPrompt[] = [
    ...STARTERS.filter((prompt) => !hidden.has(prompt.id)).map((prompt) => ({
      id: prompt.id,
      text: prompt.text,
      source: "starter" as const,
      favorite: favorites.has(prompt.id),
    })),
    ...library.saved.map((prompt) => ({
      id: prompt.id,
      text: prompt.text,
      source: "saved" as const,
      favorite: prompt.favorite,
    })),
  ];
  return [
    ...prompts.filter((prompt) => prompt.favorite),
    ...prompts.filter((prompt) => !prompt.favorite),
  ];
}

function hashDate(dateKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < dateKey.length; index += 1) {
    hash ^= dateKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function promptForDate(
  dateKey: string,
  library: PromptLibrary = emptyLibrary()
) {
  const prompts = listPrompts(library);
  if (!prompts.length) return "";
  return prompts[hashDate(dateKey) % prompts.length].text;
}

export function randomPrompt(
  library: PromptLibrary,
  options: { excluding?: string; random?: () => number } = {}
) {
  const random = options.random ?? Math.random;
  const prompts = listPrompts(library);
  if (!prompts.length) return options.excluding ?? "";
  const favorites = prompts.filter((prompt) => prompt.favorite);
  const pool = favorites.length ? favorites : prompts;
  let choices = options.excluding
    ? pool.filter((prompt) => prompt.text !== options.excluding)
    : pool;
  if (!choices.length && options.excluding) {
    choices = prompts.filter((prompt) => prompt.text !== options.excluding);
  }
  if (!choices.length) return options.excluding ?? prompts[0].text;
  const index = Math.min(
    choices.length - 1,
    Math.floor(random() * choices.length)
  );
  return choices[index].text;
}

export function toggleFavorite(library: PromptLibrary, id: string): PromptLibrary {
  const savedIndex = library.saved.findIndex((prompt) => prompt.id === id);
  if (savedIndex >= 0) {
    const saved = library.saved.map((prompt, index) =>
      index === savedIndex ? { ...prompt, favorite: !prompt.favorite } : prompt
    );
    return { ...library, saved };
  }
  if (!STARTER_IDS.has(id) || library.hiddenStarterIds.includes(id)) return library;
  const favorite = library.favoriteStarterIds.includes(id);
  return {
    ...library,
    favoriteStarterIds: favorite
      ? library.favoriteStarterIds.filter((starterId) => starterId !== id)
      : [...library.favoriteStarterIds, id],
  };
}

export function deletePrompt(
  library: PromptLibrary,
  id: string
): { library: PromptLibrary; deletion: PromptDeletion | null } {
  const savedIndex = library.saved.findIndex((prompt) => prompt.id === id);
  if (savedIndex >= 0) {
    const prompt = library.saved[savedIndex];
    return {
      library: {
        ...library,
        saved: library.saved.filter((item) => item.id !== id),
      },
      deletion: { type: "saved", index: savedIndex, prompt },
    };
  }
  if (!STARTER_IDS.has(id) || library.hiddenStarterIds.includes(id)) {
    return { library, deletion: null };
  }
  return {
    library: {
      ...library,
      hiddenStarterIds: [...library.hiddenStarterIds, id],
      favoriteStarterIds: library.favoriteStarterIds.filter(
        (starterId) => starterId !== id
      ),
    },
    deletion: {
      type: "starter",
      id,
      favorite: library.favoriteStarterIds.includes(id),
    },
  };
}

export function restorePrompt(
  library: PromptLibrary,
  deletion: PromptDeletion
): PromptLibrary {
  if (deletion.type === "starter") {
    const hiddenStarterIds = library.hiddenStarterIds.filter((id) => id !== deletion.id);
    const favoriteStarterIds = deletion.favorite
      ? [...library.favoriteStarterIds.filter((id) => id !== deletion.id), deletion.id]
      : library.favoriteStarterIds;
    return { ...library, hiddenStarterIds, favoriteStarterIds };
  }
  if (library.saved.some((prompt) => prompt.id === deletion.prompt.id)) return library;
  const saved = [...library.saved];
  saved.splice(Math.min(deletion.index, saved.length), 0, deletion.prompt);
  return { ...library, saved };
}

export function addSavedPrompt(
  library: PromptLibrary,
  text: string,
  options: { id: string; favorite?: boolean }
): PromptLibrary {
  const trimmed = text.trim();
  if (!trimmed) return library;
  return {
    ...library,
    saved: [
      ...library.saved,
      { id: options.id, text: trimmed.slice(0, 500), favorite: Boolean(options.favorite) },
    ],
  };
}

export function restoreStarterDefaults(library: PromptLibrary): PromptLibrary {
  return { ...library, hiddenStarterIds: [], favoriteStarterIds: [] };
}

export function pickerRows(library: PromptLibrary, filter: string) {
  const needle = filter.trim().toLowerCase();
  const prompts = listPrompts(library).filter(
    (prompt) => !needle || prompt.text.toLowerCase().includes(needle)
  );
  const rows: PickerRow[] = [
    { kind: "surprise" },
    ...prompts.map((prompt) => ({ kind: "prompt" as const, prompt })),
    { kind: "add" },
  ];
  return {
    rows,
    favorites: prompts.filter((prompt) => prompt.favorite),
    rest: prompts.filter((prompt) => !prompt.favorite),
  };
}

export function blockPickerRows(library: PromptLibrary, filter: string) {
  const picked = pickerRows(library, filter);
  return {
    ...picked,
    rows: [...picked.rows, { kind: "remove" as const }],
  };
}

export function pickerHomeIndex(rows: PickerRow[]) {
  const surprise = rows.findIndex((row) => row.kind === "surprise");
  return surprise >= 0 ? surprise : 0;
}

export function pickerEndIndex(rows: PickerRow[]) {
  const add = rows.findIndex((row) => row.kind === "add");
  return add >= 0 ? add : Math.max(rows.length - 1, 0);
}

export const EMPTY_ENTRY_PLACEHOLDER =
  "Press / to insert blocks, or type /prompt for a new idea";

export function showEmptyEntryHint(entryIsEmpty: boolean, nodeName: string) {
  return entryIsEmpty && nodeName === "paragraph";
}

export function promptPlaceholder({
  nodeName,
  entryIsEmpty,
}: {
  nodeName: string;
  entryIsEmpty: boolean;
}) {
  if (!showEmptyEntryHint(entryIsEmpty, nodeName)) return "";
  return EMPTY_ENTRY_PLACEHOLDER;
}

export function composerState({
  text,
  saveForLater,
  favorite,
}: {
  text: string;
  saveForLater: boolean;
  favorite: boolean;
}) {
  const trimmed = text.trim();
  return {
    trimmed,
    canInsert: trimmed.length > 0,
    primaryLabel: saveForLater ? "Save & insert" : "Insert once",
    saveForLater,
    favorite: saveForLater ? favorite : false,
    favoriteEnabled: saveForLater,
    saveHelp: saveForLater
      ? "Keep it in your prompt list"
      : "Off: used in this entry only",
    favoriteHelp: saveForLater
      ? "Show it at the top of your list"
      : "Turn on Save for later first",
  };
}
