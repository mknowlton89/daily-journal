import { describe, expect, it } from "vitest";
import {
  caretScrollDelta,
  keyboardInsetPx,
  toolbarShiftPx,
} from "@/lib/mobile-viewport";

describe("keyboardInsetPx", () => {
  it("is zero when the visual viewport fills the layout viewport", () => {
    expect(keyboardInsetPx(800, 800)).toBe(0);
  });

  it("measures the gap the keyboard covers", () => {
    expect(keyboardInsetPx(800, 500)).toBe(300);
  });

  it("never returns a negative inset", () => {
    expect(keyboardInsetPx(800, 900)).toBe(0);
  });
});

describe("toolbarShiftPx", () => {
  it("leaves a bar that is already sitting on the visual bottom", () => {
    expect(toolbarShiftPx(776, 800, 24)).toBe(0);
  });

  it("lifts a bar that has fallen behind the keyboard", () => {
    expect(toolbarShiftPx(776, 500, 24)).toBe(300);
  });

  it("drops a bar that is floating above the visual bottom", () => {
    expect(toolbarShiftPx(400, 800, 24)).toBe(-376);
  });
});

describe("caretScrollDelta", () => {
  it("scrolls down when the caret is behind the toolbar", () => {
    expect(caretScrollDelta(620, 644, 700)).toBeGreaterThan(0);
  });

  it("scrolls up when the caret is behind the sticky nav", () => {
    expect(caretScrollDelta(10, 34, 700)).toBeLessThan(0);
  });

  it("leaves a visible caret alone", () => {
    expect(caretScrollDelta(200, 224, 700)).toBe(0);
  });
});
