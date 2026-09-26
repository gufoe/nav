import type { BoatSpec } from "../model/BoatSpec.ts"
import type { ApparentWind } from "../fluids/ApparentWind.ts"
import { wrenchFromForceAtPoint, type Wrench2D } from "../math/Wrench.ts"
import { AIR_DENSITY } from "../fluids/constants.ts"

/**
 * Windage on hull, rig and coachroof, from apparent wind, with separate
 * frontal and lateral projected areas. Applied at the centre of windage, so
 * a beam wind both drifts the boat and swings it.
 */
export function windageForce(boat: BoatSpec, aw: ApparentWind): Wrench2D {
  const w = boat.windage
  const fx =
    0.5 * AIR_DENSITY * w.cdFront * w.frontalArea * aw.bodyX * Math.abs(aw.bodyX)
  const fy =
    0.5 * AIR_DENSITY * w.cdSide * w.lateralArea * aw.bodyY * Math.abs(aw.bodyY)
  return wrenchFromForceAtPoint(fx, fy, w.centerX, w.centerY)
}
