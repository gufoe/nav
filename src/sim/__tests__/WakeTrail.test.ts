import assert from "node:assert/strict"
import test from "node:test"
import { WakeTrail } from "../WakeTrail.ts"

test("wake samples advect with the current each tick", () => {
  const trail = new WakeTrail(20, 0.01, 60)
  trail.tick(1, 0, 0, { x: 0.5, y: 0 })
  trail.tick(2, 5, 0, { x: 0.5, y: 0 })
  const pts = trail.snapshot()
  assert.equal(pts.length, 2)
  const oldest = pts[0]!
  assert.ok(Math.abs(oldest.x - 1) < 1e-9)
  assert.ok(Math.abs(oldest.y) < 1e-9)
})

test("reset clears samples", () => {
  const trail = new WakeTrail(20, 0.01, 60)
  trail.tick(1, 1, 2, { x: 0, y: 0 })
  trail.reset()
  assert.equal(trail.snapshot().length, 0)
})
