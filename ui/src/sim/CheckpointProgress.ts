import type { BoatState } from "../physics/model/BoatState.ts"
import type { ParkingCheckpoint } from "./checkpoints.ts"
import {
  boatInParkingZone,
  type ParkingZone,
} from "./parkingZone.ts"
import {
  holdCriteriaFor,
  isBoatMeetingHold,
  type HoldCriteria,
} from "./parkingHold.ts"

export type CheckpointPhase = "approach" | "celebrating" | "complete"

export interface CheckpointProgressSnapshot {
  phase: CheckpointPhase
  currentIndex: number
  completedCount: number
  holdProgress: number
  celebrationProgress: number
  activeZone: ParkingZone | null
  holdCriteria: HoldCriteria | null
}

const CELEBRATION_SECONDS = 1.35

export class CheckpointProgress {
  private index = 0
  private holdElapsed = 0
  private phase: CheckpointPhase = "approach"
  private celebrationElapsed = 0
  private readonly checkpoints: readonly ParkingCheckpoint[]

  constructor(checkpoints: readonly ParkingCheckpoint[]) {
    if (checkpoints.length < 1) {
      throw new Error("CheckpointProgress needs at least one hold")
    }
    this.checkpoints = checkpoints
  }

  get totalHolds(): number {
    return this.checkpoints.length
  }

  reset(): void {
    this.index = 0
    this.holdElapsed = 0
    this.phase = "approach"
    this.celebrationElapsed = 0
  }

  get isComplete(): boolean {
    return this.phase === "complete"
  }

  get isCelebrating(): boolean {
    return this.phase === "celebrating"
  }

  criteriaAt(index: number): HoldCriteria {
    const cp = this.checkpoints[index]
    if (!cp) return holdCriteriaFor("berth")
    return holdCriteriaFor(cp.holdProfile ?? "berth")
  }

  activeZone(): ParkingZone | null {
    if (this.phase === "complete") return null
    return this.checkpoints[this.index] ?? null
  }

  snapshot(): CheckpointProgressSnapshot {
    const criteria =
      this.phase === "complete" ? null : this.criteriaAt(this.index)
    const holdSeconds = criteria?.holdSeconds ?? 1
    return {
      phase: this.phase,
      currentIndex: this.index,
      completedCount: this.index,
      holdProgress:
        this.phase === "approach"
          ? Math.min(1, this.holdElapsed / holdSeconds)
          : 0,
      celebrationProgress:
        this.phase === "celebrating"
          ? Math.min(1, this.celebrationElapsed / CELEBRATION_SECONDS)
          : 0,
      activeZone: this.activeZone(),
      holdCriteria: criteria,
    }
  }

  tick(
    dt: number,
    boat: BoatState,
    groundVx: number,
    groundVy: number,
  ): { justCompletedHold: boolean; levelJustPassed: boolean } {
    let justCompletedHold = false
    let levelJustPassed = false

    if (this.phase === "complete") {
      return { justCompletedHold, levelJustPassed }
    }

    if (this.phase === "celebrating") {
      this.celebrationElapsed += dt
      if (this.celebrationElapsed >= CELEBRATION_SECONDS) {
        this.index += 1
        this.holdElapsed = 0
        this.celebrationElapsed = 0
        if (this.index >= this.checkpoints.length) {
          this.phase = "complete"
          levelJustPassed = true
        } else {
          this.phase = "approach"
        }
      }
      return { justCompletedHold, levelJustPassed }
    }

    const zone = this.checkpoints[this.index]
    if (!zone) return { justCompletedHold, levelJustPassed }

    const criteria = this.criteriaAt(this.index)
    const inside = boatInParkingZone(boat, zone)
    const meeting = isBoatMeetingHold(
      boat,
      groundVx,
      groundVy,
      criteria,
      zone.heading,
    )

    if (inside && meeting) {
      this.holdElapsed += dt
      if (this.holdElapsed >= criteria.holdSeconds) {
        this.phase = "celebrating"
        this.celebrationElapsed = 0
        this.holdElapsed = 0
        justCompletedHold = true
      }
    } else {
      this.holdElapsed = Math.max(0, this.holdElapsed - dt * 2.5)
    }

    return { justCompletedHold, levelJustPassed }
  }
}
