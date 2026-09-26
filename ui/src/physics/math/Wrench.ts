/**
 * Body-frame wrench: forces [N] and yaw moment [N·m].
 * fy and mz are positive to port (see Frames.ts).
 */
export interface Wrench2D {
  fx: number
  fy: number
  mz: number
}

export function zeroWrench(): Wrench2D {
  return { fx: 0, fy: 0, mz: 0 }
}

export function addWrench(into: Wrench2D, w: Wrench2D): Wrench2D {
  into.fx += w.fx
  into.fy += w.fy
  into.mz += w.mz
  return into
}

export function cloneWrench(w: Wrench2D): Wrench2D {
  return { fx: w.fx, fy: w.fy, mz: w.mz }
}

/**
 * A force applied at a point offset from the CG, as a wrench.
 * Applying forces where they act is what produces weather helm, prop walk
 * yaw, bows blowing off and so on without any special-case rules.
 */
export function wrenchFromForceAtPoint(
  fx: number,
  fy: number,
  px: number,
  py: number,
): Wrench2D {
  return { fx, fy, mz: px * fy - py * fx }
}
