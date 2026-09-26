import type { FrameContext } from "../core/Scene.ts"
import type { WorldFlow } from "../sim/WorldFlow.ts"
import {
  flowMarkerDriftState,
  flowMarkerPosition,
} from "./environmentField.ts"

export interface FlowMarkerView {
  halfW: number
  halfH: number
}

export function viewExtents(
  ctx: FrameContext,
  pixelsPerMeter: number,
): FlowMarkerView {
  return {
    halfW: ctx.width / (2 * pixelsPerMeter),
    halfH: ctx.height / (2 * pixelsPerMeter),
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
      if (Math.abs(cx) > halfW + margin || Math.abs(cy) > halfH + margin) {
        continue
      }
      visit(cx, cy, sux, suy, sizeScale)
    }
  }
}
