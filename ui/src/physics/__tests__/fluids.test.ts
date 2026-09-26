import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { trueWindVelocityWorld } from "../fluids/ApparentWind.ts"
import { currentVelocityWorld, groundVelocityWorld } from "../fluids/Current.ts"
import { createEnvironment, environmentFromScenario } from "../model/Environment.ts"
import { createBoatState } from "../model/BoatState.ts"
import { createMildEnvironment } from "../../sim/types.ts"
import { degToRad } from "../../math/MathUtil.ts"
import { windStreakFlowDirection } from "../../render/environmentField.ts"

describe("physics fluids", () => {
  test("current velocity points TO currentDirection", () => {
    const dir = degToRad(30)
    const speed = 1.5
    const v = currentVelocityWorld(
      createEnvironment({ currentSpeed: speed, currentDirection: dir }),
    )
    assert.ok(Math.abs(v.x - speed * Math.cos(dir)) < 1e-12)
    assert.ok(Math.abs(v.y - speed * Math.sin(dir)) < 1e-12)
  })

  test("true wind velocity is FROM direction plus π", () => {
    const from = degToRad(90)
    const speed = 8
    const tw = trueWindVelocityWorld(
      createEnvironment({ windSpeed: speed, windDirection: from }),
    )
    const to = windStreakFlowDirection(from)
    assert.ok(Math.abs(tw.x - speed * Math.cos(to)) < 1e-12)
    assert.ok(Math.abs(tw.y - speed * Math.sin(to)) < 1e-12)
  })

  test("ground velocity composes water motion and current", () => {
    const state = createBoatState({ u: 2, v: 0, heading: 0 })
    const current = { x: 0.5, y: 1 }
    const ground = groundVelocityWorld(state, current)
    assert.ok(Math.abs(ground.x - 2.5) < 1e-12)
    assert.ok(Math.abs(ground.y - 1) < 1e-12)
  })

  test("environmentFromScenario preserves physics fields", () => {
    const env = createMildEnvironment()
    const phys = environmentFromScenario(env)
    assert.equal(phys.windSpeed, env.windSpeed)
    assert.equal(phys.windDirection, env.windDirection)
    assert.equal(phys.currentSpeed, env.currentSpeed)
    assert.equal(phys.currentDirection, env.currentDirection)
  })
})
