export interface PopoverPos {
  left: number;
  top: number;
  openUp: boolean;
}

/**
 * Calculates fixed coordinates for word tip popovers to fit inside the viewport.
 */
export function popoverPosition(anchorRect: DOMRect): PopoverPos {
  const width = 256;
  const margin = 8;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;

  let left = anchorRect.left + anchorRect.width / 2 - width / 2;
  if (left < margin) left = margin;
  if (left + width > viewportWidth - margin) {
    left = viewportWidth - width - margin;
  }

  const spaceBelow = viewportHeight - anchorRect.bottom;
  const openUp = spaceBelow < 260 && anchorRect.top > 260;
  const top = openUp ? anchorRect.top - margin : anchorRect.bottom + margin;

  return { left, top, openUp };
}
