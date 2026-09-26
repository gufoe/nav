import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { degToRad } from "../../math/MathUtil.ts"
import {
  boatScreenDirection,
  computeTargetPixelsPerMeter,
  computeViewFrame,
  DockCamera,
  edgeReachPx,
  framingHullVertices,
  HULL_VIEW_MARGIN,
  pairCentroid,
  type DockCameraTarget,
} from "../DockCamera.ts"

const baseTarget = (overrides: Partial<DockCameraTarget> = {}): DockCameraTarget => ({
  dockX: 0,
  dockY: 0,
  dockHeading: degToRad(-90),
  dockLength: 28,
  dockWidth: 3,
  boatX: -25,
  boatY: 8,
  boatHeading: 0,
  boatLength: 11,
  boatBeam: 3.5,
  width: 1280,
  height: 720,
  ...overrides,
})

function assertFramingHullInsideFrame(
  target: DockCameraTarget,
  ppm: number,
  frame: ReturnType<typeof computeViewFrame>,
): void {
  const c = pairCentroid(target)
  const limitX = frame.halfW * HULL_VIEW_MARGIN + 0.05
  const limitY = frame.halfH * HULL_VIEW_MARGIN + 0.05
  for (const v of framingHullVertices(target)) {
    const sx = (v.x - c.cx) * ppm
    const sy = -(v.y - c.cy) * ppm
    assert.ok(Math.abs(sx) <= limitX, `sx ${sx} exceeds ${limitX}`)
    assert.ok(Math.abs(sy) <= limitY, `sy ${sy} exceeds ${limitY}`)
  }
}

describe("DockCamera", () => {
  test("uses wider horizontal reach for a beam approach", () => {
    const frame = computeViewFrame(1280, 720)
    const reachX = edgeReachPx(frame.halfW, frame.halfH, -1, 0)
    const reachY = edgeReachPx(frame.halfW, frame.halfH, 0, -1)
    assert.ok(reachX > reachY)
    assert.ok(reachX >= frame.halfW * 0.99)
    assert.ok(reachY >= frame.halfH * 0.99)
  })

  test("centers on the dock–boat midpoint", () => {
    const target = baseTarget()
    const cam = new DockCamera()
    cam.snapTo(target)
    const want = pairCentroid(target)
    assert.ok(Math.abs(cam.centerX - want.cx) < 1e-9)
    assert.ok(Math.abs(cam.centerY - want.cy) < 1e-9)
  })

  test("keeps the full dock and boat hull inside the view frame", () => {
    const frame = computeViewFrame(1280, 720)
    const target = baseTarget()
    const ppm = computeTargetPixelsPerMeter(target, frame)
    assertFramingHullInsideFrame(target, ppm, frame)
  })

  test("zooms out when the combined hull span grows", () => {
    const frame = computeViewFrame(1280, 720)
    const tight = computeTargetPixelsPerMeter(
      baseTarget({
        boatX: -18,
        boatY: 0,
        dockLength: 8,
        dockWidth: 2,
        boatLength: 8,
        boatBeam: 2.5,
      }),
      frame,
    )
    const loose = computeTargetPixelsPerMeter(
      baseTarget({
        boatX: -40,
        boatY: 0,
        dockLength: 28,
        dockWidth: 3,
        boatLength: 11,
        boatBeam: 3.5,
      }),
      frame,
    )
    assert.ok(loose < tight, `loose ${loose} should be less than tight ${tight}`)
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
    assert.ok(cx - halfW > 180)
    assert.ok(cx + halfW < 1280 - 160)
    assert.ok(cy - halfH > 70)
    assert.ok(cy + halfH < 720 - 60)
  })

  test("portrait frame leaves a centre lane for touch controls", () => {
    const { cx, cy, halfW, halfH } = computeViewFrame(1080, 1920)
    assert.equal(cx, 540)
    assert.ok(cy < 960, `portrait frame should sit above centre, got ${cy}`)
    assert.ok(halfW > 400, `portrait frame should use most of the screen width, got ${halfW}`)
    assert.ok(halfH > 300, `portrait frame should leave a useful centre lane, got ${halfH}`)
  })

  test("boatScreenDirection matches beam approach geometry", () => {
    const { ux, distM } = boatScreenDirection(0, 0, -25, 8)
    assert.ok(distM > 25)
    assert.ok(ux < 0)
  })
})
