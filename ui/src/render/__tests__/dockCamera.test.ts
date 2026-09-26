import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  BOAT_RING_FRACTION,
  boatScreenDirection,
  computeTargetPixelsPerMeter,
  computeViewFrame,
  DockCamera,
  edgeReachPx,
  type DockCameraTarget,
} from "../DockCamera.ts"

const baseTarget = (overrides: Partial<DockCameraTarget> = {}): DockCameraTarget => ({
  dockX: 0,
  dockY: 0,
  boatX: -25,
  boatY: 8,
  width: 1280,
  height: 720,
  ...overrides,
})

describe("DockCamera", () => {
  test("uses wider horizontal reach for a beam approach", () => {
    const frame = computeViewFrame(1280, 720)
    const reachX = edgeReachPx(frame.halfW, frame.halfH, -1, 0)
    const reachY = edgeReachPx(frame.halfW, frame.halfH, 0, -1)
    assert.ok(reachX > reachY)
    assert.ok(reachX >= frame.halfW * 0.99)
    assert.ok(reachY >= frame.halfH * 0.99)
  })

  test("places the boat on the framing ring along its bearing", () => {
    const frame = computeViewFrame(1280, 720)
    const target = baseTarget()
    const { distM } = boatScreenDirection(
      target.dockX,
      target.dockY,
      target.boatX,
      target.boatY,
    )
    const ppm = computeTargetPixelsPerMeter(target, frame)
    const boatPx = distM * ppm
    const { ux, uy } = boatScreenDirection(
      target.dockX,
      target.dockY,
      target.boatX,
      target.boatY,
    )
    const want = edgeReachPx(frame.halfW, frame.halfH, ux, uy) * BOAT_RING_FRACTION
    assert.ok(Math.abs(boatPx - want) < 0.05, `got ${boatPx}, want ${want}`)
  })

  test("zooms in when the boat is closer to the dock", () => {
    const cam = new DockCamera()
    cam.snapTo(baseTarget({ boatX: -30, boatY: 10 }))
    const far = cam.pixelsPerMeter

    cam.snapTo(baseTarget({ boatX: -4, boatY: 1 }))
    const near = cam.pixelsPerMeter

    assert.ok(near > far, `near ${near} should exceed far ${far}`)
  })

  test("view frame stays inside the canvas with HUD insets", () => {
    const { cx, cy, halfW, halfH } = computeViewFrame(1280, 720)
    assert.ok(cx - halfW > 200)
    assert.ok(cx + halfW < 1280 - 180)
    assert.ok(cy - halfH > 80)
    assert.ok(cy + halfH < 720 - 70)
  })
})
