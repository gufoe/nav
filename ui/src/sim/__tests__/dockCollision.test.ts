import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { Vec2 } from "../../math/Vec2.ts"
import { degToRad } from "../../math/MathUtil.ts"
import { createBoatState } from "../../physics/model/BoatState.ts"
import { boatById } from "../../physics/boats/index.ts"
import { boatHullHitsDock } from "../dockCollision.ts"
import type { Dock } from "../types.ts"

const FINGER: Dock = {
  position: Vec2.from(0, 0),
  heading: degToRad(-90),
  length: 28,
  width: 3,
}

describe("dockCollision", () => {
  test("hull overlapping dock center registers contact", () => {
    const spec = boatById("sun-odyssey-36i")
    const boat = createBoatState({
      x: 0,
      y: 0,
      heading: 0,
    })
    assert.equal(boatHullHitsDock(boat, spec, FINGER), true)
  })

  test("hull clear of the dock does not register contact", () => {
    const spec = boatById("sun-odyssey-36i")
    const boat = createBoatState({
      x: -25,
      y: 8,
      heading: 0,
    })
    assert.equal(boatHullHitsDock(boat, spec, FINGER), false)
  })
})
