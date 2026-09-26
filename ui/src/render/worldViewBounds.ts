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
