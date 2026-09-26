import type { PhysicsEnvironment } from "../model/Environment.ts"
import { worldToBody } from "../math/Frames.ts"

export interface ApparentWind {
  /** Apparent wind velocity in body frame [m/s] (points downwind). */
  bodyX: number
  bodyY: number
  speed: number
  /** Direction the apparent wind blows FROM, relative to the bow [rad]. */
  angleFromBow: number
}

/** True wind as a velocity vector (points downwind), world frame. */
export function trueWindVelocityWorld(env: PhysicsEnvironment): {
  x: number
  y: number
} {
  const to = env.windDirection + Math.PI
  return { x: env.windSpeed * Math.cos(to), y: env.windSpeed * Math.sin(to) }
}

/**
 * Apparent wind = true wind − boat velocity over ground, expressed in the
 * body frame. Air does not care about the current, so ground velocity is
 * the right one here.
 */
export function computeApparentWind(
  heading: number,
  env: PhysicsEnvironment,
  groundVelWorld: { x: number; y: number },
): ApparentWind {
  const tw = trueWindVelocityWorld(env)
  const body = worldToBody(tw.x - groundVelWorld.x, tw.y - groundVelWorld.y, heading)
  const speed = Math.hypot(body.x, body.y)
  return {
    bodyX: body.x,
    bodyY: body.y,
    speed,
    // Wind velocity points downwind, so the bearing it comes FROM is reversed.
    angleFromBow: Math.atan2(-body.y, -body.x),
  }
}
