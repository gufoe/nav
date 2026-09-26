import type { FrameContext } from "../core/Scene.ts"
import { boatHullLocalOutline } from "./boatHullOutline.ts"

/** Lightweight canvas helpers. World units are meters. */
export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D
  private pixelsPerMeter: number
  private worldCenterX = 0
  private worldCenterY = 0
  private screenCenterX: number | null = null
  private screenCenterY: number | null = null

  constructor(ctx: CanvasRenderingContext2D, pixelsPerMeter = 12) {
    this.ctx = ctx
    this.pixelsPerMeter = pixelsPerMeter
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
  }

  clear(width: number, height: number, color = "#0b1c28"): void {
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, width, height)
  }

  /** World Y up; {@link setView} center is pinned to the screen middle. */
  withWorld(ctx: FrameContext, draw: () => void): void {
    const { ctx: c, width, height } = ctx
    c.save()
    c.translate(this.screenCenterX ?? width / 2, this.screenCenterY ?? height / 2)
    c.scale(this.pixelsPerMeter, -this.pixelsPerMeter)
    c.translate(-this.worldCenterX, -this.worldCenterY)
    draw()
    c.restore()
  }

  drawGrid(ctx: FrameContext, spacingMeters = 5): void {
    const { ctx: c, width, height } = ctx
    const halfW = width / (2 * this.pixelsPerMeter)
    const halfH = height / (2 * this.pixelsPerMeter)

    c.strokeStyle = "rgba(120, 160, 180, 0.15)"
    c.lineWidth = 1 / this.pixelsPerMeter
    c.beginPath()

    const startX = Math.floor(-halfW / spacingMeters) * spacingMeters
    const startY = Math.floor(-halfH / spacingMeters) * spacingMeters

    for (let x = startX; x <= halfW; x += spacingMeters) {
      c.moveTo(x, -halfH)
      c.lineTo(x, halfH)
    }
    for (let y = startY; y <= halfH; y += spacingMeters) {
      c.moveTo(-halfW, y)
      c.lineTo(halfW, y)
    }
    c.stroke()
  }

  drawBoat(
    x: number,
    y: number,
    heading: number,
    options: {
      length?: number
      beam?: number
      /** Blade angle [rad]; positive steers to starboard. */
      rudderAngle?: number
    } = {},
  ): void {
    const { length = 10, beam = 3, rudderAngle = 0 } = options
    const c = this.ctx
    c.save()
    c.translate(x, y)
    c.rotate(heading)

    const halfL = length / 2
    const hull = boatHullLocalOutline(length, beam)

    // Rudder: the blade trails aft, opposite the chord, so hard to starboard
    // swings the visible blade to starboard.
    c.strokeStyle = "#e8c478"
    c.lineWidth = 2.5 / this.pixelsPerMeter
    c.lineCap = "round"
    c.beginPath()
    const blade = length * 0.16
    c.moveTo(-halfL * 0.82, 0)
    c.lineTo(
      -halfL * 0.82 - Math.cos(rudderAngle) * blade,
      -Math.sin(rudderAngle) * blade,
    )
    c.stroke()

    c.fillStyle = "#d8e4ea"
    c.strokeStyle = "#8aa3b2"
    c.lineWidth = 1.5 / this.pixelsPerMeter
    c.beginPath()
    c.moveTo(hull[0]!.x, hull[0]!.y)
    for (let i = 1; i < hull.length; i++) {
      c.lineTo(hull[i]!.x, hull[i]!.y)
    }
    c.closePath()
    c.fill()
    c.stroke()

    // Simple mast mark
    c.fillStyle = "#3d6a82"
    c.beginPath()
    c.arc(0, 0, 0.25, 0, Math.PI * 2)
    c.fill()

    c.restore()
  }

  /** Arrow from a world point, e.g. the track over ground. */
  drawVector(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    scale = 3,
  ): void {
    const length = Math.hypot(vx, vy) * scale
    if (length < 0.2) return

    const c = this.ctx
    const ux = (vx / Math.hypot(vx, vy)) * length
    const uy = (vy / Math.hypot(vx, vy)) * length

    c.save()
    c.strokeStyle = color
    c.fillStyle = color
    c.lineWidth = 1.6 / this.pixelsPerMeter
    c.lineCap = "round"
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + ux, y + uy)
    c.stroke()

    const head = Math.min(0.9, length * 0.3)
    const angle = Math.atan2(uy, ux)
    c.beginPath()
    c.moveTo(x + ux, y + uy)
    c.lineTo(
      x + ux - Math.cos(angle - 0.4) * head,
      y + uy - Math.sin(angle - 0.4) * head,
    )
    c.lineTo(
      x + ux - Math.cos(angle + 0.4) * head,
      y + uy - Math.sin(angle + 0.4) * head,
    )
    c.closePath()
    c.fill()
    c.restore()
  }

  /** Wake left in the water; points should already include current advection. */
  drawWakeTrail(
    samples: readonly { x: number; y: number; age: number }[],
    maxAgeS: number,
  ): void {
    if (samples.length < 2) return

    const c = this.ctx
    c.save()
    c.lineCap = "round"
    c.lineJoin = "round"

    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1]!
      const b = samples[i]!
      const t = 1 - (a.age + b.age) * 0.5 / maxAgeS
      const alpha = Math.max(0, Math.min(1, t)) * 0.55
      if (alpha < 0.02) continue

      c.strokeStyle = `rgba(180, 210, 225, ${alpha})`
      c.lineWidth = (1.2 + alpha * 1.4) / this.pixelsPerMeter
      c.beginPath()
      c.moveTo(a.x, a.y)
      c.lineTo(b.x, b.y)
      c.stroke()
    }

    c.restore()
  }

  /** Finger pontoon deck; mooring face is local +Y (east in the default layout). */
  drawDock(
    x: number,
    y: number,
    heading: number,
    length: number,
    width: number,
  ): void {
    const c = this.ctx
    const ppm = this.pixelsPerMeter
    c.save()
    c.translate(x, y)
    c.rotate(heading)

    const halfL = length / 2
    const halfW = width / 2
    const lw = 1.5 / ppm

    // Deck
    c.fillStyle = "#5c4a3a"
    c.strokeStyle = "#3d3228"
    c.lineWidth = lw
    c.beginPath()
    c.rect(-halfL, -halfW, length, width)
    c.fill()
    c.stroke()

    // Plank lines along the finger
    c.strokeStyle = "rgba(30, 22, 16, 0.35)"
    c.lineWidth = 0.8 / ppm
    const plankSpacing = 1.1
    for (let px = -halfL + plankSpacing; px < halfL; px += plankSpacing) {
      c.beginPath()
      c.moveTo(px, -halfW)
      c.lineTo(px, halfW)
      c.stroke()
    }

    // Shore / west edge (local −Y)
    c.fillStyle = "rgba(35, 28, 22, 0.55)"
    c.fillRect(-halfL, -halfW, length, width * 0.22)

    // East rub rail (+Y / American alongside)
    c.strokeStyle = "#6aa0bc"
    c.lineWidth = 2.4 / ppm
    c.beginPath()
    c.moveTo(-halfL, halfW)
    c.lineTo(halfL, halfW)
    c.stroke()

    // West rub rail (−Y / stern-to)
    c.strokeStyle = "#7ee8b0"
    c.lineWidth = 2 / ppm
    c.beginPath()
    c.moveTo(-halfL, -halfW)
    c.lineTo(halfL, -halfW)
    c.stroke()

    // Cleats on the east alongside edge
    c.fillStyle = "#c9b896"
    const cleatInset = 1.4
    for (let px = -halfL + cleatInset; px <= halfL - cleatInset; px += 3.2) {
      c.beginPath()
      c.arc(px, halfW - width * 0.12, 0.14, 0, Math.PI * 2)
      c.fill()
    }
    for (let px = -halfL + cleatInset; px <= halfL - cleatInset; px += 3.2) {
      c.beginPath()
      c.arc(px, -halfW + width * 0.12, 0.12, 0, Math.PI * 2)
      c.fill()
    }

    // Water-side shadow
    c.fillStyle = "rgba(8, 20, 28, 0.2)"
    c.fillRect(-halfL, halfW, length, 0.35)

    c.restore()
  }

  /** @deprecated use {@link drawDock} */
  drawSlip(
    x: number,
    y: number,
    heading: number,
    length: number,
    width: number,
  ): void {
    this.drawDock(x, y, heading, length, width)
  }

  /** Designated green parking hold; highlight marks the active target. */
  drawParkingZone(
    x: number,
    y: number,
    heading: number,
    length: number,
    width: number,
    style: "upcoming" | "active" | "completed",
    pulse = 0,
  ): void {
    const c = this.ctx
    c.save()
    c.translate(x, y)
    c.rotate(heading)

    const halfL = length / 2
    const halfW = width / 2
    const expand = style === "active" ? pulse * 0.35 : 0

    if (style === "completed") {
      c.fillStyle = "rgba(72, 168, 120, 0.08)"
      c.strokeStyle = "rgba(72, 168, 120, 0.35)"
    } else if (style === "active") {
      c.fillStyle = `rgba(72, 200, 130, ${0.16 + pulse * 0.12})`
      c.strokeStyle = `rgba(110, 230, 170, ${0.75 + pulse * 0.2})`
    } else {
      c.fillStyle = "rgba(72, 168, 120, 0.07)"
      c.strokeStyle = "rgba(90, 190, 140, 0.45)"
    }

    c.lineWidth = (style === "active" ? 2.4 : 1.8) / this.pixelsPerMeter
    c.setLineDash(style === "upcoming" ? [0.8 / this.pixelsPerMeter, 0.5 / this.pixelsPerMeter] : [])
    c.strokeRect(-halfL - expand, -halfW - expand, length + expand * 2, width + expand * 2)
    c.fillRect(-halfL, -halfW, length, width)
    c.setLineDash([])

    c.restore()
  }

  /** Technique title above a hold (world Y-up; text drawn upright on screen). */
  drawParkingZoneCaption(
    x: number,
    y: number,
    index: number,
    label: string,
    style: "upcoming" | "active" | "completed",
  ): void {
    const c = this.ctx
    const ppm = this.pixelsPerMeter
    const alpha =
      style === "completed" ? 0.45 : style === "active" ? 0.95 : 0.65

    c.save()
    c.translate(x, y + 3.4)
    c.scale(1 / ppm, -1 / ppm)

    const fontSize = style === "active" ? 13 : 11
    c.font = `${style === "active" ? 600 : 500} ${fontSize}px "IBM Plex Sans", sans-serif`
    c.textAlign = "center"
    c.textBaseline = "middle"

    const text = `${index + 1} · ${label.replace(/ — /g, " · ")}`
    const w = c.measureText(text).width
    const padX = 10
    const boxW = w + padX * 2
    const boxH = fontSize * 1.65
    const boxX = -boxW / 2
    const boxY = -boxH / 2
    const r = 5

    c.fillStyle = `rgba(8, 24, 32, ${alpha * 0.88})`
    c.strokeStyle = `rgba(${style === "active" ? "110, 230, 170" : "72, 168, 120"}, ${alpha * 0.55})`
    c.lineWidth = 1
    c.beginPath()
    c.roundRect(boxX, boxY, boxW, boxH, r)
    c.fill()
    c.stroke()

    c.fillStyle = `rgba(${style === "active" ? "180, 255, 210" : "140, 220, 180"}, ${alpha})`
    c.fillText(text, 0, 0)
    c.restore()
  }

  /** Expanding ring when a hold is registered. */
  drawParkingCelebration(
    x: number,
    y: number,
    progress: number,
  ): void {
    const c = this.ctx
    const t = Math.min(1, Math.max(0, progress))
    const radius = 2 + t * 9
    const alpha = (1 - t) * 0.85

    c.save()
    c.strokeStyle = `rgba(130, 240, 180, ${alpha})`
    c.lineWidth = (2.2 - t * 1.2) / this.pixelsPerMeter
    c.beginPath()
    c.arc(x, y, radius, 0, Math.PI * 2)
    c.stroke()

    c.fillStyle = `rgba(180, 255, 210, ${alpha * 0.35})`
    c.beginPath()
    c.arc(x, y, radius * 0.35 * (1 - t * 0.5), 0, Math.PI * 2)
    c.fill()
    c.restore()
  }
}
