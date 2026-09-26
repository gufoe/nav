import { clamp } from "../math/MathUtil.ts"
import {
  swellCrestAlong,
  swellPhaseTimeFromTravel,
} from "./environmentField.ts"
import {
  flowAlignedReach,
  type VisibleWorldBounds,
} from "./worldViewBounds.ts"

export interface SwellAxes {
  ux: number
  uy: number
  px: number
  py: number
}

export function swellAxesFromFlow(vx: number, vy: number, speed: number): SwellAxes {
  const ux = vx / speed
  const uy = vy / speed
  return { ux, uy, px: -uy, py: ux }
}

export function swellWorldPoint(
  along: number,
  cross: number,
  axes: SwellAxes,
): { x: number; y: number } {
  const { ux, uy, px, py } = axes
  return {
    x: ux * along + px * cross,
    y: uy * along + py * cross,
  }
}

/** Camera projection on swell axis — crest indices stay centered in view. */
export function swellAlongCamera(
  worldCenterX: number,
  worldCenterY: number,
  axes: SwellAxes,
): number {
  return axes.ux * worldCenterX + axes.uy * worldCenterY
}

export function swellCrestIndexCenter(
  alongCam: number,
  travel: number,
  wavelength: number,
): number {
  return Math.round((alongCam - travel) / wavelength)
}

/** Soft ends on each crest polyline (cross parameter 0..1). */
export function swellCrestEndFade(crossT: number): number {
  return Math.sin(Math.PI * clamp(crossT, 0, 1))
}

/** Fade near viewport edges so clipped crests do not read as harsh slashes. */
export function swellViewportEdgeFade(
  x: number,
  y: number,
  bounds: VisibleWorldBounds,
  fadeMeters: number,
): number {
  if (fadeMeters <= 0) return 1
  const dx = Math.min(x - bounds.minX, bounds.maxX - x)
  const dy = Math.min(y - bounds.minY, bounds.maxY - y)
  return clamp(Math.min(dx, dy) / fadeMeters, 0, 1)
}

export interface SwellLayerParams {
  bounds: VisibleWorldBounds
  worldCenterX: number
  worldCenterY: number
  axes: SwellAxes
  travel: number
  wavelength: number
  period: number
  flowSpeed: number
  amp: number
  height: number
  baseOpacity: number
  pixelsPerMeter: number
}

export function drawSwellLayer(
  c: CanvasRenderingContext2D,
  params: SwellLayerParams,
): void {
  const {
    bounds,
    worldCenterX,
    worldCenterY,
    axes,
    travel,
    wavelength,
    period,
    flowSpeed,
    amp,
    height,
    baseOpacity,
    pixelsPerMeter,
  } = params

  const { ux, uy } = axes
  const k = (Math.PI * 2) / wavelength
  const omega = (Math.PI * 2) / period
  const phase = omega * swellPhaseTimeFromTravel(travel, flowSpeed)

  const { crossReach, alongMin, alongMax } = flowAlignedReach(bounds, ux, uy)
  const reach = crossReach + wavelength * 0.5 + amp
  const alongCam = swellAlongCamera(worldCenterX, worldCenterY, axes)
  const iCenter = swellCrestIndexCenter(alongCam, travel, wavelength)
  const iMin = Math.floor((alongMin - travel) / wavelength) - iCenter - 2
  const iMax = Math.ceil((alongMax - travel) / wavelength) - iCenter + 2

  const edgeFadeM = clamp(2.5 / pixelsPerMeter, 0.8, 4)
  const samples = 40
  const crestW = (1.05 + height * 0.55) / pixelsPerMeter
  const troughW = crestW * 0.55

  c.save()
  c.lineCap = "round"
  c.lineJoin = "round"

  for (let di = iMin; di <= iMax; di++) {
    const crestIndex = iCenter + di
    drawSwellBand(
      c,
      {
        along0: swellCrestAlong(crestIndex, wavelength, travel),
        crestPhase: crestIndex * 0.85,
        kind: di % 2 === 0 ? "crest" : "trough",
        reach,
        samples,
        k,
        amp,
        phase,
        axes,
        bounds,
        edgeFadeM,
        baseOpacity,
        crestW,
        troughW,
      },
    )
  }

  drawPropagationHints(
    c,
    {
      iCenter,
      iMin,
      iMax,
      travel,
      wavelength,
      reach,
      axes,
      bounds,
      edgeFadeM,
      baseOpacity: baseOpacity * 0.85,
      pixelsPerMeter,
      ux,
      uy,
    },
  )

  c.restore()
}

