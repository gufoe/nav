import type { BoatState } from "../model/BoatState.ts"
import type { PhysicsEnvironment } from "../model/Environment.ts"
import { bodyToWorld } from "../math/Frames.ts"

/**
 * Hydrodynamic forces depend on motion through the water; position depends on
 * motion over ground. The current is the only difference between the two.
 */

export function currentVelocityWorld(env: PhysicsEnvironment): {
  x: number
  y: number
} {
  return {
    x: env.currentSpeed * Math.cos(env.currentDirection),
    y: env.currentSpeed * Math.sin(env.currentDirection),
  }
}

/** Ground velocity = water-relative velocity + current. */
export function groundVelocityWorld(
  state: BoatState,
  currentWorld: { x: number; y: number },
): { x: number; y: number } {
  const water = bodyToWorld(state.u, state.v, state.heading)
  return { x: water.x + currentWorld.x, y: water.y + currentWorld.y }
}
