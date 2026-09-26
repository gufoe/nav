import type { ParkingZone } from "./parkingZone.ts"

/** Corners of an oriented parking rectangle in world space. */
function zoneCorners(zone: ParkingZone): { x: number; y: number }[] {
  const { x: cx, y: cy } = zone.position
  const h = zone.heading
  const cos = Math.cos(h)
  const sin = Math.sin(h)
  const hl = zone.length / 2
  const hw = zone.width / 2
  const local: [number, number][] = [
    [hl, hw],
    [hl, -hw],
    [-hl, -hw],
    [-hl, hw],
  ]
  return local.map(([lx, ly]) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  }))
}

function pointInZone(px: number, py: number, zone: ParkingZone): boolean {
  const dx = px - zone.position.x
  const dy = py - zone.position.y
  const cos = Math.cos(-zone.heading)
  const sin = Math.sin(-zone.heading)
  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos
  return (
    Math.abs(localX) <= zone.length / 2 && Math.abs(localY) <= zone.width / 2
  )
}

/** True if two oriented rectangles share any area. */
export function parkingZonesOverlap(a: ParkingZone, b: ParkingZone): boolean {
  for (const corner of zoneCorners(a)) {
    if (pointInZone(corner.x, corner.y, b)) return true
  }
  for (const corner of zoneCorners(b)) {
    if (pointInZone(corner.x, corner.y, a)) return true
  }
  return false
}
