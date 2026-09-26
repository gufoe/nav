/** Local-frame hull polygon — must match {@link CanvasRenderer.drawBoat} fill outline. */
export type HullPoint = { readonly x: number; readonly y: number }

export function boatHullLocalOutline(length: number, beam: number): HullPoint[] {
  const halfL = length / 2
  const halfB = beam / 2
  return [
    { x: halfL, y: 0 },
    { x: -halfL * 0.7, y: halfB },
    { x: -halfL, y: halfB * 0.4 },
    { x: -halfL, y: -halfB * 0.4 },
    { x: -halfL * 0.7, y: -halfB },
  ]
}

export function hullOutlineWorld(
  centerX: number,
  centerY: number,
  heading: number,
  length: number,
  beam: number,
): HullPoint[] {
  const cos = Math.cos(heading)
  const sin = Math.sin(heading)
  return boatHullLocalOutline(length, beam).map(({ x, y }) => ({
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos,
  }))
}
