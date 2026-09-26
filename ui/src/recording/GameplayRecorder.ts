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
  reset(_startBoat: BoatState): void {
    this.frames = []
    this.initial = null
  }

  get hasRecording(): boolean {
    return this.frames.length > 0
  }

  /**
   * Pose/actuators immediately before the first recorded physics step.
   * Must match the state replay integrates from when recording starts mid-run.
   */
  setInitial(stateBeforeFirstStep: BoatState): void {
    if (this.initial !== null) return
    this.initial = stateToReplay(stateBeforeFirstStep)
  }

  /** One entry per physics step — controls that were fed into {@link BoatDynamics.step}. */
  recordStep(controls: Controls): void {
    this.frames.push(frameFromControls(controls))
  }

  /** Recorded simulation time (scoreboard), from physics step count only. */
  simTimeMs(): number {
    return replaySimTimeMs({ fixedDt: PHYSICS_DT, frames: this.frames })
  }

  finish(): ReplayPayloadV2 {
    if (!this.initial || this.frames.length === 0) {
      throw new Error("GameplayRecorder has no recorded run to finish")
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
