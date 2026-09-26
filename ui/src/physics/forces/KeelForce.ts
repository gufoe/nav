import type { BoatState } from "../model/BoatState.ts"
import type { BoatSpec } from "../model/BoatSpec.ts"
import { symmetricFoilForce } from "../fluids/Foil.ts"
import { WATER_DENSITY } from "../fluids/constants.ts"
import { velocityAtPoint } from "../math/Frames.ts"
import { wrenchFromForceAtPoint, zeroWrench, type Wrench2D } from "../math/Wrench.ts"

/**
 * Keel as a symmetric foil fixed on the centreline. Under sail this is what
 * converts leeway into side force and keeps the boat from sliding downwind.
 */
export function keelForce(state: BoatState, boat: BoatSpec): Wrench2D {
  const k = boat.keel
  if (!k.enabled || k.area <= 0) return zeroWrench()

  const vel = velocityAtPoint(state.u, state.v, state.r, k.x, k.y)
  const foil = symmetricFoilForce(
    vel.x,
    vel.y,
    0, // chord is the centreline
    k.area,
    WATER_DENSITY,
    k.aspectRatio,
    k.cd0,
    k.oswald,
  )

  return wrenchFromForceAtPoint(foil.fx, foil.fy, k.x, k.y)
}
