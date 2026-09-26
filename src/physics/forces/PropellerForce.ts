import type { BoatState } from "../model/BoatState.ts"
import type { BoatSpec } from "../model/BoatSpec.ts"
import { wrenchFromForceAtPoint, zeroWrench, type Wrench2D } from "../math/Wrench.ts"
import { WATER_DENSITY } from "../fluids/constants.ts"
import {
  advanceCoefficient,
  slipstreamArea,
  slipstreamSpeed,
  thrustCoefficient,
} from "../calibration/PropellerCurve.ts"

export interface PropellerResult {
  wrench: Wrench2D
  /** Thrust along the shaft [N], signed. */
  thrust: number
  /** Shaft revolutions per second, signed. */
  shaftRps: number
  advanceCoefficient: number
  /** Axial flow speed the rudder sees from the slipstream [m/s], 0 astern. */
  washSpeed: number
  /** Cross-section of that slipstream [m²]. */
  washArea: number
}

const IDLE: PropellerResult = {
  wrench: { fx: 0, fy: 0, mz: 0 },
  thrust: 0,
  shaftRps: 0,
  advanceCoefficient: 0,
  washSpeed: 0,
  washArea: 0,
}

/**
 * Open-water propeller: T = sign(n)·KT(J)·ρ·n²·D⁴, with separate curves ahead
 * and astern. Also reports the slipstream the rudder stands in — that is what
 * makes a burst of throttle steer a stationary boat.
 */
export function propellerForce(state: BoatState, boat: BoatSpec): PropellerResult {
  const p = boat.propeller
  const aheadDemand = state.rpm >= 0
  const ratio = aheadDemand ? boat.gearbox.forwardRatio : boat.gearbox.reverseRatio
  const shaftRps = state.rpm / 60 / Math.max(ratio, 1e-6)
  if (Math.abs(shaftRps) < 0.05) return { ...IDLE, wrench: zeroWrench() }

  const ahead = shaftRps > 0
  const advanceSpeed = state.u * (1 - p.wakeFraction)
  const J = advanceCoefficient(ahead ? advanceSpeed : -advanceSpeed, shaftRps, p.diameter)

  const kt = ahead
    ? thrustCoefficient(J, p.kt0Forward, p.kt1Forward)
    : thrustCoefficient(J, p.kt0Reverse, p.kt1Reverse)

  let thrust =
    Math.sign(shaftRps) * kt * WATER_DENSITY * shaftRps * shaftRps * p.diameter ** 4
  if (!ahead) thrust *= p.reverseEfficiency

  // Astern the jet is thrown forward, away from the rudder.
  const washSpeed =
    thrust > 0
      ? advanceSpeed +
        p.slipstreamGain *
          (slipstreamSpeed(advanceSpeed, thrust, p.diameter, WATER_DENSITY) -
            advanceSpeed)
      : 0

  return {
    wrench: wrenchFromForceAtPoint(thrust, 0, p.x, p.y),
    thrust,
    shaftRps,
    advanceCoefficient: J,
    washSpeed,
    washArea:
      washSpeed > 0 ? slipstreamArea(advanceSpeed, washSpeed, p.diameter) : 0,
  }
}
