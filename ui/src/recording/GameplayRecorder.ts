import {
  frameFromControls,
  type ReplayFrame,
  type ReplayPayload,
} from "../../../shared/replay.ts"
import type { Controls } from "../physics/model/Controls.ts"
import { PHYSICS_DT } from "../physics/fluids/constants.ts"

export class GameplayRecorder {
  private frames: ReplayFrame[] = []
  private elapsedMs = 0
  private readonly scenarioId: string
  private readonly boatId: string

  constructor(scenarioId: string, boatId: string) {
    this.scenarioId = scenarioId
    this.boatId = boatId
  }

  reset(): void {
    this.frames = []
    this.elapsedMs = 0
  }

  recordStep(dt: number, controls: Controls): void {
    this.elapsedMs += dt * 1000
    this.frames.push(frameFromControls(controls))
  }

  finish(): ReplayPayload {
    return {
      v: 1,
      scenarioId: this.scenarioId,
      boatId: this.boatId,
      timeMs: this.elapsedMs,
      fixedDt: PHYSICS_DT,
      frames: this.frames,
    }
  }

  get elapsedSeconds(): number {
    return this.elapsedMs / 1000
  }
}
