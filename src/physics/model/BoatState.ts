/**
 * 3-DOF boat state (Fossen surface craft) plus actuator state.
 *
 * u, v are velocities **relative to the water**; x, y, heading are the pose
 * over ground. See math/Frames.ts for the sign conventions.
 */
export interface BoatState {
  /** World position [m]. */
  x: number
  y: number
  /** Heading ψ [rad], 0 = +world X (east), CCW positive. */
  heading: number

  /** Surge relative to water [m/s], + = ahead. */
  u: number
  /** Sway relative to water [m/s], + = to port. */
  v: number
  /** Yaw rate [rad/s], + = bow to port. */
  r: number

  /** Actual engine rpm (signed: negative = astern gear). */
  rpm: number
  /** Actual rudder chord angle [rad], + = steering to starboard. */
  rudderAngle: number
}

export function createBoatState(partial: Partial<BoatState> = {}): BoatState {
  return {
    x: 0,
    y: 0,
    heading: 0,
    u: 0,
    v: 0,
    r: 0,
    rpm: 0,
    rudderAngle: 0,
    ...partial,
  }
}

export function cloneBoatState(s: BoatState): BoatState {
  return { ...s }
}

/** Speed through the water [m/s]. */
export function speedThroughWater(s: BoatState): number {
  return Math.hypot(s.u, s.v)
}

/** Leeway / drift angle [rad]: angle between heading and water track. */
export function driftAngle(s: BoatState): number {
  if (Math.hypot(s.u, s.v) < 1e-3) return 0
  return Math.atan2(s.v, s.u)
}
