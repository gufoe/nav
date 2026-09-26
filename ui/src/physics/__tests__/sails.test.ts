import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { knots, run, toKnots, waterSpeed } from "./harness.ts"
import { createControls } from "../model/Controls.ts"
import type { BoatState } from "../model/BoatState.ts"
import { DEFAULT_YACHT } from "../boats/defaultYacht.ts"
import { degToRad, wrapAngle } from "../../math/MathUtil.ts"

const SAILING_YACHT = {
  ...DEFAULT_YACHT,
  sails: { ...DEFAULT_YACHT.sails, enabled: true },
}

/** Heading hold, so a polar run stays on the point of sail we asked for. */
function autopilot(state: BoatState, target: number): number {
  const error = wrapAngle(target - state.heading)
  return Math.max(-1, Math.min(1, -2.5 * error + 4 * state.r))
}

/** Sheet schedule: hard in close-hauled, progressively eased as we bear away. */
function sheetFor(twaDegrees: number): number {
  return Math.min(1, Math.max(0, (twaDegrees - 15) / 135))
}

function sailAt(twaDegrees: number, tws: number): number {
  const windDirection = Math.PI / 2 // from the north
  const heading = wrapAngle(windDirection - degToRad(twaDegrees))
  const sheet = sheetFor(twaDegrees)
  let latest: BoatState | null = null

  const result = run({
    boat: SAILING_YACHT,
    state: { heading },
    env: { windSpeed: tws, windDirection },
    controls: () =>
      createControls({
        mainsheet: sheet,
        jibSheet: sheet,
        rudder: latest ? autopilot(latest, heading) : 0,
      }),
    duration: 150,
    until: (s) => {
      latest = s
      return false
    },
  })

  return toKnots(waterSpeed(result.state))
}

describe("sails H", () => {
test("H — the simulated polar has the right shape", () => {
  const tws = knots(12)
  const polar = new Map<number, number>()
  for (const twa of [0, 30, 45, 60, 90, 120, 150, 180]) {
    polar.set(twa, sailAt(twa, tws))
  }

  const at = (twa: number): number => polar.get(twa) ?? 0

  assert.ok(at(0) < 1.5, `head to wind should not sail: ${at(0).toFixed(1)}kn`)
  assert.ok(at(45) > 2, `close hauled ${at(45).toFixed(1)}kn`)
  assert.ok(at(45) > at(0) * 2, "bearing away from head to wind must pay")
  assert.ok(at(60) > at(45), "a close reach beats close hauled")
  assert.ok(at(90) > at(180), "reaching beats running")
  for (const twa of [45, 60, 90, 120, 150]) {
    assert.ok(at(twa) < toKnots(tws), `${twa}° must stay below wind speed`)
  }
})

test("H2 — more wind means more speed", () => {
  const light = sailAt(90, knots(6))
  const medium = sailAt(90, knots(12))
  const fresh = sailAt(90, knots(18))
  assert.ok(medium > light && fresh > medium, `${light} / ${medium} / ${fresh}`)
})

test("sails only push when they are trimmed", () => {
  const windDirection = Math.PI / 2
  const heading = wrapAngle(windDirection - degToRad(60))
  const env = { windSpeed: knots(12), windDirection }

  const trimmed = run({
    boat: SAILING_YACHT,
    state: { heading },
    env,
    controls: createControls({ mainsheet: 0.35, jibSheet: 0.35 }),
    duration: 0.5,
  })
  const flogging = run({
    boat: SAILING_YACHT,
    state: { heading },
    env,
    controls: createControls({ mainsheet: 1, jibSheet: 1 }),
    duration: 0.5,
  })

  assert.ok(trimmed.forces.sails.fx > flogging.forces.sails.fx, "eased sails lose drive")
  assert.ok(flogging.forces.sailState.main.luffing, "fully eased main should luff")
  assert.ok(!trimmed.forces.sailState.main.luffing)

  // Sheeted in on a reach, the rig drives forward and heels/pushes to leeward.
  assert.ok(trimmed.forces.sails.fx > 0)
  assert.ok(trimmed.forces.sails.fy < 0, "side force to leeward (starboard here)")
})

test("the keel converts leeway into side force", () => {
  const withKeel = run({
    boat: SAILING_YACHT,
    state: { u: knots(4), v: 0.5 },
    duration: 0.1,
  })
  const withoutKeel = run({
    boat: { ...SAILING_YACHT, keel: { ...SAILING_YACHT.keel, enabled: false } },
    state: { u: knots(4), v: 0.5 },
    duration: 0.1,
  })

  assert.ok(withKeel.forces.keel.fy < -1000, "keel resists sideways motion hard")
  assert.ok(withKeel.state.v < withoutKeel.state.v, "and kills leeway faster")
})
})
