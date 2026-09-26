import { radToDeg } from "../math/MathUtil.ts"
import { msToKnots } from "../math/Units.ts"
import type { ParkingCheckpoint } from "./checkpoints.ts"
import type { HoldCriteria } from "./parkingHold.ts"

export type SemaphoreState = "off" | "warn" | "go"

export interface ObjectiveTargets {
  place: string
  speed: string
  bearing: string
}

function normalizeDegrees(degrees: number): number {
  return (Math.round(degrees) + 360) % 360
}

/** Short place name for the objective panel (not the full map label). */
export function objectivePlaceLabel(checkpoint: ParkingCheckpoint): string {
  const sideMatch = checkpoint.label.match(/\(([^)]+)\)/i)
  const side = sideMatch?.[1]?.trim()
  if (/approach/i.test(checkpoint.label)) {
    return side ? `${capitalize(side)} · approach slip` : "Approach slip"
  }
  if (/finish|alongside|parallel/i.test(checkpoint.label)) {
    return side ? `${capitalize(side)} · alongside` : "Alongside berth"
  }
  if (/stern-to|stern to/i.test(checkpoint.label)) {
    return side ? `${capitalize(side)} · stern-to` : "Stern-to berth"
  }
  if (/bow-to|bow to/i.test(checkpoint.label)) {
    return side ? `${capitalize(side)} · bow-to` : "Bow-to berth"
  }
  const tail = checkpoint.label.split("—").pop()?.trim()
  return tail && tail.length > 0 ? tail : checkpoint.label
}

export function objectiveSpeedLabel(criteria: HoldCriteria): string {
  const kn = msToKnots(criteria.maxSog).toFixed(1)
  return criteria.profile === "approach" ? `≤ ${kn} kn SOG` : `≤ ${kn} kn (stop)`
}

/**
 * Compass-style target for the objective HUD (000° = north / south→north on the finger).
 * Hold geometry still uses {@link ParkingCheckpoint.heading} for the green box.
 */
export function objectiveBearingLabel(checkpoint: ParkingCheckpoint): string {
  if (isAmericanParallelCheckpoint(checkpoint)) {
    return "0° · S→N along finger"
  }
  const deg = normalizeDegrees(radToDeg(checkpoint.heading))
  if (deg === 180) {
    return `${deg}° · stern-to (bow east)`
  }
  return `${deg}° heading`
}

function isAmericanParallelCheckpoint(checkpoint: ParkingCheckpoint): boolean {
  return /american/i.test(checkpoint.label)
}

export function objectiveTargets(
  checkpoint: ParkingCheckpoint,
  criteria: HoldCriteria,
): ObjectiveTargets {
  return {
    place: objectivePlaceLabel(checkpoint),
    speed: objectiveSpeedLabel(criteria),
    bearing: objectiveBearingLabel(checkpoint),
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
