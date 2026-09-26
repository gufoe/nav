import type { FrameContext } from "../core/Scene.ts"
import type { Environment } from "../sim/types.ts"
import {
  currentFlowFrom,
  wavePropagationFlow,
  windFlowFrom,
} from "../sim/WorldFlow.ts"
import { clamp } from "../math/MathUtil.ts"
import { swellWavelength } from "./environmentField.ts"
import { drawFlowArrow } from "./flowArrow.ts"
import { forEachFlowMarker, viewExtents } from "./flowMarkers.ts"
import { drawSwellLayer, swellAxesFromFlow } from "./swellViz.ts"
import { visibleWorldBounds } from "./worldViewBounds.ts"
import { WindViz } from "./WindViz.ts"

/**
 * Subtle world-space cues for wind, current, and waves.
 * Flow layers use {@link WorldFlow} — same headings as physics / labels.
 */
export class EnvironmentViz {
  private readonly ctx: CanvasRenderingContext2D
  private pixelsPerMeter: number
  private worldCenterX = 0
  private worldCenterY = 0
  private screenCenterX: number | null = null
  private screenCenterY: number | null = null
  private readonly windViz: WindViz

  constructor(ctx: CanvasRenderingContext2D, pixelsPerMeter = 12) {
    this.ctx = ctx
    this.pixelsPerMeter = pixelsPerMeter
    this.windViz = new WindViz(ctx, pixelsPerMeter)
  }

  setView(
    pixelsPerMeter: number,
    centerX: number,
    centerY: number,
    screenCenterX?: number,
    screenCenterY?: number,
  ): void {
    this.pixelsPerMeter = pixelsPerMeter
    this.worldCenterX = centerX
    this.worldCenterY = centerY
    this.screenCenterX = screenCenterX ?? null
    this.screenCenterY = screenCenterY ?? null
    this.windViz.setView(
      pixelsPerMeter,
      centerX,
      centerY,
      screenCenterX,
      screenCenterY,
    )
  }

  draw(ctx: FrameContext, env: Environment, elapsed: number): void {
    this.drawWaves(ctx, env, elapsed)
    this.drawCurrent(ctx, env, elapsed)
    const wind = windFlowFrom(env)
    if (wind) this.windViz.draw(ctx, wind, elapsed)
  }

  private viewExtents(ctx: FrameContext): ReturnType<typeof viewExtents> {
    return viewExtents(
      ctx,
      this.pixelsPerMeter,
      this.worldCenterX,
      this.worldCenterY,
      this.screenCenterX ?? undefined,
      this.screenCenterY ?? undefined,
    )
  }

  private drawWaves(ctx: FrameContext, env: Environment, t: number): void {
    const flow = wavePropagationFlow(env)
    if (!flow) return

    const height = env.waveHeight
    const period = Math.max(1.5, env.wavePeriod)
    const wavelength = swellWavelength(period)
    const amp = clamp(height * 0.35, 0.05, 0.55)
    const baseOpacity = clamp(0.08 + height * 0.14, 0.08, 0.22)
    // Real swell celerity is several m/s — slow the visual so crests read as drift, not streaks.
    const visualTravel = t * Math.min(flow.speed * 0.08, 0.45)

    const view = this.viewExtents(ctx)
    const sx = this.screenCenterX ?? ctx.width / 2
    const sy = this.screenCenterY ?? ctx.height / 2
    const bounds = visibleWorldBounds(
      ctx.width,
      ctx.height,
      this.pixelsPerMeter,
      view.worldCenterX,
      view.worldCenterY,
      sx,
      sy,
    )

    drawSwellLayer(this.ctx, {
      bounds,
      worldCenterX: view.worldCenterX,
      worldCenterY: view.worldCenterY,
      axes: swellAxesFromFlow(flow.vx, flow.vy, flow.speed),
      travel: visualTravel,
      wavelength,
      period,
      flowSpeed: flow.speed,
      amp,
      height,
      baseOpacity,
      pixelsPerMeter: this.pixelsPerMeter,
    })
  }

  private drawCurrent(ctx: FrameContext, env: Environment, t: number): void {
    const flow = currentFlowFrom(env)
    if (!flow) return

    const c = this.ctx
    const spacing = 9
    const opacity = clamp(0.18 + flow.speed * 0.35, 0.18, 0.45)
    const len = clamp(1.2 + flow.speed * 2.2, 1.2, 3.2)

    c.save()
    c.strokeStyle = `rgba(64, 196, 180, ${opacity})`
    c.fillStyle = `rgba(64, 196, 180, ${opacity})`
    c.lineWidth = 1.4 / this.pixelsPerMeter
    c.lineCap = "round"

    forEachFlowMarker(
      this.viewExtents(ctx),
      flow,
      spacing,
      flow.speed * 1.8,
      t,
      len,
      0x63,
      (cx, cy, ux, uy, scale) => {
        drawFlowArrow(c, this.pixelsPerMeter, cx, cy, ux, uy, len * scale)
      },
    )

    c.restore()
  }
}
