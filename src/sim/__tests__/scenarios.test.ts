import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { SCENARIOS } from "../scenarios.ts"
import { createMildEnvironment } from "../types.ts"
import { wrapAngle } from "../../math/MathUtil.ts"

describe("scenarios", () => {
  test("built-in scenario list is non-empty with valid ids", () => {
    assert.ok(SCENARIOS.length >= 4)
    for (const s of SCENARIOS) {
      assert.ok(s.id.length > 0)
      assert.ok(s.boatId.length > 0)
      assert.ok(s.environment.wavePeriod > 0)
    }
  })

  test("mild environment wave propagation aligns with wind downwind", () => {
    const env = createMildEnvironment()
    const expected = wrapAngle(env.windDirection + Math.PI)
    assert.ok(Math.abs(wrapAngle(env.waveDirection - expected)) < 0.05)
    assert.ok(env.waveHeight > 0.1)
    assert.ok(env.windSpeed > 0.2)
  })
})
