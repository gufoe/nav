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
  boatX: number
  boatY: number
  width: number
  height: number
}

/** Dock at screen center; zoom uses separate X/Y reach toward the boat. */
export class DockCamera {
  private _pixelsPerMeter = 12
  private _viewFrame: ViewFrame = { cx: 0, cy: 0, halfW: 120, halfH: 120 }

  get pixelsPerMeter(): number {
    return this._pixelsPerMeter
  }

  get centerX(): number {
    return this._lastDockX
  }

  get centerY(): number {
    return this._lastDockY
  }

  get viewFrame(): ViewFrame {
    return this._viewFrame
  }

  private _lastDockX = 0
  private _lastDockY = 0

  snapTo(target: DockCameraTarget): void {
    this._viewFrame = computeViewFrame(target.width, target.height)
    this._lastDockX = target.dockX
    this._lastDockY = target.dockY
    this._pixelsPerMeter = computeTargetPixelsPerMeter(target, this._viewFrame)
  }

  update(dt: number, target: DockCameraTarget): void {
    this._viewFrame = computeViewFrame(target.width, target.height)
    this._lastDockX = target.dockX
    this._lastDockY = target.dockY

    const desired = computeTargetPixelsPerMeter(target, this._viewFrame)
    const alpha = 1 - Math.exp(-4 * Math.max(0, dt))
    this._pixelsPerMeter = lerp(this._pixelsPerMeter, desired, alpha)
  }
}

export function computeViewFrame(width: number, height: number): ViewFrame {
  const cx = width / 2
  const cy = height / 2
  const padLeft = Math.min(300, width * 0.28)
  const padRight = Math.min(280, width * 0.26)
  const padTop = Math.min(110, height * 0.14)
  const padBottom = Math.min(100, height * 0.16)

  const insetW = Math.max(40, Math.min(cx - padLeft, width - padRight - cx))
  const insetH = Math.max(40, Math.min(cy - padTop, height - padBottom - cy))
  const margin = 0.94

  return {
    cx,
    cy,
    halfW: Math.max(72, insetW * margin),
    halfH: Math.max(72, insetH * margin),
  }
}

/** Fraction of center→edge distance (along the boat bearing) where the boat sits. */
export const BOAT_RING_FRACTION = 0.68

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

export function computeTargetPixelsPerMeter(
  target: DockCameraTarget,
  frame: ViewFrame,
): number {
  const { ux, uy, distM } = boatScreenDirection(
    target.dockX,
    target.dockY,
    target.boatX,
    target.boatY,
  )
  const reach = edgeReachPx(frame.halfW, frame.halfH, ux, uy)
  const boatRingPx = reach * BOAT_RING_FRACTION
  const minDistM = 4
  return clamp(boatRingPx / Math.max(distM, minDistM), 3, 38)
}
