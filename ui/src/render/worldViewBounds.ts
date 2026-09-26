/** World-space AABB visible through a {@link CanvasRenderer.withWorld} transform. */
export interface VisibleWorldBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Maps canvas edges to world meters when the world center is pinned at
 * `(screenCenterX, screenCenterY)` — not always the canvas middle (portrait HUD inset).
 */
export function visibleWorldBounds(
  width: number,
  height: number,
  pixelsPerMeter: number,
  worldCenterX: number,
  worldCenterY: number,
  screenCenterX: number,
  screenCenterY: number,
): VisibleWorldBounds {
  const ppm = pixelsPerMeter
  return {
    minX: worldCenterX + (0 - screenCenterX) / ppm,
    maxX: worldCenterX + (width - screenCenterX) / ppm,
    minY: worldCenterY - (height - screenCenterY) / ppm,
    maxY: worldCenterY + screenCenterY / ppm,
  }
}

/** Project visible corners onto flow axes through world origin (swell / flow reach). */
export function flowAlignedReach(
  bounds: VisibleWorldBounds,
  ux: number,
  uy: number,
): { crossReach: number; alongMin: number; alongMax: number } {
  const px = -uy
  const py = ux
  const corners: [number, number][] = [
    [bounds.minX, bounds.minY],
    [bounds.minX, bounds.maxY],
    [bounds.maxX, bounds.minY],
    [bounds.maxX, bounds.maxY],
  ]
  let crossReach = 0
  let alongMin = Infinity
  let alongMax = -Infinity
  for (const [wx, wy] of corners) {
    const along = ux * wx + uy * wy
    const cross = px * wx + py * wy
    crossReach = Math.max(crossReach, Math.abs(cross))
    alongMin = Math.min(alongMin, along)
    alongMax = Math.max(alongMax, along)
  }
  return { crossReach, alongMin, alongMax }
}
