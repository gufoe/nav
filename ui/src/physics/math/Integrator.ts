import type { BoatState } from "../model/BoatState.ts"
import type { BoatSpec } from "../model/BoatSpec.ts"
import type { Wrench2D } from "./Wrench.ts"
import { bodyToWorld } from "./Frames.ts"
import { wrapAngle } from "../../math/MathUtil.ts"

/**
 * Semi-implicit Euler on M ν̇ + C(ν)ν = τ, then the pose from the
 * water-relative velocity plus the current.
 *
 * M includes optional sway–yaw added-mass coupling; C is the matching
 * Coriolis coupling, including the Munk moment that makes a hull want to broach.
 */
export function integrateRigidBody(
  state: BoatState,
  tau: Wrench2D,
  boat: BoatSpec,
  currentWorld: { x: number; y: number },
  dt: number,
): BoatState {
  const mU = boat.mass + boat.addedMass.surge
  const mV = boat.mass + boat.addedMass.sway
  const iZ = boat.yawInertia + boat.addedMass.yaw
  const yR = boat.addedMass.swayYaw ?? 0
  const nV = boat.addedMass.yawSway ?? 0

  const { u, v, r } = state

  const uDot = (tau.fx + mV * v * r) / mU

  const fV = tau.fy - mU * u * r
  const fR = tau.mz - (mV - mU) * u * v
  const det = mV * iZ - yR * nV
  let vDot: number
  let rDot: number
  if (Math.abs(det) < 1e-9) {
    vDot = fV / mV
    rDot = fR / iZ
  } else {
    vDot = (fV * iZ - fR * yR) / det
    rDot = (fR * mV - fV * nV) / det
  }

  const uNext = u + uDot * dt
  const vNext = v + vDot * dt
  const rNext = r + rDot * dt

  const headingNext = wrapAngle(state.heading + rNext * dt)
  const waterWorld = bodyToWorld(uNext, vNext, headingNext)

  return {
    ...state,
    x: state.x + (waterWorld.x + currentWorld.x) * dt,
    y: state.y + (waterWorld.y + currentWorld.y) * dt,
    heading: headingNext,
    u: uNext,
    v: vNext,
    r: rNext,
  }
}
