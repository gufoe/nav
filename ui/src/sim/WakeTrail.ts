/** One marker left in the water; it drifts with the current after it is dropped. */
export interface WakeSample {
  x: number
  y: number
  /** Seconds since the sample was dropped. */
  age: number
}

/**
 * Stern wake polyline: samples are deposited in world space, then advected each
 * step by the environmental current (not by the boat's ground velocity).
 */
export class WakeTrail {
  private samples: WakeSample[] = []
  private lastDropX = Number.NaN
  private lastDropY = Number.NaN
  private readonly maxSamples: number
  private readonly minSpacingM: number
  private readonly maxAgeS: number

  constructor(maxSamples = 500, minSpacingM = 0.75, maxAgeS = 90) {
    this.maxSamples = maxSamples
    this.minSpacingM = minSpacingM
    this.maxAgeS = maxAgeS
  }

  reset(): void {
    this.samples = []
    this.lastDropX = Number.NaN
    this.lastDropY = Number.NaN
  }

  /** Physics-step update: drift existing foam, maybe drop a new point at the stern. */
  tick(
    dt: number,
    sternX: number,
    sternY: number,
    currentWorld: { x: number; y: number },
  ): void {
    if (dt <= 0) return

    for (const s of this.samples) {
      s.x += currentWorld.x * dt
      s.y += currentWorld.y * dt
      s.age += dt
    }

    this.samples = this.samples.filter((s) => s.age < this.maxAgeS)

    const needDrop =
      Number.isNaN(this.lastDropX) ||
      Math.hypot(sternX - this.lastDropX, sternY - this.lastDropY) >= this.minSpacingM

    if (needDrop) {
      this.samples.push({ x: sternX, y: sternY, age: 0 })
      this.lastDropX = sternX
      this.lastDropY = sternY
      while (this.samples.length > this.maxSamples) {
        this.samples.shift()
      }
    }
  }

  /** Oldest first — convenient for drawing a line from stern history to the boat. */
  snapshot(): readonly WakeSample[] {
    return this.samples
  }
}
