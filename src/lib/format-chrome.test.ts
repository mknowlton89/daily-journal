import { describe, expect, it } from "vitest";
import { caretOverlapScroll, placeFormatPill } from "@/lib/format-chrome";

describe("placeFormatPill", () => {
  it("sits just below the selection when there is room", () => {
    const place = placeFormatPill({
      selectionTop: 100,
      selectionBottom: 124,
      selectionLeft: 40,
      viewportWidth: 390,
      viewportHeight: 700,
      pillWidth: 112,
      pillHeight: 44,
    });
    expect(place.above).toBe(false);
    expect(place.top).toBe(132);
    expect(place.left).toBe(40);
  });

  it("flips above the selection when the pill would leave the screen", () => {
    const place = placeFormatPill({
      selectionTop: 640,
      selectionBottom: 664,
      selectionLeft: 40,
      viewportWidth: 390,
      viewportHeight: 700,
      pillWidth: 112,
      pillHeight: 44,
    });
    expect(place.above).toBe(true);
    expect(place.top).toBeLessThan(640);
  });
});

describe("caretOverlapScroll", () => {
  const button = { top: 620, bottom: 664, left: 300, right: 360 };

  it("scrolls when the caret sits on the Aa button", () => {
    expect(
      caretOverlapScroll(
        { top: 630, bottom: 654, left: 320, right: 322 },
        button
      )
    ).toBeGreaterThan(0);
  });

  it("leaves a caret on the other side of the line alone", () => {
    expect(
      caretOverlapScroll(
        { top: 630, bottom: 654, left: 20, right: 22 },
        button
      )
    ).toBe(0);
  });
});
