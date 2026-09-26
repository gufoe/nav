import { lerp, wrapAngle } from "../../math/MathUtil.ts"

export interface PolarPoint {
  alpha: number
  cl: number
  cd: number
}

/**
 * Interpolated sail polar. CL is odd in α, CD even, and both are folded so
 * any angle in ±180° returns something sane.
 */
export class SailPolar {
  private readonly alphas: number[]
  private readonly cls: number[]
  private readonly cds: number[]

  constructor(points: readonly PolarPoint[]) {
    this.alphas = points.map((p) => p.alpha)
    this.cls = points.map((p) => p.cl)
    this.cds = points.map((p) => p.cd)
  }

  cl(alpha: number): number {
    const a = wrapAngle(alpha)
    return this.sample(this.cls, Math.abs(a)) * (a < 0 ? -1 : 1)
  }

  cd(alpha: number): number {
    return this.sample(this.cds, Math.abs(wrapAngle(alpha)))
  }

  private sample(values: number[], alpha: number): number {
    const first = this.alphas[0] ?? 0
    const last = this.alphas[this.alphas.length - 1] ?? Math.PI
    const a = Math.min(alpha, last)
    if (a <= first) return values[0] ?? 0

    for (let i = 1; i < this.alphas.length; i++) {
      const a1 = this.alphas[i]!
      if (a <= a1) {
        const a0 = this.alphas[i - 1]!
        const t = (a - a0) / (a1 - a0)
        return lerp(values[i - 1]!, values[i]!, t)
      }
    }
    return values[values.length - 1] ?? 0
  }
}

const deg = (d: number): number => (d * Math.PI) / 180

/** Rough Bermuda-rig polar. Replace with measured sail data per boat. */
export const DEFAULT_SAIL_POLAR = new SailPolar([
  { alpha: deg(0), cl: 0, cd: 0.05 },
  { alpha: deg(5), cl: 0.4, cd: 0.06 },
  { alpha: deg(10), cl: 0.8, cd: 0.08 },
  { alpha: deg(15), cl: 1.1, cd: 0.12 },
  { alpha: deg(20), cl: 1.2, cd: 0.18 },
  { alpha: deg(25), cl: 1.1, cd: 0.28 },
  { alpha: deg(35), cl: 0.8, cd: 0.45 },
  { alpha: deg(60), cl: 0.3, cd: 0.85 },
  { alpha: deg(90), cl: 0, cd: 1.1 },
  { alpha: deg(180), cl: 0, cd: 1.2 },
])
