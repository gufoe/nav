import type { FrameContext } from "../core/Scene.ts"
import type { WindFlow } from "../sim/WorldFlow.ts"
import { clamp } from "../math/MathUtil.ts"
import { drawFlowArrow } from "./flowArrow.ts"
import { forEachFlowMarker, viewExtents } from "./flowMarkers.ts"

/** Amber arrows drifting with true-wind velocity from {@link WindFlow}. */
export class WindViz {
  private readonly ctx: CanvasRenderingContext2D
  private pixelsPerMeter: number

  constructor(ctx: CanvasRenderingContext2D, pixelsPerMeter = 12) {
    this.ctx = ctx
    this.pixelsPerMeter = pixelsPerMeter
  }

  setPixelsPerMeter(pixelsPerMeter: number): void {
    this.pixelsPerMeter = pixelsPerMeter
  }

  draw(ctx: FrameContext, flow: WindFlow, elapsed: number): void {
    const c = this.ctx
    const spacing = 9
    const opacity = clamp(0.14 + flow.speed * 0.03, 0.14, 0.38)
    const arrowLen = clamp(2.4 + flow.speed * 0.35, 2.4, 6)
    const driftSpeed = Math.max(1.4, flow.speed * 0.65)

    c.save()
    c.strokeStyle = `rgba(232, 196, 120, ${opacity})`
    c.fillStyle = `rgba(232, 196, 120, ${opacity})`
    c.lineWidth = 1.25 / this.pixelsPerMeter
    c.lineCap = "round"
    c.lineJoin = "round"

    forEachFlowMarker(
      viewExtents(ctx, this.pixelsPerMeter),
      flow,
      spacing,
      driftSpeed,
      elapsed,
      arrowLen,
      0x57,
      (cx, cy, ux, uy, scale) => {
        drawFlowArrow(c, this.pixelsPerMeter, cx, cy, ux, uy, arrowLen * scale)
      },
    )

    c.restore()
  }
}
