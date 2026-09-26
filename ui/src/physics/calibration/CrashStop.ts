import type { BoatState } from "../model/BoatState.ts"
import { radToDeg, wrapAngle } from "../../math/MathUtil.ts"

export interface CrashStopResult {
  /** Seconds from astern command until STW drops below threshold. */
  timeToStop: number
  /** Forward distance travelled over ground from the start point [m]. */
  headway: number
  maxLateral: number
  headingChangeDeg: number
  /** Yaw rate magnitude near the end of the stop [rad/s]. */
  finalYawRate: number
}

const STOP_SURGE = 0.05

/**
 * Summarises a crash stop from 3 kn ahead with full astern at t = 0.
 * Stop time is when surge speed u crosses zero (STW can stay nonzero from sway).
 */
export function analyzeCrashStop(
  samples: { state: BoatState; time: number }[],
  initialHeading: number,
): CrashStopResult {
  const start = samples[0]?.state
  if (!start) {
    return { timeToStop: NaN, headway: NaN, maxLateral: NaN, headingChangeDeg: 0, finalYawRate: 0 }
  }

  const forward = { x: Math.cos(initialHeading), y: Math.sin(initialHeading) }
  const toPort = { x: -Math.sin(initialHeading), y: Math.cos(initialHeading) }

  let timeToStop = NaN
  let maxLateral = 0
  let headway = 0

  for (const { state, time } of samples) {
    if (Number.isNaN(timeToStop) && state.u <= STOP_SURGE) timeToStop = time

    const dx = state.x - start.x
    const dy = state.y - start.y
    headway = dx * forward.x + dy * forward.y
    maxLateral = Math.max(maxLateral, Math.abs(dx * toPort.x + dy * toPort.y))
  }

  const last = samples[samples.length - 1]?.state ?? start
  const headingChangeDeg = Math.abs(radToDeg(wrapAngle(last.heading - initialHeading)))

  return {
    timeToStop,
    headway,
    maxLateral,
    headingChangeDeg,
    finalYawRate: last.r,
  }
}
