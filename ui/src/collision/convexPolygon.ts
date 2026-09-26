export type PolyPoint = { readonly x: number; readonly y: number }

function projectPolygon(
  corners: readonly PolyPoint[],
  axisX: number,
  axisY: number,
): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const p of corners) {
    const t = p.x * axisX + p.y * axisY
    if (t < min) min = t
    if (t > max) max = t
  }
  return { min, max }
}

function edgeNormals(poly: readonly PolyPoint[]): PolyPoint[] {
  const axes: PolyPoint[] = []
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i]!
    const p2 = poly[(i + 1) % poly.length]!
    const ex = p2.x - p1.x
    const ey = p2.y - p1.y
    const len = Math.hypot(ex, ey)
    if (len < 1e-9) continue
    axes.push({ x: -ey / len, y: ex / len })
  }
  return axes
}

/** Separating-axis test for two convex polygons. */
export function convexPolygonsOverlap(
  a: readonly PolyPoint[],
  b: readonly PolyPoint[],
): boolean {
  if (a.length < 3 || b.length < 3) return false
  const axes = [...edgeNormals(a), ...edgeNormals(b)]
  for (const { x: ax, y: ay } of axes) {
    const pa = projectPolygon(a, ax, ay)
    const pb = projectPolygon(b, ax, ay)
    if (pa.max < pb.min || pb.max < pa.min) return false
  }
  return true
}
