import { clamp } from "../math/MathUtil.ts"

/** Deterministic 0..1 hash — stable jitter per lattice cell. */
export function hash01(a: number, b: number, salt: number): number {
  let h = a * 374761393 + b * 668265263 + salt * 982451653
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Continuous drift along flow; markers use `along = ia·spacing + drift`. */
export function flowMarkerDriftState(
  t: number,
  driftSpeed: number,
  spacing: number,
): { drift: number; iaMid: number } {
  const drift = t * driftSpeed
  const iaMid = -Math.floor(drift / spacing)
  return { drift, iaMid }
}

export interface FlowMarkerPositionInput {
  ia: number
  ic: number
  spacing: number
  drift: number
  salt: number
  /** Travel heading [rad], atan2(vy, vx). */
  flowDir: number
}

export function flowMarkerPosition(input: FlowMarkerPositionInput): {
  cx: number
  cy: number
  ux: number
  uy: number
  sizeScale: number
} {
  const { ia, ic, spacing, drift, salt, flowDir } = input
  const ux = Math.cos(flowDir)
  const uy = Math.sin(flowDir)
  const px = -uy
  const py = ux
  const jitter = spacing * 0.42
  const ja = (hash01(ia, ic, salt) - 0.5) * jitter * 2
  const jc = (hash01(ia, ic, salt + 11) - 0.5) * jitter * 2
  const along = ia * spacing + drift + ja
  const cross = ic * spacing + jc
  const cx = ux * along + px * cross
  const cy = uy * along + py * cross
  const sizeScale = 0.82 + hash01(ia, ic, salt + 29) * 0.36
  return { cx, cy, ux, uy, sizeScale }
}

/** Meteorological wind FROM → streak / flow heading TO. */
export function windStreakFlowDirection(windFromRad: number): number {
  return windFromRad + Math.PI
}

/** Deep-water swell length from dominant period [s]. */
export function swellWavelength(period: number): number {
  const p = Math.max(1.5, period)
  return clamp(1.56 * p * p, 5, 22)
}

/** Crest line base position along propagation axis (matches EnvironmentViz). */
export function swellCrestAlong(
  crestIndex: number,
  wavelength: number,
  travel: number,
): number {
  return crestIndex * wavelength + travel
}

export function swellCrestIndexMid(travel: number, wavelength: number): number {
  return Math.floor(travel / wavelength)
}

/** Phase time for ripple along crests from visual travel distance. */
export function swellPhaseTimeFromTravel(
  travel: number,
  celerity: number,
): number {
  if (celerity < 1e-6) return 0
  return travel / celerity
}
