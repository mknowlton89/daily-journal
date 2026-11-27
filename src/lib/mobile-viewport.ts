/** Height of the area the keyboard covers. Scroll position is ignored so padding stays put while the page pans. */
export function keyboardInsetPx(layoutHeight: number, viewportHeight: number) {
  if (!Number.isFinite(layoutHeight) || !Number.isFinite(viewportHeight)) {
    return 0;
  }
  return Math.max(0, Math.round(layoutHeight - viewportHeight));
}

/** How far a fixed bar must move up so it sits `gap` px above the visual viewport bottom. */
export function toolbarShiftPx(
  barBottom: number,
  visualHeight: number,
  gap: number
) {
  if (
    !Number.isFinite(barBottom) ||
    !Number.isFinite(visualHeight) ||
    !Number.isFinite(gap)
  ) {
    return 0;
  }
  return Math.round(barBottom - (visualHeight - gap));
}

const NAV_CLEARANCE = 56;
const TOOLBAR_CLEARANCE = 64;

/** How far to scroll so the caret stays between the sticky nav and the toolbar. */
export function caretScrollDelta(
  caretTop: number,
  caretBottom: number,
  visibleHeight: number
) {
  if (
    !Number.isFinite(caretTop) ||
    !Number.isFinite(caretBottom) ||
    !Number.isFinite(visibleHeight)
  ) {
    return 0;
  }
  const topLimit = NAV_CLEARANCE + 12;
  const bottomLimit = visibleHeight - TOOLBAR_CLEARANCE - 12;
  if (caretBottom > bottomLimit) return Math.ceil(caretBottom - bottomLimit);
  if (caretTop < topLimit) return Math.floor(caretTop - topLimit);
  return 0;
}
