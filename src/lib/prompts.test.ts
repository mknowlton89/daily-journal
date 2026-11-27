import { describe, expect, it } from "vitest";
import {
  EMPTY_ENTRY_PLACEHOLDER,
  addSavedPrompt,
  composerState,
  deletePrompt,
  emptyLibrary,
  listPrompts,
  blockPickerRows,
  pickerEndIndex,
  pickerHomeIndex,
  pickerRows,
  promptForDate,
  promptPlaceholder,
  randomPrompt,
  restorePrompt,
  toggleFavorite,
} from "@/lib/prompts";

describe("promptForDate", () => {
  it("returns the same prompt for the same date", () => {
    const first = promptForDate("2026-10-20");
    const second = promptForDate("2026-10-20");
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("stays stable when the library does not change", () => {
    const library = emptyLibrary();
    const expected = promptForDate("2026-11-25", library);
    for (let i = 0; i < 20; i += 1) {
      expect(promptForDate("2026-11-25", library)).toBe(expected);
    }
  });
});

describe("randomPrompt", () => {
  it("returns a different prompt from the current one", () => {
    const current = promptForDate("2026-10-20");
    const next = randomPrompt(emptyLibrary(), { excluding: current, random: () => 0.5 });
    expect(next).not.toBe(current);
  });

  it("prefers favorites when any exist", () => {
    const first = listPrompts(emptyLibrary())[0];
    const library = toggleFavorite(emptyLibrary(), first.id);
    for (let step = 0; step < 10; step += 1) {
      expect(randomPrompt(library, { random: () => step / 10 })).toBe(first.text);
    }
  });
});

describe("favorite, delete, and undo", () => {
  it("lists favorites before the rest and tags saved prompts", () => {
    let library = addSavedPrompt(emptyLibrary(), "My own question?", {
      id: "saved-1",
      favorite: true,
    });
    const listed = listPrompts(library);
    expect(listed[0]).toMatchObject({ id: "saved-1", source: "saved", favorite: true });
    expect(listed.slice(1).every((prompt) => !prompt.favorite)).toBe(true);
  });

  it("hides a deleted starter and restores its favorite state", () => {
    const starter = listPrompts(emptyLibrary())[2];
    const favorited = toggleFavorite(emptyLibrary(), starter.id);
    const { library, deletion } = deletePrompt(favorited, starter.id);
    expect(listPrompts(library).some((prompt) => prompt.id === starter.id)).toBe(false);
    expect(deletion).toEqual({ type: "starter", id: starter.id, favorite: true });
    const restored = restorePrompt(library, deletion!);
    expect(listPrompts(restored).find((prompt) => prompt.id === starter.id)).toMatchObject({
      favorite: true,
    });
  });

  it("puts a deleted saved prompt back in its previous position", () => {
    let library = addSavedPrompt(emptyLibrary(), "First", { id: "a" });
    library = addSavedPrompt(library, "Second", { id: "b" });
    const { library: next, deletion } = deletePrompt(library, "a");
    expect(next.saved.map((prompt) => prompt.id)).toEqual(["b"]);
    const restored = restorePrompt(next, deletion!);
    expect(restored.saved.map((prompt) => prompt.id)).toEqual(["a", "b"]);
  });
});

describe("saved versus one-time", () => {
  it("adds a saved prompt and leaves a one-time prompt out of the list", () => {
    const library = addSavedPrompt(emptyLibrary(), "  Keep this  ", {
      id: "saved-2",
    });
    expect(library.saved).toEqual([
      { id: "saved-2", text: "Keep this", favorite: false },
    ]);
    expect(listPrompts(library).some((prompt) => prompt.text === "Used once")).toBe(
      false
    );
  });
});

describe("composer", () => {
  it("inserts once when save for later is off", () => {
    const state = composerState({
      text: "  What now? ",
      saveForLater: false,
      favorite: true,
    });
    expect(state.canInsert).toBe(true);
    expect(state.primaryLabel).toBe("Insert once");
    expect(state.favoriteEnabled).toBe(false);
    expect(state.favorite).toBe(false);
    expect(state.favoriteHelp).toBe("Turn on Save for later first");
  });

  it("saves and can favorite when save for later is on", () => {
    const state = composerState({
      text: "What now?",
      saveForLater: true,
      favorite: true,
    });
    expect(state.primaryLabel).toBe("Save & insert");
    expect(state.favorite).toBe(true);
    expect(state.saveHelp).toBe("Keep it in your prompt list");
  });

  it("blocks an empty prompt", () => {
    expect(
      composerState({ text: "   ", saveForLater: true, favorite: false }).canInsert
    ).toBe(false);
  });
});

describe("picker rows", () => {
  it("keeps surprise me and add your own around the filtered prompts", () => {
    const { rows } = pickerRows(emptyLibrary(), "boundary");
    expect(rows[0]).toEqual({ kind: "surprise" });
    expect(rows.at(-1)).toEqual({ kind: "add" });
    expect(rows.filter((row) => row.kind === "prompt")).toHaveLength(1);
    expect(rows.some((row) => row.kind === "remove")).toBe(false);
  });

  it("adds remove from entry only on the block picker", () => {
    const { rows } = blockPickerRows(emptyLibrary(), "boundary");
    expect(rows.at(-2)).toEqual({ kind: "add" });
    expect(rows.at(-1)).toEqual({ kind: "remove" });
  });

  it("jumps home to surprise me and end to the first footer row", () => {
    const { rows } = blockPickerRows(emptyLibrary(), "");
    expect(rows[pickerHomeIndex(rows)]).toEqual({ kind: "surprise" });
    expect(rows[pickerEndIndex(rows)]).toEqual({ kind: "add" });
  });
});

describe("empty entry placeholder", () => {
  it("shows the slash hint on an empty paragraph", () => {
    expect(promptPlaceholder({ nodeName: "paragraph", entryIsEmpty: true })).toBe(
      EMPTY_ENTRY_PLACEHOLDER
    );
  });

  it("hides the hint once the entry has content", () => {
    expect(promptPlaceholder({ nodeName: "paragraph", entryIsEmpty: false })).toBe("");
  });

  it("hides the hint on headings and other blocks", () => {
    expect(promptPlaceholder({ nodeName: "heading", entryIsEmpty: true })).toBe("");
  });
});
