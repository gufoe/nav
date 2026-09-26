import { describe, test } from "node:test"
import assert from "node:assert/strict"
import {
  flowAlignedReach,
  visibleWorldBounds,
} from "../worldViewBounds.ts"

describe("visibleWorldBounds", () => {
  test("symmetric when the view center is the canvas middle", () => {
    const b = visibleWorldBounds(800, 600, 10, 50, 30, 400, 300)
    assert.equal(b.minX, 50 - 40)
    assert.equal(b.maxX, 50 + 40)
    assert.equal(b.minY, 30 - 30)
    assert.equal(b.maxY, 30 + 30)
  })

  test("extends farther on the side with more pixels when inset", () => {
    const b = visibleWorldBounds(400, 800, 10, 0, 0, 200, 520)
    assert.equal(b.minX, -20)
    assert.equal(b.maxX, 20)
    assert.equal(b.minY, -28)
    assert.equal(b.maxY, 52)
  })

  test("flowAlignedReach covers offset viewport corners", () => {
    const b = visibleWorldBounds(800, 600, 10, -12, 4, 400, 300)
    const { crossReach, alongMin, alongMax } = flowAlignedReach(b, 1, 0)
    assert.ok(crossReach >= 32)
    assert.ok(alongMax - alongMin > 50)
  })
})
