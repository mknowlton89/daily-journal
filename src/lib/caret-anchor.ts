/** Room kept clear of the mobile browser bar that floats above the keyboard. */
export const MOBILE_CHROME_INSET = 72;

/** Room kept clear of the sticky day navigation. */
export const STICKY_NAV_INSET = 52;

export function anchorToCaret({
  caretTop,
  caretBottom,
  caretLeft,
  rootTop,
  rootLeft,
  rootWidth,
  menuWidth,
  menuHeight,
  visibleTop,
  visibleBottom,
}: {
  caretTop: number;
  caretBottom: number;
  caretLeft: number;
  rootTop: number;
  rootLeft: number;
  rootWidth: number;
  menuWidth: number;
  menuHeight: number;
  visibleTop: number;
  visibleBottom: number;
}) {
  const gap = 8;
  const roomBelow = visibleBottom - caretBottom;
  const roomAbove = caretTop - visibleTop;
  const above = roomBelow < menuHeight + gap && roomAbove > roomBelow;
  let top = above
    ? caretTop - rootTop - menuHeight - gap
    : caretBottom - rootTop + gap;
  const minTop = visibleTop - rootTop + gap;
  const maxTop = visibleBottom - rootTop - menuHeight - gap;
  if (maxTop > minTop) top = Math.min(Math.max(top, minTop), maxTop);

  const left = Math.max(
    gap,
    Math.min(caretLeft - rootLeft, Math.max(gap, rootWidth - menuWidth - gap))
  );
  return { top: Math.round(top), left: Math.round(left) };
}

export function caretScrollDelta(
  caretTop: number,
  caretBottom: number,
  visibleTop: number,
  visibleBottom: number
) {
  if (caretBottom > visibleBottom) return caretBottom - visibleBottom;
  if (caretTop < visibleTop) return caretTop - visibleTop;
  return 0;
}

type CaretView = {
  isDestroyed: boolean;
  hasFocus: () => boolean;
  dom: HTMLElement;
  coordsAtPos: (pos: number) => { top: number; bottom: number; left: number };
  state: { selection: { head: number } };
};

export function keyboardOverlap() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  return Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height);
}

export function syncKeyboardOverlap() {
  document.documentElement.style.setProperty(
    "--keyboard-overlap",
    `${Math.round(keyboardOverlap())}px`
  );
}

function visibleBand() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const inset = touch || keyboardOverlap() > 80 ? MOBILE_CHROME_INSET : 16;
  return { top: STICKY_NAV_INSET, bottom: height - inset };
}

export function placePopover(
  view: Pick<CaretView, "dom" | "coordsAtPos">,
  pos: number,
  menuWidth: number,
  menuHeight: number
) {
  const root = view.dom.closest(".journal-editor");
  if (!(root instanceof HTMLElement)) return { top: 8, left: 8 };
  const rootRect = root.getBoundingClientRect();
  const coords = view.coordsAtPos(pos);
  const band = visibleBand();
  return anchorToCaret({
    caretTop: coords.top,
    caretBottom: coords.bottom,
    caretLeft: coords.left,
    rootTop: rootRect.top,
    rootLeft: rootRect.left,
    rootWidth: rootRect.width,
    menuWidth,
    menuHeight,
    visibleTop: band.top,
    visibleBottom: band.bottom,
  });
}

export function revealCaret(view: CaretView) {
  syncKeyboardOverlap();
  requestAnimationFrame(() => {
    if (view.isDestroyed || !view.hasFocus()) return;
    let coords: { top: number; bottom: number };
    try {
      coords = view.coordsAtPos(view.state.selection.head);
    } catch {
      return;
    }
    const band = visibleBand();
    const delta = caretScrollDelta(coords.top, coords.bottom, band.top, band.bottom);
    if (delta !== 0) window.scrollBy(0, delta);
  });
}
