import type { BoatSpec } from "../model/BoatSpec.ts"
import { wrenchFromForceAtPoint, zeroWrench, type Wrench2D } from "../math/Wrench.ts"

/**
 * Prop walk: the unbalanced blade loading of a shaft-drive propeller pushes
 * the stern sideways. Weak ahead, strong astern, and it reverses with the
 * direction of rotation.
 *
 * Modelled as a side force at the propeller, a fraction of thrust magnitude.
 * Those fractions are tuning parameters, not universal constants.
 */
export function propWalkForce(thrust: number, boat: BoatSpec): Wrench2D {
  const p = boat.propeller
  if (Math.abs(thrust) < 1) return zeroWrench()

  const astern = thrust < 0
  const fraction = astern ? p.reverseWalk : p.forwardWalk
  // A right-hand prop (+1) walks the stern to port astern, to starboard ahead.
  const toPort = astern ? p.propWalkDirection : -p.propWalkDirection

  return wrenchFromForceAtPoint(0, toPort * fraction * Math.abs(thrust), p.x, p.y)
}
