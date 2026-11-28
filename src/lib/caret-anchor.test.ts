import { describe, expect, it } from "vitest";
import { anchorToCaret, caretScrollDelta } from "@/lib/caret-anchor";

const root = { rootTop: 200, rootLeft: 16, rootWidth: 360 };

describe("anchorToCaret", () => {
  it("sits just under the caret, in the editor's coordinates", () => {
    const place = anchorToCaret({
      caretTop: 300,
      caretBottom: 324,
      caretLeft: 40,
      menuWidth: 200,
      menuHeight: 96,
      visibleTop: 52,
      visibleBottom: 700,
      ...root,
    });
    expect(place.top).toBe(132);
    expect(place.left).toBe(24);
  });

  it("flips above the caret when the menu would land in the browser chrome", () => {
    const place = anchorToCaret({
      caretTop: 560,
      caretBottom: 584,
      caretLeft: 40,
      menuWidth: 200,
      menuHeight: 96,
      visibleTop: 52,
      visibleBottom: 620,
      ...root,
    });
    expect(place.top).toBeLessThan(560 - root.rootTop);
    expect(place.top).toBe(560 - root.rootTop - 96 - 8);
  });

  it("keeps a tall menu inside the visible band instead of pinning it to the screen edge", () => {
    const place = anchorToCaret({
      caretTop: 180,
      caretBottom: 204,
      caretLeft: 40,
      menuWidth: 200,
      menuHeight: 300,
      visibleTop: 52,
      visibleBottom: 400,
      ...root,
    });
    expect(place.top).toBeGreaterThanOrEqual(52 - root.rootTop);
    expect(place.top + 300).toBeLessThanOrEqual(400 - root.rootTop + 1);
  });
});

describe("caretScrollDelta", () => {
  it("scrolls down when the caret is behind the keyboard chrome", () => {
    expect(caretScrollDelta(500, 524, 52, 420)).toBe(104);
  });

  it("leaves the caret alone when it is already visible", () => {
    expect(caretScrollDelta(120, 144, 52, 420)).toBe(0);
  });

  it("scrolls up when the caret is under the sticky navigation", () => {
    expect(caretScrollDelta(20, 44, 52, 420)).toBe(-32);
  });
});
