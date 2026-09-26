import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { Vec2 } from "../../math/Vec2.ts"
import { degToRad } from "../../math/MathUtil.ts"
import {
  americanParallelSlip,
  expectedHeadingDeg,
  medBowToSlip,
  medSternToSlip,
  mooringFacePoint,
  SLIP_ENVELOPE,
} from "../slipPositions.ts"
import type { Dock } from "../types.ts"

const FINGER: Dock = {
  position: Vec2.from(0, 0),
  heading: degToRad(-90),
  length: 14,
  width: 3,
}

describe("slipPositions", () => {
  test("mooring faces lie on east and west sides of the finger", () => {
    const east = mooringFacePoint(FINGER, 0, "east")
    const west = mooringFacePoint(FINGER, 0, "west")
    assert.ok(east.x >= FINGER.width / 2)
    assert.ok(west.x <= -FINGER.width / 2)
    assert.ok(Math.abs(east.y) < 0.01)
    assert.ok(Math.abs(west.y) < 0.01)
  })

  test("standard slip styles use canonical headings", () => {
    assert.equal(expectedHeadingDeg("american-parallel", FINGER), 90)
    assert.equal(expectedHeadingDeg("med-stern-to", FINGER), 180)
    assert.equal(expectedHeadingDeg("med-bow-to", FINGER), 180)

    const parallel = americanParallelSlip(FINGER, 0, 0, "A", "")
    const stern = medSternToSlip(FINGER, 0, "B", "")
    const bow = medBowToSlip(FINGER, 0, "C", "")

    assert.equal(parallel.length, SLIP_ENVELOPE.length)
    assert.equal(stern.width, SLIP_ENVELOPE.width)
    assert.ok(Math.abs(parallel.heading - degToRad(90)) < 0.001)
    assert.ok(Math.abs(Math.abs(stern.heading) - Math.PI) < 0.001)
    assert.ok(Math.abs(Math.abs(bow.heading) - Math.PI) < 0.001)
  })
})
