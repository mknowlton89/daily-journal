/** Room kept clear of the mobile browser bar that floats above the keyboard. */
export const MOBILE_CHROME_INSET = 72;

/** Room kept clear of the sticky day navigation. */
export const STICKY_NAV_INSET = 52;

export type PopoverPlace = {
  left: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

let pointerDown = false;

export function setCaretPointerDown(down: boolean) {
  pointerDown = down;
}

export function anchorToCaret({
  caretTop,
  caretBottom,
  caretLeft,
  rootTop,
  rootLeft,
  rootWidth,
  rootHeight,
  menuWidth,
  visibleTop,
  visibleBottom,
}: {
  caretTop: number;
  caretBottom: number;
  caretLeft: number;
  rootTop: number;
  rootLeft: number;
  rootWidth: number;
  rootHeight: number;
  menuWidth: number;
  visibleTop: number;
  visibleBottom: number;
}): PopoverPlace {
  const gap = 8;
  const roomBelow = visibleBottom - caretBottom - gap;
  const roomAbove = caretTop - visibleTop - gap;
  const above = roomBelow < 120 && roomAbove > roomBelow;
  const left = Math.round(
    Math.max(gap, Math.min(caretLeft - rootLeft, Math.max(gap, rootWidth - menuWidth - gap)))
  );

  if (above) {
    return {
      left,
      maxHeight: Math.max(48, Math.round(roomAbove)),
      bottom: Math.round(rootHeight - (caretTop - rootTop) + gap),
    };
  }

  return {
    left,
    maxHeight: Math.max(48, Math.round(roomBelow)),
    top: Math.round(caretBottom - rootTop + gap),
  };
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
  menuWidth: number
): PopoverPlace {
  const root = view.dom.closest(".journal-editor");
  if (!(root instanceof HTMLElement)) return { top: 8, left: 8, maxHeight: 240 };
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
    rootHeight: rootRect.height,
    menuWidth,
    visibleTop: band.top,
    visibleBottom: band.bottom,
  });
}

export function revealCaret(view: CaretView) {
  if (pointerDown) return;
  syncKeyboardOverlap();
  requestAnimationFrame(() => {
    if (pointerDown || view.isDestroyed || !view.hasFocus()) return;
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
