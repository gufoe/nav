import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { integrateRigidBody } from "../math/Integrator.ts"
import { createBoatState } from "../model/BoatState.ts"
import { DEFAULT_YACHT } from "../boats/defaultYacht.ts"
import { degToRad } from "../../math/MathUtil.ts"

describe("integrator", () => {
  test("zero wrench and current advects position over ground", () => {
    const state = createBoatState({ u: 0, v: 0, r: 0, heading: 0 })
    const current = { x: 1, y: 0.5 }
    const dt = 2
    const next = integrateRigidBody(
      state,
      { fx: 0, fy: 0, mz: 0 },
      DEFAULT_YACHT,
      current,
      dt,
    )
    assert.ok(Math.abs(next.x - 2) < 1e-12)
    assert.ok(Math.abs(next.y - 1) < 1e-12)
    assert.ok(Math.abs(next.u) < 1e-12)
  })

  test("heading wraps through integrate step", () => {
    const state = createBoatState({
      u: 0,
      v: 0,
      r: degToRad(200),
      heading: degToRad(170),
    })
    const next = integrateRigidBody(
      state,
      { fx: 0, fy: 0, mz: 0 },
      DEFAULT_YACHT,
      { x: 0, y: 0 },
      1,
    )
    assert.ok(Math.abs(next.heading) <= Math.PI + 1e-9)
  })
})
