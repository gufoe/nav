import type { BoatState } from "../physics/model/BoatState.ts"
import type { Dock, Scenario } from "./types.ts"
import type { HoldProfile } from "./parkingHold.ts"
import {
  MAX_CHECKPOINTS,
  MIN_CHECKPOINTS,
  type ParkingZone,
} from "./parkingZone.ts"
import { parkingZonesOverlap } from "./parkingZoneOverlap.ts"
import {
  americanParallelSlip,
  englishSternToSlip,
  FINGER_STATION,
  medSternToSlip,
  SLIP_ENVELOPE,
} from "./slipPositions.ts"

/**
 * Every level: American parallel on the **east** face (approach, then finish),
 * then stern-to on the **west** face — opposite side of the same finger.
 */

/** Green hold with a named technique for HUD and map labels. */
export interface ParkingCheckpoint extends ParkingZone {
  label: string
  technique: string
  /** Approach = slow pass; berth = made fast (default). */
  holdProfile?: HoldProfile
}

function americanSlip(
  dock: Dock,
  worldY: number,
  standOff: number,
  label: string,
  technique: string,
  holdProfile: HoldProfile,
): ParkingCheckpoint {
  return {
    ...americanParallelSlip(dock, worldY, standOff, label, technique),
    holdProfile,
  }
}

function americanApproach(
  dock: Dock,
  standOff = 2.2,
  technique = "East side — slow approach slip; controlled way on is OK",
): ParkingCheckpoint {
  return americanSlip(
    dock,
    FINGER_STATION.south,
    standOff,
    "American — approach (east)",
    technique,
    "approach",
  )
}

function americanFinish(
  dock: Dock,
  standOff = 0,
  technique = "East side — made fast alongside the pontoon",
): ParkingCheckpoint {
  return americanSlip(
    dock,
    FINGER_STATION.north,
    standOff,
    "American — finish (east)",
    technique,
    "berth",
  )
}

function sternToWestAfterAlongside(
  dock: Dock,
  detail = "West side — stern to the dock, bow to open water",
): ParkingCheckpoint {
  return medSternToSlip(
    dock,
    FINGER_STATION.mid,
    "Med — stern-to (west)",
    detail,
  )
}

/** Fallback: approach → finish → optional other style. */
export function buildApproachCheckpoints(
  _boatStart: BoatState,
  dock: Dock,
): readonly ParkingCheckpoint[] {
  return [
    americanApproach(dock),
    americanFinish(dock),
    sternToWestAfterAlongside(dock),
  ]
}

function basicsCalmLayout(scenario: Scenario): readonly ParkingCheckpoint[] {
  const dock = scenario.dock
  return [
    americanApproach(dock),
    americanFinish(dock),
    sternToWestAfterAlongside(dock),
  ]
}

function basicsWindLayout(scenario: Scenario): readonly ParkingCheckpoint[] {
  const dock = scenario.dock
  return [
    americanApproach(
      dock,
      2,
      "Slow approach in the lee — keep the bow from blowing off",
    ),
    americanFinish(
      dock,
      0,
      "Made fast alongside; wind on the beam or quarter",
    ),
    sternToWestAfterAlongside(
      dock,
      "West side — after the east alongside, pick up a stern-to slot",
    ),
  ]
}

function basicsWindCurrentLayout(scenario: Scenario): readonly ParkingCheckpoint[] {
  const dock = scenario.dock
  return [
    americanApproach(
      dock,
      2,
      "Approach with wind and tide — plan your ground track",
    ),
    americanFinish(dock, 0, "Finish alongside with wind and current on the hip"),
    englishSternToSlip(
      dock,
      FINGER_STATION.mid,
      "English — stern-to (west)",
      "West side — stern-to after the east alongside",
    ),
  ]
}

function basicsChopLayout(scenario: Scenario): readonly ParkingCheckpoint[] {
  const dock = scenario.dock
  return [
    americanApproach(dock, 1.8, "East side — approach off the south end"),
    americanFinish(dock),
    sternToWestAfterAlongside(dock),
  ]
}

