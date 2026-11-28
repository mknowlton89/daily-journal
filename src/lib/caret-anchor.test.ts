import { describe, expect, it } from "vitest";
import { anchorToCaret, caretScrollDelta } from "@/lib/caret-anchor";

const root = { rootTop: 200, rootLeft: 16, rootWidth: 360, rootHeight: 900 };

describe("anchorToCaret", () => {
  it("pins the top of the menu to the line under the caret", () => {
    const place = anchorToCaret({
      caretTop: 300,
      caretBottom: 324,
      caretLeft: 40,
      menuWidth: 200,
      visibleTop: 52,
      visibleBottom: 700,
      ...root,
    });
    expect(place.top).toBe(132);
    expect(place.bottom).toBeUndefined();
    expect(place.left).toBe(24);
  });

  it("pins the bottom of the menu to the line above the caret", () => {
    const place = anchorToCaret({
      caretTop: 560,
      caretBottom: 584,
      caretLeft: 40,
      menuWidth: 200,
      visibleTop: 52,
      visibleBottom: 620,
      ...root,
    });
    expect(place.top).toBeUndefined();
    expect(place.bottom).toBe(root.rootHeight - (560 - root.rootTop) + 8);
    expect(place.maxHeight).toBe(560 - 52 - 8);
  });

  it("limits a tall menu to the open space without moving it off the caret", () => {
    const place = anchorToCaret({
      caretTop: 180,
      caretBottom: 204,
      caretLeft: 40,
      menuWidth: 200,
      visibleTop: 52,
      visibleBottom: 400,
      ...root,
    });
    expect(place.top).toBe(12);
    expect(place.maxHeight).toBe(400 - 204 - 8);
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
