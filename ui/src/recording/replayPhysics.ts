import { controlsFromFrame, type ReplayFrame } from "../../../shared/replay.ts"
import { BoatDynamics, type ForceBreakdown } from "../physics/BoatDynamics.ts"
import type { BoatState } from "../physics/model/BoatState.ts"
import type { Controls } from "../physics/model/Controls.ts"
import type { PhysicsEnvironment } from "../physics/model/Environment.ts"
import { createControls } from "../physics/model/Controls.ts"

export function snapshotControls(controls: Controls): Controls {
  return {
    rudder: controls.rudder,
    throttle: controls.throttle,
    mainsheet: controls.mainsheet,
    jibSheet: controls.jibSheet,
    engineEngaged: controls.engineEngaged,
  }
}

export function controlsForReplayFrame(frame: ReplayFrame): Controls {
  return createControls(controlsFromFrame(frame))
}

export function stepReplay(
  dynamics: BoatDynamics,
  state: BoatState,
  frame: ReplayFrame,
  env: PhysicsEnvironment,
  fixedDt: number,
): { state: BoatState; forces: ForceBreakdown } {
  const controls = controlsForReplayFrame(frame)
  return dynamics.step(state, controls, env, fixedDt)
}
