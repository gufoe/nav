import {
  frameFromControls,
  replaySimTimeMs,
  stateToReplay,
  type ReplayFrame,
  type ReplayPayloadV2,
  type ReplayState,
} from "../../../shared/replay.ts"
import type { Controls } from "../physics/model/Controls.ts"
import type { BoatState } from "../physics/model/BoatState.ts"
import { PHYSICS_DT } from "../physics/fluids/constants.ts"

export class GameplayRecorder {
  private frames: ReplayFrame[] = []
  private initial: ReplayState | null = null
  private readonly scenarioId: string
  private readonly boatId: string

  constructor(scenarioId: string, boatId: string) {
    this.scenarioId = scenarioId
    this.boatId = boatId
  }

  /** Call whenever the run restarts (scenario enter or R reset). */
  reset(startBoat: BoatState): void {
    this.frames = []
    this.initial = stateToReplay(startBoat)
  }

  /** One entry per physics step — controls that were fed into {@link BoatDynamics.step}. */
  recordStep(controls: Controls): void {
    this.frames.push(frameFromControls(controls))
  }

  finish(): ReplayPayloadV2 {
    if (!this.initial) {
      throw new Error("GameplayRecorder.reset() was never called")
    }
    const fixedDt = PHYSICS_DT
    return {
      v: 2,
      scenarioId: this.scenarioId,
      boatId: this.boatId,
      fixedDt,
      timeMs: replaySimTimeMs({ fixedDt, frames: this.frames }),
      initial: this.initial,
      frames: this.frames,
    }
  }
}
