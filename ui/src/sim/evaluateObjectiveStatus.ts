import type { BoatState } from "../physics/model/BoatState.ts"
import { speedThroughWater } from "../physics/model/BoatState.ts"
import {
  headingErrorRad,
  isBoatMeetingHold,
  type HoldCriteria,
} from "./parkingHold.ts"
import { boatInParkingZone, type ParkingZone } from "./parkingZone.ts"
import type { SemaphoreState } from "./checkpointObjective.ts"

export interface ObjectiveStatus {
  place: SemaphoreState
  speed: SemaphoreState
  bearing: SemaphoreState
}

export function evaluateObjectiveStatus(
  boat: BoatState,
  groundVx: number,
  groundVy: number,
  zone: ParkingZone,
  criteria: HoldCriteria,
): ObjectiveStatus {
  const inside = boatInParkingZone(boat, zone)
  const place: SemaphoreState = inside ? "go" : "off"

  const sog = Math.hypot(groundVx, groundVy)
  const stw = speedThroughWater(boat)
  const speedOk = isBoatMeetingHold(
    boat,
    groundVx,
    groundVy,
    criteria,
    zone.heading,
  )
  let speed: SemaphoreState = "off"
  if (speedOk) {
    speed = "go"
  } else if (
    sog <= criteria.maxSog * 1.15 &&
    stw <= criteria.maxStw * 1.15 &&
    Math.abs(sog - stw) <= criteria.maxSogStwDelta * 1.2 &&
    Math.abs(boat.r) <= criteria.maxYawRate * 1.25
  ) {
    speed = "warn"
  }

  const err = headingErrorRad(boat.heading, zone.heading)
  let bearing: SemaphoreState = "off"
  if (err <= criteria.maxHeadingError) {
    bearing = "go"
  } else if (err <= criteria.maxHeadingError * 1.65) {
    bearing = "warn"
  }

  return { place, speed, bearing }
}
