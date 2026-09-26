import { Vec2 } from "../math/Vec2.ts"
import { createBoatState, type BoatState } from "../physics/model/BoatState.ts"
import type { PhysicsEnvironment } from "../physics/model/Environment.ts"

export type { BoatState }

/** Scenario conditions: the physics subset plus what the visuals need. */
export interface Environment extends PhysicsEnvironment {
  /** Significant wave height (m). Visual only for now. */
  waveHeight: number
  /** Direction waves propagate TO (radians). */
  waveDirection: number
  /** Dominant wave period (s). */
  wavePeriod: number
}

/**
 * Fixed pier / pontoon in the world.
 * `length` runs along the finger; `width` is the deck (shore ↔ water).
 * Boats moor on the **east** (+world X) face in the default marina layout.
 */
export interface Dock {
  position: Vec2
  /** Long axis of the finger (typically bow-ward when alongside). */
  heading: number
  length: number
  width: number
}

/** @deprecated use {@link Dock} */
export type Slip = Dock

/** A docking drill definition. */
export type ScenarioCheckpoint = Dock

export interface Scenario {
  id: string
  name: string
  description: string
  boatId: string
  boat: BoatState
  environment: Environment
  dock: Dock
  /** Three sequential parking holds; omit to auto-layout along the approach. */
  checkpoints?: readonly ScenarioCheckpoint[]
}

export function createDefaultBoat(x = 0, y = 0, heading = 0): BoatState {
  return createBoatState({ x, y, heading })
}

export function createCalmEnvironment(): Environment {
  return {
    windSpeed: 0,
    windDirection: 0,
    currentSpeed: 0,
    currentDirection: 0,
    waveHeight: 0,
    waveDirection: 0,
    wavePeriod: 4,
  }
}

/** ~9 kn from the NW — wind only, for the second basics step. */
export function createLightWindEnvironment(): Environment {
  return {
    windSpeed: 4.5,
    windDirection: Math.PI * 0.75,
    currentSpeed: 0,
    currentDirection: 0,
    waveHeight: 0,
    waveDirection: 0,
    wavePeriod: 4,
  }
}

/** Same breeze plus ~0.9 kn tide — third basics step. */
export function createLightWindCurrentEnvironment(): Environment {
  return {
    windSpeed: 4.5,
    windDirection: Math.PI * 0.75,
    currentSpeed: 0.45,
    currentDirection: Math.PI * 0.15,
    waveHeight: 0,
    waveDirection: 0,
    wavePeriod: 4,
  }
}

/** Light breeze + mild current + small seas — fourth basics step. */
export function createMildEnvironment(): Environment {
  return {
    windSpeed: 4.5,
    windDirection: Math.PI * 0.75,
    currentSpeed: 0.45,
    currentDirection: Math.PI * 0.15,
    waveHeight: 0.35,
    waveDirection: Math.PI * 0.75 + Math.PI,
    wavePeriod: 3.2,
  }
}
