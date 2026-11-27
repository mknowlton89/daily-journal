export type PillPlacement = {
  top: number;
  left: number;
  above: boolean;
};

/** Place the Format pill just under the selection, flipping above when it would not fit. */
export function placeFormatPill({
  selectionTop,
  selectionBottom,
  selectionLeft,
  viewportWidth,
  viewportHeight,
  pillWidth,
  pillHeight,
  panelHeight = 0,
  offsetTop = 0,
  offsetLeft = 0,
}: {
  selectionTop: number;
  selectionBottom: number;
  selectionLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  pillWidth: number;
  pillHeight: number;
  panelHeight?: number;
  offsetTop?: number;
  offsetLeft?: number;
}): PillPlacement {
  const gap = 8;
  const needed = pillHeight + gap + panelHeight + 8;
  const spaceBelow = viewportHeight - selectionBottom;
  const above = spaceBelow < needed && selectionTop > spaceBelow;
  const top = above ? selectionTop - gap - pillHeight - panelHeight : selectionBottom + gap;
  const left = Math.max(
    8,
    Math.min(selectionLeft, Math.max(8, viewportWidth - pillWidth - 8))
  );
  return {
    top: Math.round(top + offsetTop),
    left: Math.round(left + offsetLeft),
    above,
  };
}

/** Scroll the caret up when it sits on the floating Aa control. */
export function caretOverlapScroll(
  caret: { top: number; bottom: number; left: number; right: number },
  obstacle: { top: number; bottom: number; left: number; right: number } | null,
  padding = 12
) {
  if (!obstacle) return 0;
  const vertical =
    caret.bottom > obstacle.top - padding && caret.top < obstacle.bottom + padding;
  const horizontal =
    caret.right > obstacle.left - padding && caret.left < obstacle.right + padding;
  if (!vertical || !horizontal) return 0;
  return Math.ceil(caret.bottom - (obstacle.top - padding));
}
