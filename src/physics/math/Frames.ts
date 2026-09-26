/**
 * Frame conventions (SI everywhere).
 *
 *   WORLD   x = east, y = north, heading ψ measured CCW from +x.
 *   BODY    x = bow, y = port, yaw rate r positive CCW (bow swings to port).
 *
 * This is Fossen's surge/sway/yaw model mirrored about the centreline
 * (he uses y = starboard, z = down). Every equation here is mirror
 * invariant, so the only thing that matters is staying consistent:
 * positive fy, mz and r all point to port.
 */

/** Rotate a body-frame vector into the world frame. */
export function bodyToWorld(
  bx: number,
  by: number,
  heading: number,
): { x: number; y: number } {
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  return { x: c * bx - s * by, y: s * bx + c * by }
}

/** Rotate a world-frame vector into the body frame. */
export function worldToBody(
  wx: number,
  wy: number,
  heading: number,
): { x: number; y: number } {
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  return { x: c * wx + s * wy, y: -s * wx + c * wy }
}

/** Body-frame velocity of a point offset from the CG, including yaw. */
export function velocityAtPoint(
  u: number,
  v: number,
  r: number,
  px: number,
  py: number,
): { x: number; y: number } {
  return { x: u - r * py, y: v + r * px }
}
