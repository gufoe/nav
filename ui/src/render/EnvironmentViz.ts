import type { FrameContext } from "../core/Scene.ts"
import type { Environment } from "../sim/types.ts"
import {
  currentFlowFrom,
  wavePropagationFlow,
  windFlowFrom,
} from "../sim/WorldFlow.ts"
import { clamp } from "../math/MathUtil.ts"
import {
  swellCrestAlong,
  swellCrestIndexMid,
  swellPhaseTimeFromTravel,
  swellWavelength,
} from "./environmentField.ts"
import { drawFlowArrow } from "./flowArrow.ts"
import { forEachFlowMarker, viewExtents } from "./flowMarkers.ts"
import { WindViz } from "./WindViz.ts"

/**
 * Subtle world-space cues for wind, current, and waves.
 * Flow layers use {@link WorldFlow} — same headings as physics / labels.
 */
export class EnvironmentViz {
  private readonly ctx: CanvasRenderingContext2D
  private pixelsPerMeter: number
  private readonly windViz: WindViz

  constructor(ctx: CanvasRenderingContext2D, pixelsPerMeter = 12) {
    this.ctx = ctx
    this.pixelsPerMeter = pixelsPerMeter
    this.windViz = new WindViz(ctx, pixelsPerMeter)
  }

  setPixelsPerMeter(pixelsPerMeter: number): void {
    this.pixelsPerMeter = pixelsPerMeter
    this.windViz.setPixelsPerMeter(pixelsPerMeter)
  }

  draw(ctx: FrameContext, env: Environment, elapsed: number): void {
    this.drawWaves(ctx, env, elapsed)
    this.drawCurrent(ctx, env, elapsed)
    const wind = windFlowFrom(env)
    if (wind) this.windViz.draw(ctx, wind, elapsed)
  }

  private viewExtents(ctx: FrameContext): { halfW: number; halfH: number } {
    return viewExtents(ctx, this.pixelsPerMeter)
  }

  private drawWaves(ctx: FrameContext, env: Environment, t: number): void {
    const flow = wavePropagationFlow(env)
    if (!flow) return

    const height = env.waveHeight
    const period = Math.max(1.5, env.wavePeriod)
    const wavelength = swellWavelength(period)
    const amp = clamp(height * 0.35, 0.05, 0.55)
    const baseOpacity = clamp(0.05 + height * 0.1, 0.05, 0.16)
    // Real swell celerity is several m/s — slow the visual so crests read as drift, not streaks.
    const visualTravel = t * Math.min(flow.speed * 0.08, 0.45)

    this.drawWaveSwellLayer(
      ctx,
      flow,
      visualTravel,
      period,
      wavelength,
      amp,
      baseOpacity,
      height,
    )
  }

  /**
   * Swell crests run across the propagation direction and advance down-wave.
   */
  private drawWaveSwellLayer(
    ctx: FrameContext,
    flow: { vx: number; vy: number; speed: number; headingTo: number },
    travel: number,
    period: number,
    wavelength: number,
    amp: number,
    opacity: number,
    height: number,
  ): void {
    const c = this.ctx
    const { halfW, halfH } = this.viewExtents(ctx)
    const ux = flow.vx / flow.speed
    const uy = flow.vy / flow.speed
    const px = -uy
    const py = ux

    const k = (Math.PI * 2) / wavelength
    const omega = (Math.PI * 2) / period
    const reach = Math.hypot(halfW, halfH) + wavelength + amp
    const crestSteps = Math.ceil((reach * 2) / wavelength) + 3
    const iMid = swellCrestIndexMid(travel, wavelength)
    const phase = omega * swellPhaseTimeFromTravel(travel, flow.speed)

    const lineW = (0.75 + height * 0.4) / this.pixelsPerMeter
    const samples = 32

    c.save()
    c.lineCap = "round"
    c.lineJoin = "round"

    for (let i = iMid - crestSteps; i <= iMid + crestSteps; i++) {
      const along0 = swellCrestAlong(i, wavelength, travel)
      const crestPhase = i * 0.85
      const pts: { x: number; y: number }[] = []

      for (let s = 0; s <= samples; s++) {
        const cross = -reach + (s / samples) * reach * 2
        const meander =
          Math.sin(k * cross * 0.55 + crestPhase + phase * 0.35) * amp * 0.5
        const along = along0 + meander
        const x = ux * along + px * cross
        const y = uy * along + py * cross
        pts.push({ x, y })
      }

      c.beginPath()
      for (let s = 0; s < pts.length; s++) {
        const p = pts[s]!
        if (s === 0) c.moveTo(p.x, p.y)
        else c.lineTo(p.x, p.y)
      }
      c.strokeStyle = `rgba(150, 195, 215, ${opacity})`
      c.lineWidth = lineW
      c.stroke()
    }

    c.restore()
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
