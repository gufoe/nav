import { describe, test } from "node:test"
import assert from "node:assert/strict"

import {
  angleDelta,
  approxEqual,
  clamp,
  degToRad,
  inverseLerp,
  lerp,
  radToDeg,
  wrapAngle,
} from "../MathUtil.ts"

describe("MathUtil", () => {
  test("wrapAngle and angleDelta on ±π boundary", () => {
    assert.ok(Math.abs(Math.abs(wrapAngle(Math.PI)) - Math.PI) < 1e-12)
    assert.ok(Math.abs(Math.abs(wrapAngle(-Math.PI)) - Math.PI) < 1e-12)
    assert.ok(Math.abs(Math.abs(angleDelta(0, Math.PI)) - Math.PI) < 1e-12)
    assert.ok(Math.abs(Math.abs(angleDelta(0, -Math.PI)) - Math.PI) < 1e-12)
    assert.ok(Math.abs(angleDelta(degToRad(350), degToRad(10)) - degToRad(20)) < 1e-9)
  })

  test("clamp and lerp helpers", () => {
    assert.equal(clamp(5, 0, 3), 3)
    assert.equal(clamp(-1, 0, 3), 0)
    assert.equal(lerp(0, 10, 0.25), 2.5)
    assert.equal(inverseLerp(0, 10, 2.5), 0.25)
    assert.ok(approxEqual(1, 1 + 1e-10))
  })

  test("degToRad round-trip", () => {
    const d = 123.456
    assert.ok(approxEqual(radToDeg(degToRad(d)), d, 1e-9))
  })
})
