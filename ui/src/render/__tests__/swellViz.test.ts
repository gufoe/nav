import { describe, test } from "node:test"
import assert from "node:assert/strict"
import {
  swellCrestEndFade,
  swellCrestIndexCenter,
  swellViewportEdgeFade,
  swellWorldPoint,
  swellAxesFromFlow,
} from "../swellViz.ts"

describe("swellViz", () => {
  test("crest end fade peaks in the middle of each span", () => {
    assert.ok(swellCrestEndFade(0) < 1e-10)
    assert.ok(swellCrestEndFade(1) < 1e-10)
    assert.ok(swellCrestEndFade(0.5) > 0.95)
  })

  test("viewport edge fade drops near bounds", () => {
    const b = { minX: -10, maxX: 10, minY: -5, maxY: 5 }
    assert.equal(swellViewportEdgeFade(0, 0, b, 2), 1)
    assert.ok(swellViewportEdgeFade(9.5, 0, b, 2) < 0.3)
  })

  test("camera-centered crest index tracks travel", () => {
    const i0 = swellCrestIndexCenter(20, 0, 10)
    const i1 = swellCrestIndexCenter(20, 5, 10)
    assert.equal(i1, i0)
  })

  test("world points stay perpendicular to propagation", () => {
    const axes = swellAxesFromFlow(3, 0, 3)
    const a = swellWorldPoint(0, 0, axes)
    const b = swellWorldPoint(0, 2, axes)
    const dx = b.x - a.x
    const dy = b.y - a.y
    assert.ok(Math.abs(dx) < 1e-9)
    assert.ok(Math.abs(dy - 2) < 1e-9)
  })
})
