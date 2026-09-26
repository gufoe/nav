/**
 * Frame timing helpers.
 * Physics integration will consume `fixedDt` via the game loop later.
 */
export class Time {
  /** Seconds since simulation start (unscaled). */
  elapsed = 0

  /** Variable frame delta in seconds (capped). */
  dt = 0

  /** Accumulator for fixed-step physics (seconds). */
  accumulator = 0

  /** Fixed physics step (seconds). Default 60 Hz. */
  fixedDt = 1 / 60

  /** Soft cap to avoid spiral-of-death after tab focus. */
  maxDt = 0.1

  /** Sim time vs wall clock (1 = realtime). SimScene sets 2× by default. */
  scale = 1

  reset(): void {
    this.elapsed = 0
    this.dt = 0
    this.accumulator = 0
  }

  /** Advance with a raw wall-clock delta (seconds). */
  advance(rawDt: number): void {
    const dt = Math.min(rawDt, this.maxDt) * this.scale
    this.dt = dt
    this.elapsed += dt
    this.accumulator += dt
  }

  /** Consume one fixed physics step if enough time has accumulated. */
  consumeFixedStep(): boolean {
    if (this.accumulator < this.fixedDt) return false
    this.accumulator -= this.fixedDt
    return true
  }
}
