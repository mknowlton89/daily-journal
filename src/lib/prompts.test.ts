import { describe, expect, it } from "vitest";
import {
  EMPTY_ENTRY_PLACEHOLDER,
  promptForDate,
  promptPlaceholder,
  rerollPrompt,
} from "@/lib/prompts";

describe("promptForDate", () => {
  it("returns the same prompt for the same date", () => {
    const first = promptForDate("2026-10-20");
    const second = promptForDate("2026-10-20");
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("is stable across many calls", () => {
    const date = "2026-11-25";
    const expected = promptForDate(date);
    for (let i = 0; i < 20; i += 1) {
      expect(promptForDate(date)).toBe(expected);
    }
  });
});

describe("rerollPrompt", () => {
  it("returns a different prompt", () => {
    const current = promptForDate("2026-10-20");
    const next = rerollPrompt(current, () => 0.5);
    expect(next).not.toBe(current);
    expect(next.length).toBeGreaterThan(0);
  });

  it("never returns the current prompt for any roll", () => {
    const current = promptForDate("2026-01-01");
    for (let step = 0; step < 10; step += 1) {
      const roll = step / 10;
      expect(rerollPrompt(current, () => roll)).not.toBe(current);
    }
  });
});

describe("empty entry placeholder", () => {
  it("shows the slash hint on an empty paragraph", () => {
    expect(
      promptPlaceholder({ nodeName: "paragraph", entryIsEmpty: true })
    ).toBe(EMPTY_ENTRY_PLACEHOLDER);
  });

  it("hides the hint once the entry has content", () => {
    expect(
      promptPlaceholder({ nodeName: "paragraph", entryIsEmpty: false })
    ).toBe("");
  });

  it("hides the hint on headings and other blocks", () => {
    expect(
      promptPlaceholder({ nodeName: "heading", entryIsEmpty: true })
    ).toBe("");
  });
});
