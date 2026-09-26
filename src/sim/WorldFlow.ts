import type { PhysicsEnvironment } from "../physics/model/Environment.ts"
import type { Environment } from "./types.ts"
import { trueWindVelocityWorld } from "../physics/fluids/ApparentWind.ts"
import { currentVelocityWorld } from "../physics/fluids/Current.ts"
import { clamp } from "../math/MathUtil.ts"

/**
 * Uniform horizontal flow in world coordinates (+x east, +y north).
 * Velocity always points where the medium is moving TO — same as physics forces.
 */
export interface WorldFlow {
  readonly vx: number
  readonly vy: number
  /** Speed [m/s]. */
  readonly speed: number
  /** Travel heading [rad], atan2(vy, vx). */
  readonly headingTo: number
}

/** True wind as a flow plus the meteorological FROM heading stored in scenarios. */
export interface WindFlow extends WorldFlow {
  readonly fromHeading: number
}

function flowFromVelocity(vx: number, vy: number): WorldFlow {
  const speed = Math.hypot(vx, vy)
  if (speed < 1e-9) {
    return { vx: 0, vy: 0, speed: 0, headingTo: 0 }
  }
  return { vx, vy, speed, headingTo: Math.atan2(vy, vx) }
}

/** @returns null when there is nothing worth drawing. */
export function windFlowFrom(env: PhysicsEnvironment): WindFlow | null {
  if (env.windSpeed < 0.2) return null
  const { x, y } = trueWindVelocityWorld(env)
  const base = flowFromVelocity(x, y)
  return { ...base, fromHeading: env.windDirection }
}

export function currentFlowFrom(env: PhysicsEnvironment): WorldFlow | null {
  if (env.currentSpeed < 0.03) return null
  const { x, y } = currentVelocityWorld(env)
  return flowFromVelocity(x, y)
}

/** Unit vector along the flow (downstream / downwind). */
export function flowUnit(flow: WorldFlow): { ux: number; uy: number } {
  const { speed, vx, vy } = flow
  if (speed < 1e-9) return { ux: 1, uy: 0 }
  return { ux: vx / speed, uy: vy / speed }
}

/** Deep-water swell propagation (visual); direction is env.waveDirection (TO). */
export function wavePropagationFlow(env: Environment): WorldFlow | null {
  if (env.waveHeight < 0.02) return null
  const period = Math.max(1.5, env.wavePeriod)
  const wavelength = clamp(1.56 * period * period, 5, 22)
  const speed = wavelength / period
  return flowFromVelocity(
    speed * Math.cos(env.waveDirection),
    speed * Math.sin(env.waveDirection),
  )
}
