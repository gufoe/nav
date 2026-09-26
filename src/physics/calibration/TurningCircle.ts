import type { BoatState } from "../model/BoatState.ts"
import { wrapAngle } from "../../math/MathUtil.ts"

/** Standard manoeuvring metrics for a sustained turn (see e.g. turning-circle trials). */
export interface TurningCircleResult {
  /** Along-track distance from start when heading has changed 90° [m]. */
  advance90: number
  /** Perpendicular distance from the initial track at 90° heading change [m]. */
  transfer90: number
  /** Width of the turn at 180° heading change [m] (perpendicular separation). */
  tacticalDiameter180: number
  /** Steady-state diameter from V/|r| [m]. */
  steadyDiameter: number
  steadySpeed: number
  steadyYawRate: number
}

export interface TurningCircleSample {
  state: BoatState
  time: number
}

/**
 * Derives advance / transfer / tactical diameter from a turn simulation log.
 * `initialHeading` is the heading at turn initiation; positive `headingDelta`
 * means the bow turned to port (CCW in world frame).
 */
export function analyzeTurningCircle(
  samples: TurningCircleSample[],
  initialHeading: number,
  turnSign: 1 | -1,
): TurningCircleResult {
  const origin = samples[0]?.state ?? { x: 0, y: 0, heading: initialHeading, u: 0, v: 0, r: 0 }
  const h0 = initialHeading
  const forward = { x: Math.cos(h0), y: Math.sin(h0) }
  const toPort = { x: -Math.sin(h0), y: Math.cos(h0) }

  let advance90 = NaN
  let transfer90 = NaN
  let tacticalDiameter180 = NaN

  for (const { state } of samples) {
    const delta = wrapAngle(state.heading - h0)
    const signed = turnSign * delta

    const dx = state.x - origin.x
    const dy = state.y - origin.y
    const advance = dx * forward.x + dy * forward.y
    const transfer = dx * toPort.x + dy * toPort.y

    if (Number.isNaN(advance90) && signed >= Math.PI / 2 - 1e-3) {
      advance90 = advance
      transfer90 = transfer
    }
    if (Number.isNaN(tacticalDiameter180) && signed >= Math.PI - 1e-3) {
      tacticalDiameter180 = 2 * Math.abs(transfer)
    }
  }

  const last = samples[samples.length - 1]?.state ?? origin
  const steadySpeed = Math.hypot(last.u, last.v)
  const steadyYawRate = last.r
  const steadyDiameter =
    Math.abs(steadyYawRate) > 1e-6 ? (2 * steadySpeed) / Math.abs(steadyYawRate) : NaN

  return {
    advance90,
    transfer90,
    tacticalDiameter180,
    steadyDiameter,
    steadySpeed,
    steadyYawRate,
  }
}
