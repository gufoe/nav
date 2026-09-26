import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { formatKnots, msToKnots, toCardinal } from "../Units.ts"
import { degToRad } from "../MathUtil.ts"

describe("Units", () => {
  test("msToKnots and formatKnots calm threshold", () => {
    assert.ok(Math.abs(msToKnots(1) - 1.943844) < 1e-5)
    assert.equal(formatKnots(0.04), "calm")
    assert.match(formatKnots(4.5), /kn$/)
  })

  test("toCardinal at eight compass points (0 = E, CCW)", () => {
    assert.equal(toCardinal(0), "E")
    assert.equal(toCardinal(degToRad(45)), "NE")
    assert.equal(toCardinal(degToRad(90)), "N")
    assert.equal(toCardinal(degToRad(135)), "NW")
    assert.equal(toCardinal(degToRad(180)), "W")
    assert.equal(toCardinal(degToRad(-90)), "S")
  })
})
