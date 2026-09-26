import { degToRad, lerp, smoothstep, wrapAngle } from "../../math/MathUtil.ts"

export interface FoilCoefficients {
  cl: number
  cd: number
  /** Angle of attack folded into [-π/2, π/2] (reverse flow already handled). */
  effectiveAlpha: number
  stalled: boolean
}

const STALL_ANGLE = degToRad(15)
const STALL_BLEND = degToRad(8)

/**
 * Angle of attack of a foil whose chord points along `chordAngle`, moving
 * through the fluid at (velX, velY). Positive α means the flow arrives from
 * the side the chord is rotated away from.
 */
export function angleOfAttack(
  velX: number,
  velY: number,
  chordAngle: number,
): number {
  return wrapAngle(Math.atan2(velY, velX) - chordAngle)
}

/**
 * Symmetric foil (keel, rudder) over the full ±180° range.
 *
 * Attached flow uses the finite-wing slope 2π·AR/(AR+2) with induced drag;
 * past stall it blends into a flat-plate curve so large angles, reverse flow
 * and standstill all stay finite and physical.
 */
export function symmetricFoilCoefficients(
  alpha: number,
  aspectRatio: number,
  cd0: number,
  oswald = 0.8,
): FoilCoefficients {
  const ar = Math.max(aspectRatio, 0.1)

  // Fold into [-π/2, π/2]: a symmetric foil in reversed flow behaves like the
  // mirrored foil in forward flow.
  let a = wrapAngle(alpha)
  let sign = a < 0 ? -1 : 1
  a = Math.abs(a)
  if (a > Math.PI / 2) {
    a = Math.PI - a
    sign = -sign
  }

  const slope = (2 * Math.PI * ar) / (ar + 2)
  const clAttached = slope * a
  const cdAttached = cd0 + (clAttached * clAttached) / (Math.PI * oswald * ar)

  const cdMax = Math.min(2.0, 1.1 + 0.018 * ar)
  const clPlate = 0.5 * cdMax * Math.sin(2 * a)
  const cdPlate = cd0 + cdMax * Math.sin(a) * Math.sin(a)

  const t = smoothstep(STALL_ANGLE, STALL_ANGLE + STALL_BLEND, a)

  return {
    cl: sign * lerp(clAttached, clPlate, t),
    cd: lerp(cdAttached, cdPlate, t),
    effectiveAlpha: sign * a,
    stalled: t > 0.5,
  }
}

export interface FoilForce {
  fx: number
  fy: number
  speed: number
}

/**
 * Force on a foil of `area` moving through a fluid at (velX, velY).
 * Drag opposes the motion; lift is perpendicular to it.
 *
 * Sign note: α is measured as (flow direction − chord direction), which is the
 * negative of the usual aerodynamic angle of attack, hence the lift rotation
 * below is −90° rather than +90°.
 */
export function foilForce(
  velX: number,
  velY: number,
  coefficients: { cl: number; cd: number },
  area: number,
  density: number,
): FoilForce {
  const speed = Math.hypot(velX, velY)
  if (speed < 1e-4 || area <= 0) return { fx: 0, fy: 0, speed }

  const q = 0.5 * density * speed * speed * area
  const inv = 1 / speed
  const { cl, cd } = coefficients

  return {
    fx: (-velX * cd + velY * cl) * inv * q,
    fy: (-velY * cd - velX * cl) * inv * q,
    speed,
  }
}

/** Convenience for symmetric foils: α, coefficients and force in one call. */
export function symmetricFoilForce(
  velX: number,
  velY: number,
  chordAngle: number,
  area: number,
  density: number,
  aspectRatio: number,
  cd0: number,
  oswald = 0.8,
): FoilForce & { alpha: number; coefficients: FoilCoefficients } {
  const alpha = angleOfAttack(velX, velY, chordAngle)
  const coefficients = symmetricFoilCoefficients(alpha, aspectRatio, cd0, oswald)
  const force = foilForce(velX, velY, coefficients, area, density)
  return { ...force, alpha, coefficients }
}
