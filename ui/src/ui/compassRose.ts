import { radToDeg } from "../math/MathUtil.ts"

/**
 * World frame: 0 = east, π/2 = north (CCW).
 * Rose SVG: 0° = up (north on the dial).
 */
export function worldDirectionToRoseDeg(worldRadians: number): number {
  return 90 - radToDeg(worldRadians)
}

/**
 * Boat heading on the HUD / objectives — clockwise from north (000°–360°),
 * same as the conditions rose. **Starboard turn increases** this value.
 * Internal ψ is CCW from +x ({@link Frames}); bow direction is (cos ψ, sin ψ).
 */
export function boatHeadingDisplayDeg(worldRadians: number): number {
  const east = Math.cos(worldRadians)
  const north = Math.sin(worldRadians)
  let deg = (Math.atan2(east, north) * 180) / Math.PI
  if (deg < 0) deg += 360
  return Math.round(deg)
}
