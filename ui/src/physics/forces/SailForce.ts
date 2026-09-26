import type { BoatSpec, SailSpec } from "../model/BoatSpec.ts"
import type { Controls } from "../model/Controls.ts"
import type { ApparentWind } from "../fluids/ApparentWind.ts"
import { DEFAULT_SAIL_POLAR, type SailPolar } from "../calibration/PolarData.ts"
import { AIR_DENSITY } from "../fluids/constants.ts"
import { foilForce } from "../fluids/Foil.ts"
import { addWrench, wrenchFromForceAtPoint, zeroWrench, type Wrench2D } from "../math/Wrench.ts"
import { clamp, wrapAngle } from "../../math/MathUtil.ts"

export interface SailState {
  /** Boom / clew angle off the centreline [rad], + = to port. */
  boomAngle: number
  /** Angle of attack of the apparent wind on the sail [rad]. */
  alpha: number
  /** True while the sail is barely loaded — eased too far, or head to wind. */
  luffing: boolean
  force: Wrench2D
}

export interface SailResult {
  wrench: Wrench2D
  main: SailState
  jib: SailState
}

const IDLE_SAIL = (): SailState => ({
  boomAngle: 0,
  alpha: 0,
  luffing: true,
  force: zeroWrench(),
})

/**
 * Sails as two sheeted foils driven by apparent wind.
 *
 * No "sail power" input: the sheet only sets how far the sail may swing out.
 * The sail then settles against that stop, and the resulting angle of attack
 * decides whether it drives, luffs or stalls.
 */
export function sailForce(
  controls: Controls,
  boat: BoatSpec,
  aw: ApparentWind,
  polar: SailPolar = DEFAULT_SAIL_POLAR,
): SailResult {
  if (!boat.sails.enabled || aw.speed < 0.2) {
    return { wrench: zeroWrench(), main: IDLE_SAIL(), jib: IDLE_SAIL() }
  }

  const main = singleSail(boat.sails.main, clamp(controls.mainsheet, 0, 1), aw, polar)
  const jib = singleSail(boat.sails.jib, clamp(controls.jibSheet, 0, 1), aw, polar)

  const wrench = zeroWrench()
  addWrench(wrench, main.force)
  addWrench(wrench, jib.force)
  return { wrench, main, jib }
}

function singleSail(
  sail: SailSpec,
  sheet: number,
  aw: ApparentWind,
  polar: SailPolar,
): SailState {
  if (sail.area <= 0) return IDLE_SAIL()

  // Left alone, the sail weathervanes: its chord lines up with the apparent
  // wind and it luffs. The sheet stops it before that whenever it is trimmed in.
  const freeAngle = -wrapAngle(Math.atan2(aw.bodyY, aw.bodyX) + Math.PI)
  const limit = sheet * sail.maxSheetAngle
  const boomAngle = clamp(freeAngle, -limit, limit)

  // Chord points forward from clew to luff, i.e. opposite the boom.
  const chordAngle = -boomAngle
  // The sail moves through the air at minus the apparent wind velocity.
  const velX = -aw.bodyX
  const velY = -aw.bodyY
  const alpha = wrapAngle(Math.atan2(velY, velX) - chordAngle)

  const force = foilForce(
    velX,
    velY,
    { cl: polar.cl(alpha), cd: polar.cd(alpha) },
    sail.area,
    AIR_DENSITY,
  )

  return {
    boomAngle,
    alpha,
    luffing: Math.abs(alpha) < 0.02,
    force: wrenchFromForceAtPoint(force.fx, force.fy, sail.x, sail.y),
  }
}
