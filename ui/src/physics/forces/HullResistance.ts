import type { BoatState } from "../model/BoatState.ts"
import type { BoatSpec } from "../model/BoatSpec.ts"
import type { Wrench2D } from "../math/Wrench.ts"

/**
 * Bare-hull damping D(ν)ν: linear + quadratic in the water-relative motion.
 * Lateral terms are far larger than longitudinal — that asymmetry is what
 * stops the boat sliding sideways like a car on ice.
 */
export function hullResistance(state: BoatState, boat: BoatSpec): Wrench2D {
  const h = boat.hull
  const { u, v, r } = state
  return {
    fx: -h.Xu * u - h.Xuu * Math.abs(u) * u,
    fy: -h.Yv * v - h.Yvv * Math.abs(v) * v,
    mz: -h.Nr * r - h.Nrr * Math.abs(r) * r,
  }
}
