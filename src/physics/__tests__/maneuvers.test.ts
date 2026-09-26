import { describe, test } from "node:test"
import assert from "node:assert/strict"

import {
  distanceFromOrigin,
  groundSpeed,
  knots,
  run,
  toKnots,
  waterSpeed,
  type RunResult,
} from "./harness.ts"
import { analyzeTurningCircle } from "../calibration/TurningCircle.ts"
import { analyzeCrashStop } from "../calibration/CrashStop.ts"
import { createControls } from "../model/Controls.ts"
import { DEFAULT_YACHT } from "../boats/defaultYacht.ts"
import { degToRad, radToDeg } from "../../math/MathUtil.ts"

/**
 * Empty-water manoeuvres, before any marina gameplay. These are the checks
 * that say whether the force model behaves like a boat; the numbers are the
 * calibration targets for the Coastal 36.
 */

describe("manoeuvres A–G", () => {
test("A — coasts to a stop from 3 kn in a plausible time and distance", () => {
  const coast = run({
    state: { u: knots(3) },
    duration: 300,
    until: (s) => s.u < knots(0.5),
  })

  // A 6.5 t hull carries its way: tens of metres, not two, and not two hundred.
  assert.ok(coast.time > 15 && coast.time < 90, `time ${coast.time.toFixed(1)}s`)
  assert.ok(coast.state.x > 10 && coast.state.x < 60, `distance ${coast.state.x.toFixed(1)}m`)
  // Nothing pushes it sideways or turns it in flat calm.
  assert.ok(Math.abs(coast.state.y) < 1e-6)
  assert.ok(Math.abs(coast.state.r) < 1e-6)
})

test("B — accelerates to a displacement-speed maximum", () => {
  let timeTo2 = -1
  let timeTo4 = -1

  const full = run({
    controls: createControls({ throttle: 1 }),
    duration: 180,
    until: (s, t) => {
      if (timeTo2 < 0 && s.u >= knots(2)) timeTo2 = t
      if (timeTo4 < 0 && s.u >= knots(4)) timeTo4 = t
      return false
    },
  })

  const top = toKnots(full.state.u)
  assert.ok(top > 5 && top < 7.5, `top speed ${top.toFixed(2)}kn`)

  // Thrust is roughly constant while drag grows, so the last knots come slowly.
  assert.ok(timeTo2 > 0 && timeTo4 > timeTo2)
  assert.ok(timeTo4 - timeTo2 > timeTo2 * 0.5, "acceleration should taper off")

  // Half throttle is a quarter of the thrust, so clearly slower.
  const cruise = run({ controls: createControls({ throttle: 0.5 }), duration: 180 })
  assert.ok(cruise.state.u < full.state.u * 0.8)
})

test("C — settles into a turning circle of a few boat lengths, losing speed", () => {
  const straight = run({
    controls: createControls({ throttle: 0.7 }),
    state: { u: knots(5) },
    duration: 120,
  })
  const turn = runWithSamples({
    controls: createControls({ throttle: 0.7, rudder: 1 }),
    state: { u: knots(5), heading: 0 },
    duration: 120,
  })

  // Starboard helm turns the bow to starboard: r is negative (port positive).
  assert.ok(turn.result.state.r < 0, "starboard helm must turn the bow to starboard")

  const metrics = analyzeTurningCircle(turn.samples, 0, -1)
  const lengths = metrics.steadyDiameter / DEFAULT_YACHT.lengthOverall
  assert.ok(lengths > 1 && lengths < 5, `steady diameter ${lengths.toFixed(1)} LOA`)
  assert.ok(Number.isFinite(metrics.advance90) && metrics.advance90 > 0)
  assert.ok(Number.isFinite(metrics.transfer90))

  const speedLoss = 1 - waterSpeed(turn.result.state) / straight.state.u
  assert.ok(speedLoss > 0.15 && speedLoss < 0.7, `speed loss ${(speedLoss * 100).toFixed(0)}%`)

  // The hull crabs outwards through the turn.
  assert.ok(turn.result.state.v > 0, "drift angle should point outside the turn")
})

test("I — crash stop from 3 kn with full astern", () => {
  const initial = knots(3)
  const stop = runWithSamples({
    state: { u: initial, heading: 0 },
    controls: createControls({ throttle: -1 }),
    duration: 45,
  })

  const summary = analyzeCrashStop(stop.samples, 0)
  assert.ok(stop.result.state.u < 0, "full astern should drive surge astern")
  assert.ok(stop.result.state.u < initial - 0.5, "surge must fall through zero")
  assert.ok(summary.headway < 0 && summary.headway > -120, `astern headway ${summary.headway.toFixed(1)}m`)
})

test("D — a burst of forward throttle steers a stationary boat", () => {
  const burst = run({
    controls: createControls({ throttle: 1, rudder: 1 }),
    duration: 2.5,
  })
  const centred = run({ controls: createControls({ throttle: 1 }), duration: 2.5 })
  const noEngine = run({ controls: createControls({ rudder: 1 }), duration: 2.5 })

  assert.ok(burst.forces.washSpeed > 3, "propeller must throw water at the rudder")
  assert.ok(burst.state.r < 0, "stern kicks to port, bow swings to starboard")

  // Prop wash is doing the work: without it the rudder is useless at rest.
  assert.ok(Math.abs(noEngine.state.r) < 1e-4, "rudder alone does nothing at rest")
  assert.ok(
    Math.abs(burst.state.r) > 5 * Math.abs(centred.state.r),
    "rudder in the wash must dominate prop walk",
  )

  // Mostly rotation, very little headway.
  assert.ok(burst.state.x < 1.5, `headway ${burst.state.x.toFixed(2)}m`)
  assert.ok(radToDeg(Math.abs(burst.state.r)) > 1, "yaw rate should be noticeable")
})

test("E — prop walk kicks the stern sideways in astern gear", () => {
  const astern = run({ controls: createControls({ throttle: -1 }), duration: 8 })

  assert.ok(astern.forces.thrust < -500, "astern thrust")
  assert.ok(astern.state.x < -2, "boat should actually move astern")

  // Right-hand propeller: stern to port, so the bow swings to starboard.
  assert.ok(astern.state.r < 0, "bow to starboard with a right-hand prop")
  assert.ok(astern.state.y > 0, "track curves to port")

  const leftHand = {
    ...DEFAULT_YACHT,
    propeller: { ...DEFAULT_YACHT.propeller, propWalkDirection: -1 as const },
  }
  const mirrored = run({
    boat: leftHand,
    controls: createControls({ throttle: -1 }),
    duration: 8,
  })
  assert.ok(mirrored.state.r > 0, "handedness must flip the walk")

  // Ahead, the same throttle walks far less.
  const ahead = run({ controls: createControls({ throttle: 1 }), duration: 8 })
  const walkAstern = Math.abs(astern.forces.propWalk.fy / astern.forces.thrust)
  const walkAhead = Math.abs(ahead.forces.propWalk.fy / ahead.forces.thrust)
  assert.ok(walkAstern > 3 * walkAhead)
})

test("H — astern helm steers both ways once the boat is moving", () => {
  const throttle = -0.65
  const duration = 14
  const mid = run({
    controls: createControls({ throttle, rudder: 0 }),
    duration,
    state: { heading: 0 },
  })
  const stbd = run({
    controls: createControls({ throttle, rudder: 1 }),
    duration,
    state: { heading: 0 },
  })
  const port = run({
    controls: createControls({ throttle, rudder: -1 }),
    duration,
    state: { heading: 0 },
  })

  // With sternway and no astern wash, flow over the rudder is reversed: starboard
  // demand pushes the bow to port and port demand to starboard (vs ahead gear).
  assert.ok(
    stbd.state.heading > mid.state.heading + degToRad(1),
    "starboard helm must diverge from midships track when backing",
  )
  assert.ok(
    port.state.heading < mid.state.heading - degToRad(4),
    "port helm must diverge the other way when backing",
  )
  assert.ok(
    radToDeg(Math.abs(stbd.state.heading - port.state.heading)) > 5.5,
    "hard port vs starboard must diverge clearly",
  )

  const fullAstern = run({
    controls: createControls({ throttle: -1, rudder: 1 }),
    duration: 12,
    state: { heading: 0 },
  })
  const fullMid = run({
    controls: createControls({ throttle: -1, rudder: 0 }),
    duration: 12,
    state: { heading: 0 },
  })
  assert.ok(
    fullAstern.state.heading > fullMid.state.heading,
    "full astern + starboard helm must not cancel prop walk to a straight track",
  )
})

test("F — the boat ends up moving with the current, not through it", () => {
  const set = knots(2)
  const drift = run({
    // Starts stationary over ground, so it is doing 2 kn through the water.
    state: { u: -set },
    env: { currentSpeed: set, currentDirection: 0 },
    duration: 180,
  })

  assert.ok(toKnots(waterSpeed(drift.state)) < 0.2, "water-relative speed decays to zero")
  assert.ok(Math.abs(toKnots(groundSpeed(drift)) - 2) < 0.2, "ground speed matches the set")
  assert.ok(drift.state.x > 100, "it has travelled downstream")

  // With no current, the same boat stays put.
  const slack = run({ state: { u: -set }, duration: 180 })
  assert.ok(Math.abs(groundSpeed(slack)) < 0.1)
})

test("F2 — hull drag ignores a current the boat is already riding", () => {
  const riding = run({
    state: { u: 0 },
    env: { currentSpeed: knots(2), currentDirection: 0 },
    duration: 0,
  })
  // Stationary in the water: no hull resistance, whatever the ground speed.
  assert.ok(Math.abs(riding.forces.hull.fx) < 1e-6)
  assert.ok(Math.abs(toKnots(groundSpeed(riding)) - 2) < 0.01)
})

test("G — a beam wind drifts the boat downwind and blows the bow off", () => {
  const wind = run({
    // Wind from the north, boat heading east: wind on the port beam.
    env: { windSpeed: knots(15), windDirection: Math.PI / 2 },
    duration: 60,
  })

  assert.ok(wind.state.y < -5, "drifts downwind (southwards)")
  assert.ok(distanceFromOrigin(wind.state) > 5)

  // Centre of windage is forward of the CG, so the bow pays off downwind.
  assert.ok(wind.state.heading < 0, "bow blows off to leeward")

  const drift = toKnots(groundSpeed(wind))
  assert.ok(drift > 0.2 && drift < 2, `drift ${drift.toFixed(2)}kn`)
})

function runWithSamples(
  options: Parameters<typeof run>[0],
): { result: RunResult; samples: { state: RunResult["state"]; time: number }[] } {
  const samples: { state: RunResult["state"]; time: number }[] = []
  const result = run({
    ...options,
    onStep: (state, _forces, t) => {
      samples.push({ state: { ...state }, time: t })
    },
  })
  if (samples.length === 0) samples.push({ state: result.state, time: result.time })
  return { result, samples }
}
})