interface SwellBandDraw {
  along0: number
  crestPhase: number
  kind: "crest" | "trough"
  reach: number
  samples: number
  k: number
  amp: number
  phase: number
  axes: SwellAxes
  bounds: VisibleWorldBounds
  edgeFadeM: number
  baseOpacity: number
  crestW: number
  troughW: number
}

function drawSwellBand(c: CanvasRenderingContext2D, band: SwellBandDraw): void {
  const {
    along0,
    crestPhase,
    kind,
    reach,
    samples,
    k,
    amp,
    phase,
    axes,
    bounds,
    edgeFadeM,
    baseOpacity,
    crestW,
    troughW,
  } = band

  const meanderScale = kind === "crest" ? 0.5 : 0.35
  const kindScale = kind === "crest" ? 1 : 0.42
  const lineW = kind === "crest" ? crestW : troughW
  const rgb = kind === "crest" ? "148, 200, 222" : "118, 168, 192"

  let prev: { x: number; y: number; crossT: number; alpha: number } | null = null

  for (let s = 0; s <= samples; s++) {
    const crossT = s / samples
    const cross = -reach + crossT * reach * 2
    const meander =
      Math.sin(k * cross * 0.55 + crestPhase + phase * 0.35) * amp * meanderScale
    const along = along0 + meander
    const { x, y } = swellWorldPoint(along, cross, axes)
    const alpha =
      baseOpacity *
      kindScale *
      swellCrestEndFade(crossT) *
      swellViewportEdgeFade(x, y, bounds, edgeFadeM)

    const pt = { x, y, crossT, alpha }
    if (prev && prev.alpha > 0.004 && alpha > 0.004) {
      const segAlpha = (prev.alpha + alpha) * 0.5
      c.strokeStyle = `rgba(${rgb}, ${segAlpha})`
      c.lineWidth = lineW
      c.beginPath()
      c.moveTo(prev.x, prev.y)
      c.lineTo(x, y)
      c.stroke()
    }
    prev = pt
  }
}

/** Small downstream ticks on every other crest — ties motion to waveDirection in the HUD. */
function drawPropagationHints(
  c: CanvasRenderingContext2D,
  opts: {
    iCenter: number
    iMin: number
    iMax: number
    travel: number
    wavelength: number
    reach: number
    axes: SwellAxes
    bounds: VisibleWorldBounds
    edgeFadeM: number
    baseOpacity: number
    pixelsPerMeter: number
    ux: number
    uy: number
  },
): void {
  const {
    iCenter,
    iMin,
    iMax,
    travel,
    wavelength,
    reach,
    axes,
    bounds,
    edgeFadeM,
    baseOpacity,
    pixelsPerMeter,
    ux,
    uy,
  } = opts

  const tickLen = clamp(1.1 / pixelsPerMeter, 0.06, 0.22)
  const spacing = clamp(wavelength * 0.45, 4, 14)
  const countAlong = Math.ceil((reach * 2) / spacing)

  c.lineWidth = (0.9 / pixelsPerMeter)
  c.strokeStyle = `rgba(180, 228, 245, ${baseOpacity * 0.55})`

  for (let di = iMin; di <= iMax; di += 2) {
    const crestIndex = iCenter + di
    const along0 = swellCrestAlong(crestIndex, wavelength, travel)
    for (let t = 0; t <= countAlong; t++) {
      const cross = -reach + (t / countAlong) * reach * 2
      const { x, y } = swellWorldPoint(along0, cross, axes)
      const fade =
        swellViewportEdgeFade(x, y, bounds, edgeFadeM) *
        swellCrestEndFade(t / countAlong)
      if (fade < 0.08) continue

      const hx = x + ux * tickLen
      const hy = y + uy * tickLen
      const lx = x - uy * tickLen * 0.35
      const ly = y + ux * tickLen * 0.35
      const rx = x + uy * tickLen * 0.35
      const ry = y - ux * tickLen * 0.35

      c.globalAlpha = fade * baseOpacity
      c.beginPath()
      c.moveTo(lx, ly)
      c.lineTo(hx, hy)
      c.lineTo(rx, ry)
      c.stroke()
    }
  }

  c.globalAlpha = 1
}
