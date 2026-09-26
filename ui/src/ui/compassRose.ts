import { radToDeg } from "../math/MathUtil.ts"

/**
 * World frame: 0 = east, π/2 = north (CCW).
 * Rose SVG: 0° = up (north on the dial).
 */
export function worldDirectionToRoseDeg(worldRadians: number): number {
  return 90 - radToDeg(worldRadians)
}
