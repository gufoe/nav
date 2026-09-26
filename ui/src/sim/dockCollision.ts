import { hullOutlineWorld } from "../render/boatHullOutline.ts"
import { convexPolygonsOverlap, type PolyPoint } from "../collision/convexPolygon.ts"
import type { BoatState } from "../physics/model/BoatState.ts"
import type { BoatSpec } from "../physics/model/BoatSpec.ts"
import type { Dock } from "./types.ts"

export function dockPolygon(dock: Dock): PolyPoint[] {
  const hl = dock.length / 2
  const hw = dock.width / 2
  const local: PolyPoint[] = [
    { x: hl, y: hw },
    { x: hl, y: -hw },
    { x: -hl, y: -hw },
    { x: -hl, y: hw },
  ]
  const cos = Math.cos(dock.heading)
  const sin = Math.sin(dock.heading)
  return local.map(({ x, y }) => ({
    x: dock.position.x + x * cos - y * sin,
    y: dock.position.y + x * sin + y * cos,
  }))
}

/** True when the visible hull outline intersects the dock deck rectangle. */
export function boatHullHitsDock(
  boat: BoatState,
  spec: BoatSpec,
  dock: Dock,
): boolean {
  const hull = hullOutlineWorld(
    boat.x,
    boat.y,
    boat.heading,
    spec.lengthOverall,
    spec.beam,
  )
  return convexPolygonsOverlap(hull, dockPolygon(dock))
}