function crosswindBerthLayout(scenario: Scenario): readonly ParkingCheckpoint[] {
  const dock = scenario.dock
  return [
    americanApproach(
      dock,
      2,
      "East side — beam-wind approach",
    ),
    americanFinish(
      dock,
      0,
      "East side — parallel with wind on the beam",
    ),
    sternToWestAfterAlongside(
      dock,
      "West side — stern-to after the alongside",
    ),
  ]
}

const LAYOUT_BY_ID: Record<string, (scenario: Scenario) => readonly ParkingCheckpoint[]> =
  {
    "basics-calm": basicsCalmLayout,
    "basics-wind": basicsWindLayout,
    "basics-wind-current": basicsWindCurrentLayout,
    "basics-chop": basicsChopLayout,
    "crosswind-berth": crosswindBerthLayout,
  }

function dockOnlyToCheckpoint(dock: Dock, index: number): ParkingCheckpoint {
  return {
    ...dock,
    label: `Hold ${index + 1}`,
    technique: "Park in the marked box",
  }
}

export function maxHoldDistanceFromDock(
  holds: readonly ParkingCheckpoint[],
  dock: Dock,
): number {
  let max = 0
  for (const h of holds) {
    const d = Math.hypot(
      h.position.x - dock.position.x,
      h.position.y - dock.position.y,
    )
    if (d > max) max = d
  }
  return max
}

/** @deprecated use {@link maxHoldDistanceFromDock} */
export const maxHoldDistanceFromSlip = maxHoldDistanceFromDock

export function resolveCheckpoints(scenario: Scenario): readonly ParkingCheckpoint[] {
  if (scenario.checkpoints?.length) {
    const zones = scenario.checkpoints
    if (zones.length < MIN_CHECKPOINTS || zones.length > MAX_CHECKPOINTS) {
      throw new Error(
        `Expected ${MIN_CHECKPOINTS}–${MAX_CHECKPOINTS} parking checkpoints, got ${zones.length}`,
      )
    }
    return zones.map((z, i) =>
      "label" in z && "technique" in z
        ? (z as ParkingCheckpoint)
        : dockOnlyToCheckpoint(z, i),
    )
  }

  const layout = LAYOUT_BY_ID[scenario.id]
  const zones = layout
    ? layout(scenario)
    : buildApproachCheckpoints(scenario.boat, scenario.dock)

  if (zones.length < MIN_CHECKPOINTS || zones.length > MAX_CHECKPOINTS) {
    throw new Error(
      `Expected ${MIN_CHECKPOINTS}–${MAX_CHECKPOINTS} parking checkpoints, got ${zones.length}`,
    )
  }
  return zones
}

/** @deprecated use {@link resolveCheckpoints} */
export function checkpointsForScenario(
  boat: BoatState,
  dock: Dock,
  explicit?: readonly ParkingZone[],
): readonly ParkingCheckpoint[] {
  if (explicit?.length) {
    return explicit.map((z, i) => dockOnlyToCheckpoint(z, i))
  }
  return buildApproachCheckpoints(boat, dock)
}

/** @deprecated use {@link resolveCheckpoints} */
export function basicsCalmCheckpoints(
  boatStart: BoatState,
  dock: Dock,
): readonly ParkingCheckpoint[] {
  return basicsCalmLayout({
    id: "basics-calm",
    name: "",
    description: "",
    boatId: "",
    boat: boatStart,
    environment: {
      windSpeed: 0,
      windDirection: 0,
      currentSpeed: 0,
      currentDirection: 0,
      waveHeight: 0,
      waveDirection: 0,
      wavePeriod: 4,
    },
    dock,
  })
}

export function assertCheckpointsSeparated(
  holds: readonly ParkingCheckpoint[],
): void {
  for (let i = 0; i < holds.length; i++) {
    for (let j = i + 1; j < holds.length; j++) {
      if (parkingZonesOverlap(holds[i]!, holds[j]!)) {
        throw new Error(`Checkpoint ${i} overlaps checkpoint ${j}`)
      }
    }
  }
}

/** Every built-in slot shares the standard LOA × beam envelope. */
export function assertStandardSlipEnvelope(holds: readonly ParkingCheckpoint[]): void {
  for (const h of holds) {
    if (h.length !== SLIP_ENVELOPE.length || h.width !== SLIP_ENVELOPE.width) {
      throw new Error(`Non-standard slip size on ${h.label}`)
    }
  }
}
