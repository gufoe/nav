/**
 * Open-water propeller curve, v1: a straight-line fit KT(J) = kt0 − kt1·J.
 * Good enough for docking rpm; swap in a real Wageningen series later.
 */
export function thrustCoefficient(J: number, kt0: number, kt1: number): number {
  return Math.max(0, kt0 - kt1 * J)
}

/** Advance coefficient J = Va / (n·D). Zero rpm gives zero. */
export function advanceCoefficient(
  advanceSpeed: number,
  shaftRps: number,
  diameter: number,
): number {
  const n = Math.abs(shaftRps)
  if (n < 1e-3 || diameter <= 0) return 0
  return advanceSpeed / (n * diameter)
}

/**
 * Fully developed slipstream speed behind a loaded disc (momentum theory):
 *   V_slip = sqrt(Va² + 2T / (ρ·A))
 */
export function slipstreamSpeed(
  advanceSpeed: number,
  thrust: number,
  diameter: number,
  density: number,
): number {
  if (thrust <= 0 || diameter <= 0) return advanceSpeed
  return Math.sqrt(
    advanceSpeed * advanceSpeed + (2 * thrust) / (density * discArea(diameter)),
  )
}

export function discArea(diameter: number): number {
  return (Math.PI * diameter * diameter) / 4
}

/**
 * Cross-section of the jet once it has sped up, from continuity. The jet
 * contracts as it accelerates, so only a small patch of the rudder actually
 * stands in fast water — without this the rudder can extract more side force
 * than the propeller ever put into the flow.
 */
export function slipstreamArea(
  advanceSpeed: number,
  jetSpeed: number,
  diameter: number,
): number {
  const area = discArea(diameter)
  if (jetSpeed <= 1e-3) return area
  const speedAtDisc = 0.5 * (advanceSpeed + jetSpeed)
  return Math.min(area, (area * speedAtDisc) / jetSpeed)
}
