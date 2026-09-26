import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { run } from "./harness.ts"
import { bodyToWorld, velocityAtPoint, worldToBody } from "../math/Frames.ts"
import { wrenchFromForceAtPoint } from "../math/Wrench.ts"
import { symmetricFoilCoefficients } from "../fluids/Foil.ts"
import { computeApparentWind } from "../fluids/ApparentWind.ts"
import { createControls } from "../model/Controls.ts"
import { DEFAULT_YACHT } from "../boats/defaultYacht.ts"
import { degToRad } from "../../math/MathUtil.ts"

/** Sign conventions: body +x bow, +y port, +mz and +r turn the bow to port. */

describe("physics conventions", () => {
test("body and world frames round-trip", () => {
  const heading = degToRad(35)
  const world = bodyToWorld(2, -1, heading)
  const back = worldToBody(world.x, world.y, heading)
  assert.ok(Math.abs(back.x - 2) < 1e-12)
  assert.ok(Math.abs(back.y + 1) < 1e-12)

  // Heading east, the body's port axis points north.
  const port = bodyToWorld(0, 1, 0)
  assert.ok(Math.abs(port.x) < 1e-12 && Math.abs(port.y - 1) < 1e-12)
})

test("yaw adds lateral velocity at the stern", () => {
  // Turning to port (r > 0) swings the stern to starboard.
  const stern = velocityAtPoint(2, 0, 0.1, -4, 0)
  assert.ok(stern.y < 0)
})

test("a force to port aft of the CG turns the bow to starboard", () => {
  const w = wrenchFromForceAtPoint(0, 100, -4, 0)
  assert.ok(w.mz < 0)
})

test("a symmetric foil is antisymmetric in α and stalls", () => {
  const small = symmetricFoilCoefficients(degToRad(5), 2.5, 0.03)
  const mirrored = symmetricFoilCoefficients(degToRad(-5), 2.5, 0.03)
  assert.ok(Math.abs(small.cl + mirrored.cl) < 1e-12)
  assert.ok(small.cl > 0 && small.cd > 0.03)

  const peak = symmetricFoilCoefficients(degToRad(14), 2.5, 0.03)
  const past = symmetricFoilCoefficients(degToRad(40), 2.5, 0.03)
  assert.ok(past.cl < peak.cl, "lift drops after the stall")
  assert.ok(past.cd > peak.cd, "drag keeps climbing")
  assert.ok(past.stalled && !peak.stalled)

  // Reversed flow: the same foil seen from behind, not a lift explosion.
  const reversed = symmetricFoilCoefficients(Math.PI - degToRad(5), 2.5, 0.03)
  assert.ok(Math.abs(reversed.cl + small.cl) < 1e-12)
  const broadside = symmetricFoilCoefficients(degToRad(90), 2.5, 0.03)
  assert.ok(Math.abs(broadside.cl) < 1e-9 && broadside.cd > 1)
})

test("apparent wind combines true wind and boat motion", () => {
  const env = { windSpeed: 10, windDirection: 0, currentSpeed: 0, currentDirection: 0 }

  // Wind from the east onto a boat heading east: dead on the nose.
  const stopped = computeApparentWind(0, env, { x: 0, y: 0 })
  assert.ok(Math.abs(stopped.speed - 10) < 1e-9)
  assert.ok(Math.abs(stopped.angleFromBow) < 1e-9)

  // Motoring into it raises the apparent wind by the boat speed.
  const moving = computeApparentWind(0, env, { x: 3, y: 0 })
  assert.ok(Math.abs(moving.speed - 13) < 1e-9)

  // Running away from it lowers it.
  const away = computeApparentWind(Math.PI, env, { x: -3, y: 0 })
  assert.ok(Math.abs(away.speed - 7) < 1e-9)
})

test("the helm takes time to move and the engine to spool", () => {
  const spec = DEFAULT_YACHT
  const brief = run({ controls: createControls({ rudder: 1, throttle: 1 }), duration: 0.1 })
  assert.ok(brief.state.rudderAngle < spec.steering.maxAngle)
  assert.ok(Math.abs(brief.state.rpm) < spec.engine.maxAheadRpm)

  const settled = run({ controls: createControls({ rudder: 1, throttle: 1 }), duration: 8 })
  assert.ok(Math.abs(settled.state.rudderAngle - spec.steering.maxAngle) < 1e-9)
  assert.ok(settled.state.rpm > spec.engine.maxAheadRpm * 0.98)
})

test("results do not depend on the physics step size", () => {
  const fine = run({ controls: createControls({ throttle: 1, rudder: 0.5 }), duration: 30, dt: 1 / 240 })
  const coarse = run({ controls: createControls({ throttle: 1, rudder: 0.5 }), duration: 30, dt: 1 / 60 })
  assert.ok(Math.abs(fine.state.u - coarse.state.u) < 0.05)
  assert.ok(Math.abs(fine.state.r - coarse.state.r) < 0.01)
})
})
