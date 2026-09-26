import { hullOutlineWorld } from "./boatHullOutline.ts"
import { clamp, lerp } from "../math/MathUtil.ts"

/** Usable playfield inset for HUD; axis-aligned, centered on the canvas. */
export interface ViewFrame {
  cx: number
  cy: number
  /** Half-width and half-height of the framing rect [px]. */
  halfW: number
  halfH: number
}

export interface DockCameraTarget {
  dockX: number
  dockY: number
  dockHeading: number
  dockLength: number
  dockWidth: number
  boatX: number
  boatY: number
  boatHeading: number
  boatLength: number
  boatBeam: number
  width: number
  height: number
}

/** Dock and boat at opposite frame edges; view centered on their midpoint. */
export class DockCamera {
  private _pixelsPerMeter = 12
  private _viewFrame: ViewFrame = { cx: 0, cy: 0, halfW: 120, halfH: 120 }

  get pixelsPerMeter(): number {
    return this._pixelsPerMeter
  }

  get centerX(): number {
    return this._centerX
  }

  get centerY(): number {
    return this._centerY
  }

  get viewFrame(): ViewFrame {
    return this._viewFrame
  }

  private _centerX = 0
  private _centerY = 0

  snapTo(target: DockCameraTarget): void {
    this._viewFrame = computeViewFrame(target.width, target.height)
    const c = pairCentroid(target)
    this._centerX = c.cx
    this._centerY = c.cy
    this._pixelsPerMeter = computeTargetPixelsPerMeter(target, this._viewFrame)
  }

  update(dt: number, target: DockCameraTarget): void {
    this._viewFrame = computeViewFrame(target.width, target.height)
    const c = pairCentroid(target)
    this._centerX = c.cx
    this._centerY = c.cy

    const desired = computeTargetPixelsPerMeter(target, this._viewFrame)
    const alpha = 1 - Math.exp(-4 * Math.max(0, dt))
    this._pixelsPerMeter = lerp(this._pixelsPerMeter, desired, alpha)
  }
}

export function pairCentroid(target: DockCameraTarget): { cx: number; cy: number } {
  return {
    cx: (target.dockX + target.boatX) / 2,
    cy: (target.dockY + target.boatY) / 2,
  }
}

export function computeViewFrame(width: number, height: number): ViewFrame {
  // Portrait touch devices need a clear centre lane between the compact status
  // panel and the touch helm. Framing within that lane keeps both boat and dock visible.
  if (width < height * 0.8) {
    const padX = width * 0.04
    const padTop = height * 0.13
    const padBottom = height * 0.18
    const left = padX
    const right = width - padX
    const top = padTop
    const bottom = height - padBottom
    const margin = 0.96

    return {
      cx: (left + right) / 2,
      cy: (top + bottom) / 2,
      halfW: Math.max(72, (right - left) * 0.5 * margin),
      halfH: Math.max(72, (bottom - top) * 0.5 * margin),
    }
  }

  const cx = width / 2
  const cy = height / 2
  const padLeft = Math.min(300, width * 0.28)
  const padRight = Math.min(280, width * 0.26)
  const padTop = Math.min(110, height * 0.14)
  const padBottom = Math.min(100, height * 0.16)

  const insetW = Math.max(40, Math.min(cx - padLeft, width - padRight - cx))
  const insetH = Math.max(40, Math.min(cy - padTop, height - padBottom - cy))
  const margin = 0.97

  return {
    cx,
    cy,
    halfW: Math.max(72, insetW * margin),
    halfH: Math.max(72, insetH * margin),
  }
}

/** Inset applied so hull strokes stay inside the HUD playfield. */
export const HULL_VIEW_MARGIN = 0.96

/** Screen-space distance from center to the frame edge along a unit direction. */
export function edgeReachPx(
  halfW: number,
  halfH: number,
  dirX: number,
  dirY: number,
): number {
  const ax = Math.abs(dirX)
  const ay = Math.abs(dirY)
  if (ax < 1e-9 && ay < 1e-9) return Math.min(halfW, halfH)
  if (ax < 1e-9) return halfH / ay
  if (ay < 1e-9) return halfW / ax
  return Math.min(halfW / ax, halfH / ay)
}

/** Unit vector from dock to boat in screen space (world Y is flipped on canvas). */
export function boatScreenDirection(
  dockX: number,
  dockY: number,
  boatX: number,
  boatY: number,
): { ux: number; uy: number; distM: number } {
  const dx = boatX - dockX
  const dy = boatY - dockY
  const distM = Math.hypot(dx, dy)
  if (distM < 1e-6) return { ux: 0, uy: -1, distM: 0 }
  return { ux: dx / distM, uy: -dy / distM, distM }
}

/** World vertices used for framing — matches drawn dock rect and boat hull. */
export function framingHullVertices(target: DockCameraTarget): { x: number; y: number }[] {
  const hl = target.dockLength / 2
  const hw = target.dockWidth / 2
  const cos = Math.cos(target.dockHeading)
  const sin = Math.sin(target.dockHeading)
  const dockLocal = [
    { x: hl, y: hw },
    { x: hl, y: -hw },
    { x: -hl, y: -hw },
    { x: -hl, y: hw },
  ]
  const dock = dockLocal.map(({ x, y }) => ({
    x: target.dockX + x * cos - y * sin,
    y: target.dockY + x * sin + y * cos,
  }))
  const boat = hullOutlineWorld(
    target.boatX,
    target.boatY,
    target.boatHeading,
    target.boatLength,
    target.boatBeam,
  )
  return [...dock, ...boat]
}

/** Max |screen offset| from the centroid at 1 px/m (before clamping). */
export function hullScreenExtentsFromCentroid(target: DockCameraTarget): {
  maxAbsSx: number
  maxAbsSy: number
} {
  const c = pairCentroid(target)
  let maxAbsSx = 1e-6
  let maxAbsSy = 1e-6
  for (const v of framingHullVertices(target)) {
    maxAbsSx = Math.max(maxAbsSx, Math.abs(v.x - c.cx))
    maxAbsSy = Math.max(maxAbsSy, Math.abs(v.y - c.cy))
  }
  return { maxAbsSx, maxAbsSy }
}

export function computeTargetPixelsPerMeter(
  target: DockCameraTarget,
  frame: ViewFrame,
): number {
  const { maxAbsSx, maxAbsSy } = hullScreenExtentsFromCentroid(target)
  const m = HULL_VIEW_MARGIN
  const ppmX = (frame.halfW * m) / maxAbsSx
  const ppmY = (frame.halfH * m) / maxAbsSy
  return clamp(Math.min(ppmX, ppmY), 3, 38)
}
