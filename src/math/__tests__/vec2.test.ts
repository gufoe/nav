import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { Vec2 } from "../Vec2.ts"
import { degToRad } from "../MathUtil.ts"

describe("Vec2", () => {
  test("fromAngle length and components", () => {
    const v = Vec2.fromAngle(degToRad(90), 5)
    assert.ok(Math.abs(v.x) < 1e-12)
    assert.ok(Math.abs(v.y - 5) < 1e-12)
    assert.ok(Math.abs(v.length() - 5) < 1e-12)
  })

  test("scale and clone invariants", () => {
    const a = Vec2.from(3, 4)
    const b = a.clone()
    b.scale(2)
    assert.equal(a.length(), 5)
    assert.equal(b.length(), 10)
    assert.ok(!a.equals(b))
  })
})
