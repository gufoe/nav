import { Vec2 } from "../math/Vec2.ts"
import {
  createCalmEnvironment,
  createDefaultBoat,
  createLightWindCurrentEnvironment,
  createLightWindEnvironment,
  createMildEnvironment,
  type Dock,
  type Scenario,
} from "./types.ts"
import { degToRad } from "../math/MathUtil.ts"

/** Finger pontoon: deck N–S, boats tie up on the east face. */
const FINGER_DOCK: Dock = {
  position: Vec2.from(0, 0),
  heading: degToRad(-90),
  length: 28,
  width: 3,
}

/** Same start for the basics ladder — short run-in to the pontoon. */
const BASICS_APPROACH = createDefaultBoat(-25, 8, 0)

/** Built-in drills: basics ladder first, then harder berths. */
export const SCENARIOS: readonly Scenario[] = [
  {
    id: "basics-calm",
    name: "Basics 1 — Flat calm",
    description:
      "No wind, no current. Learn way-on, prop walk, and steering bursts at a standstill.",
    boatId: "sun-odyssey-36i",
    boat: BASICS_APPROACH,
    environment: createCalmEnvironment(),
    dock: FINGER_DOCK,
  },
  {
    id: "basics-wind",
    name: "Basics 2 — Light breeze",
    description:
      "~9 kn from the northwest. Feel windage on the bow and superstructure before the tide matters.",
    boatId: "sun-odyssey-36i",
    boat: BASICS_APPROACH,
    environment: createLightWindEnvironment(),
    dock: FINGER_DOCK,
  },
  {
    id: "basics-wind-current",
    name: "Basics 3 — Breeze and tide",
    description:
      "Same breeze plus ~0.9 kn of current. Ground track and water speed diverge — plan the approach.",
    boatId: "sun-odyssey-36i",
    boat: BASICS_APPROACH,
    environment: createLightWindCurrentEnvironment(),
    dock: FINGER_DOCK,
  },
  {
    id: "basics-chop",
    name: "Basics 4 — Small chop",
    description:
      "Wind, current, and gentle seas (visual). Read the HUD and practice a full alongside.",
    boatId: "sun-odyssey-36i",
    boat: BASICS_APPROACH,
    environment: createMildEnvironment(),
    dock: FINGER_DOCK,
  },
  {
    id: "crosswind-berth",
    name: "Challenge — Crosswind berth",
    description:
      "18 kn across the berth. Watch the bow blow off and plan the approach.",
    boatId: "sun-odyssey-36i",
    boat: createDefaultBoat(-20, 14, 0),
    environment: {
      windSpeed: 9.3, // ~18 kn
      windDirection: degToRad(90), // from the north
      currentSpeed: 0.2,
      currentDirection: degToRad(180),
      waveHeight: 0.25,
      waveDirection: degToRad(270),
      wavePeriod: 2.6,
    },
    dock: FINGER_DOCK,
  },
]
