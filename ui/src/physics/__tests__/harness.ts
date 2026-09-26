import { BoatDynamics } from "../BoatDynamics.ts"
import type { ForceBreakdown } from "../BoatDynamics.ts"
import type { BoatSpec } from "../model/BoatSpec.ts"
import type { BoatState } from "../model/BoatState.ts"
import type { Controls } from "../model/Controls.ts"
import type { PhysicsEnvironment } from "../model/Environment.ts"
import { createBoatState } from "../model/BoatState.ts"
import { createControls } from "../model/Controls.ts"
import { createEnvironment } from "../model/Environment.ts"
import { DEFAULT_YACHT } from "../boats/defaultYacht.ts"
import { PHYSICS_DT } from "../fluids/constants.ts"
import { TelemetryLog, type TelemetryRow } from "../calibration/Telemetry.ts"

export const KNOT = 0.514444

export function knots(value: number): number {
  return value * KNOT
}

export function toKnots(value: number): number {
  return value / KNOT
}

export interface RunOptions {
  boat?: BoatSpec
  state?: Partial<BoatState>
  env?: Partial<PhysicsEnvironment>
  /** Controls, either fixed or a function of elapsed time. */
  controls?: Controls | ((t: number) => Controls)
  duration: number
  dt?: number
  /** Stop early once this returns true. */
  until?: (state: BoatState, t: number) => boolean
  onStep?: (state: BoatState, forces: ForceBreakdown, t: number) => void
  /** Record a telemetry row every `record` seconds. */
  record?: number
}

export interface RunResult {
  state: BoatState
  forces: ForceBreakdown
  /** Seconds actually simulated. */
  time: number
  /** Populated when `record` was set. */
  telemetry: TelemetryRow[]
}

/** Runs the real fixed-step dynamics; nothing here bypasses the force model. */
export function run(options: RunOptions): RunResult {
  const boat = options.boat ?? DEFAULT_YACHT
  const dynamics = new BoatDynamics(boat)
  const dt = options.dt ?? PHYSICS_DT
  const env = createEnvironment(options.env)

  const controlsAt =
    typeof options.controls === "function"
      ? options.controls
      : ((): Controls => (options.controls ?? createControls()) as Controls)

  let state = createBoatState(options.state)
  let t = 0
  let forces = dynamics.computeForces(state, controlsAt(0), env)

  const log = options.record ? new TelemetryLog(options.record) : null
  log?.record(0, state, forces)
  options.onStep?.(state, forces, 0)

  const steps = Math.round(options.duration / dt)
  for (let i = 0; i < steps; i++) {
    const result = dynamics.step(state, controlsAt(t), env, dt)
    state = result.state
    forces = result.forces
    t += dt
    options.onStep?.(state, forces, t)
    log?.record(t, state, forces)
    if (options.until?.(state, t)) break
  }

  return { state, forces, time: t, telemetry: log?.rows ?? [] }
}

/** Ground speed [m/s] including the current. */
export function groundSpeed(result: RunResult): number {
  return Math.hypot(result.forces.groundVelocity.x, result.forces.groundVelocity.y)
}

export function waterSpeed(state: BoatState): number {
  return Math.hypot(state.u, state.v)
}

/** Distance travelled over ground from the origin. */
export function distanceFromOrigin(state: BoatState): number {
  return Math.hypot(state.x, state.y)
}
