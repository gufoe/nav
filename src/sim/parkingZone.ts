import type { Dock } from "./types.ts"
import { BERTH_HOLD } from "./parkingHold.ts"

/** Default strict berth limits (see {@link BERTH_HOLD}). */
export const PARKING_MAX_SOG = BERTH_HOLD.maxSog
export const PARKING_MAX_YAW_RATE = BERTH_HOLD.maxYawRate
export const PARKING_HOLD_SECONDS = BERTH_HOLD.holdSeconds

/** Most levels use three holds; Basics 1 uses two. */
export const CHECKPOINTS_PER_LEVEL = 3
export const MIN_CHECKPOINTS = 2
export const MAX_CHECKPOINTS = 3

/** Oriented rectangle in world space (same layout as {@link Dock}). */
export type ParkingZone = Dock

export function pointInParkingZone(
  worldX: number,
  worldY: number,
  zone: ParkingZone,
): boolean {
  const dx = worldX - zone.position.x
  const dy = worldY - zone.position.y
  const cos = Math.cos(-zone.heading)
  const sin = Math.sin(-zone.heading)
  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos
  return (
    Math.abs(localX) <= zone.length / 2 && Math.abs(localY) <= zone.width / 2
  )
}

export function boatInParkingZone(
  boat: { x: number; y: number },
  zone: ParkingZone,
): boolean {
  return pointInParkingZone(boat.x, boat.y, zone)
}

function zoneCorners(zone: ParkingZone): { x: number; y: number }[] {
  const hl = zone.length / 2
  const hw = zone.width / 2
  const local = [
    { x: hl, y: hw },
    { x: hl, y: -hw },
    { x: -hl, y: -hw },
    { x: -hl, y: hw },
  ]
  const cos = Math.cos(zone.heading)
  const sin = Math.sin(zone.heading)
  return local.map(({ x, y }) => ({
    x: zone.position.x + x * cos - y * sin,
    y: zone.position.y + x * sin + y * cos,
  }))
}

function projectPolygon(
  corners: { x: number; y: number }[],
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

/** True if two oriented hold boxes share any area. */
export function parkingZonesOverlap(a: ParkingZone, b: ParkingZone): boolean {
  const ca = zoneCorners(a)
  const cb = zoneCorners(b)
  const axes = [
    { x: Math.cos(a.heading), y: Math.sin(a.heading) },
    { x: -Math.sin(a.heading), y: Math.cos(a.heading) },
    { x: Math.cos(b.heading), y: Math.sin(b.heading) },
    { x: -Math.sin(b.heading), y: Math.cos(b.heading) },
  ]
  for (const { x: ax, y: ay } of axes) {
    const pa = projectPolygon(ca, ax, ay)
    const pb = projectPolygon(cb, ax, ay)
    if (pa.max < pb.min || pb.max < pa.min) return false
  }
  return true
}
