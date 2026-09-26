import type { BoatState } from "../physics/model/BoatState.ts"
import { speedThroughWater } from "../physics/model/BoatState.ts"
import { msToKnots } from "../math/Units.ts"

/** How strictly the boat must match a hold box. */
export type HoldProfile = "approach" | "berth"

export interface HoldCriteria {
  profile: HoldProfile
  /** Max speed over ground [m/s]. */
  maxSog: number
  /** Max speed through the water [m/s]. */
  maxStw: number
  /** Max |SOG − STW| while in the box (current / wind allowed on approach). */
  maxSogStwDelta: number
  maxYawRate: number
  /** Max |boat heading − slot heading| [rad]. */
  maxHeadingError: number
  holdSeconds: number
}

/** Slow, controlled pass — not a full stop (~0.4–1.2 kn). */
export const APPROACH_HOLD: HoldCriteria = {
  profile: "approach",
  maxSog: 0.75,
  maxStw: 0.8,
  maxSogStwDelta: 0.6,
  maxYawRate: 0.07,
  maxHeadingError: (20 * Math.PI) / 180,
  holdSeconds: 0.85,
}

/** Made fast alongside — essentially zero way on (~0.35 kn). */
export const BERTH_HOLD: HoldCriteria = {
  profile: "berth",
  maxSog: 0.18,
  maxStw: 0.18,
  maxSogStwDelta: 0.12,
  maxYawRate: 0.04,
  maxHeadingError: (20 * Math.PI) / 180,
  holdSeconds: 1.15,
}

export function holdCriteriaFor(profile: HoldProfile): HoldCriteria {
  return profile === "approach" ? APPROACH_HOLD : BERTH_HOLD
}

export function headingErrorRad(boatHeading: number, targetHeading: number): number {
  let d = boatHeading - targetHeading
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return Math.abs(d)
}

export function isBoatMeetingHold(
  boat: BoatState,
  groundVx: number,
  groundVy: number,
  criteria: HoldCriteria,
  targetHeading?: number,
): boolean {
  const sog = Math.hypot(groundVx, groundVy)
  const stw = speedThroughWater(boat)
  if (sog > criteria.maxSog || stw > criteria.maxStw) return false
  if (Math.abs(sog - stw) > criteria.maxSogStwDelta) return false
  if (Math.abs(boat.r) > criteria.maxYawRate) return false
  if (targetHeading !== undefined) {
    if (headingErrorRad(boat.heading, targetHeading) > criteria.maxHeadingError) {
      return false
    }
  }
  return true
}

export function describeHoldSpeedLimit(criteria: HoldCriteria): string {
  const kn = msToKnots(criteria.maxSog).toFixed(1)
  return criteria.profile === "approach"
    ? `slow pass up to ~${kn} kn`
    : `stop — under ~${msToKnots(criteria.maxSog).toFixed(1)} kn`
}
