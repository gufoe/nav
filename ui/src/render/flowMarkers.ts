import type { FrameContext } from "../core/Scene.ts"
import type { WorldFlow } from "../sim/WorldFlow.ts"
import {
  flowMarkerDriftState,
  flowMarkerPosition,
} from "./environmentField.ts"
import { visibleWorldBounds } from "./worldViewBounds.ts"

export interface FlowMarkerView {
  worldCenterX: number
  worldCenterY: number
  /** Max distance from world center to a visible edge — swell reach / marker cull. */
  halfW: number
  halfH: number
}

export function viewExtents(
  ctx: FrameContext,
  pixelsPerMeter: number,
  worldCenterX = 0,
  worldCenterY = 0,
  screenCenterX?: number,
  screenCenterY?: number,
): FlowMarkerView {
  const sx = screenCenterX ?? ctx.width / 2
  const sy = screenCenterY ?? ctx.height / 2
  const { minX, maxX, minY, maxY } = visibleWorldBounds(
    ctx.width,
    ctx.height,
    pixelsPerMeter,
    worldCenterX,
    worldCenterY,
    sx,
    sy,
  )
  return {
    worldCenterX,
    worldCenterY,
    halfW: Math.max(worldCenterX - minX, maxX - worldCenterX),
    halfH: Math.max(worldCenterY - minY, maxY - worldCenterY),
  }
}

/**
 * Animated markers on a grid aligned with {@link WorldFlow}, drifting with the field.
 */
export function forEachFlowMarker(
  view: FlowMarkerView,
  flow: WorldFlow,
  spacing: number,
  driftSpeed: number,
  t: number,
  markerSize: number,
  salt: number,
  visit: (
    cx: number,
    cy: number,
    ux: number,
    uy: number,
    sizeScale: number,
  ) => void,
): void {
  const { halfW, halfH } = view
  const margin = spacing + markerSize
  const reach = Math.hypot(halfW, halfH) + margin
  const jitterReach = spacing * 0.42 * 2
  const steps = Math.ceil((reach * 2 + jitterReach) / spacing) + 3
  const { drift, iaMid } = flowMarkerDriftState(t, driftSpeed, spacing)

  for (let ia = iaMid - steps; ia <= iaMid + steps; ia++) {
    for (let ic = -steps; ic <= steps; ic++) {
      const { cx, cy, ux: sux, uy: suy, sizeScale } = flowMarkerPosition({
        ia,
        ic,
        spacing,
        drift,
        salt,
        flowDir: flow.headingTo,
      })
      const dx = cx - view.worldCenterX
      const dy = cy - view.worldCenterY
      if (
        Math.abs(dx) > halfW + margin ||
        Math.abs(dy) > halfH + margin
      ) {
        continue
      }
      visit(cx, cy, sux, suy, sizeScale)
    }
  }
}
