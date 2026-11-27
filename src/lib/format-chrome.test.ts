import { describe, expect, it } from "vitest";
import { placeFormatPill } from "@/lib/format-chrome";

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
