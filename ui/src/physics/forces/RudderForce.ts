import type { BoatState } from "../model/BoatState.ts"
import type { BoatSpec } from "../model/BoatSpec.ts"
import { symmetricFoilForce } from "../fluids/Foil.ts"
import { WATER_DENSITY } from "../fluids/constants.ts"
import { velocityAtPoint } from "../math/Frames.ts"
import { wrenchFromForceAtPoint, type Wrench2D } from "../math/Wrench.ts"
import { clamp, smoothstep } from "../../math/MathUtil.ts"

export interface RudderResult {
  wrench: Wrench2D
  /** Angle of attack on the washed part of the blade [rad]. */
  alpha: number
  stalled: boolean
  /** Flow speed over the washed part [m/s]. */
  flowSpeed: number
}

/**
 * Rudder as a foil, using the flow **at the rudder**: hull flow plus the yaw
 * contribution of the stern, plus propeller slipstream over the washed part
 * of the blade.
 *
 * Because force goes with V², the rudder is nearly useless at rest — unless
 * the propeller is throwing water over it.
 *
 * Sign: state.rudderAngle > 0 steers to starboard, which means the blade's
 * chord points forward-and-to-port.
 */
export function rudderForce(
  state: BoatState,
  boat: BoatSpec,
  washSpeed = 0,
  washArea = 0,
  /** Signed shaft thrust [N]; used to detect astern (no wash) backing. */
  thrust = 0,
): RudderResult {
  const rd = boat.rudder
  const maxAngle = boat.steering.maxAngle
  const chordAngle = clamp(state.rudderAngle, -maxAngle, maxAngle)
  const vel = velocityAtPoint(state.u, state.v, state.r, rd.x, rd.y)

  // The jet is narrower than the blade, so the washed patch is whichever of
  // the two is smaller. Only that patch sees the accelerated water.
  const washedArea = Math.min(rd.area * clamp(rd.washAreaFraction, 0, 1), washArea)
  const freeArea = rd.area - washedArea
  const washedVelX = Math.max(vel.x, washSpeed)

  const washed = symmetricFoilForce(
    washedVelX,
    vel.y,
    chordAngle,
    washedArea,
    WATER_DENSITY,
    rd.aspectRatio,
    rd.cd0,
    rd.oswald,
  )
  const free = symmetricFoilForce(
    vel.x,
    vel.y,
    chordAngle,
    freeArea,
    WATER_DENSITY,
    rd.aspectRatio,
    rd.cd0,
    rd.oswald,
  )

  let fx = washed.fx + free.fx
  let fy = washed.fy + free.fy

  // Astern: no slipstream over the rudder; authority comes from sternway only.
  // Once |u| builds, boost slightly so hard helm can steer against prop walk.
  if (thrust < -50 && washSpeed <= 0) {
    const sternway = Math.max(-vel.x, 0)
    const t = smoothstep(0.25, 1.4, sternway)
    const gain = 1 + rd.asternAuthority * t
    fx *= gain
    fy *= gain
  }

  const wrench = wrenchFromForceAtPoint(fx, fy, rd.x, rd.y)

  return {
    wrench,
    alpha: washed.alpha,
    stalled: washed.coefficients.stalled,
    flowSpeed: washed.speed,
  }
}
