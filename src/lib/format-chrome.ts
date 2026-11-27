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
