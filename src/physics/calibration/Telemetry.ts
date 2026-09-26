import type { ForceBreakdown } from "../BoatDynamics.ts"
import type { BoatState } from "../model/BoatState.ts"
import type { Wrench2D } from "../math/Wrench.ts"

/**
 * One row per physics step: pose, velocities, actuators and every component
 * wrench. When a manoeuvre looks wrong, the row says whether it was thrust,
 * yaw damping or rudder lift — no tuning by feel.
 */
export interface TelemetryRow {
  t: number

  x: number
  y: number
  heading: number

  u: number
  v: number
  r: number

  rpm: number
  rudderAngle: number
  thrust: number
  washSpeed: number
  rudderAlpha: number

  sog: number
  stw: number
  apparentWindSpeed: number
  apparentWindAngle: number

  hullFx: number
  hullFy: number
  hullMz: number
  keelFx: number
  keelFy: number
  keelMz: number
  rudderFx: number
  rudderFy: number
  rudderMz: number
  propFx: number
  propFy: number
  propMz: number
  walkFx: number
  walkFy: number
  walkMz: number
  windFx: number
  windFy: number
  windMz: number
  sailFx: number
  sailFy: number
  sailMz: number
  totalFx: number
  totalFy: number
  totalMz: number
}

export function telemetryRow(
  t: number,
  state: BoatState,
  forces: ForceBreakdown,
): TelemetryRow {
  const w = (prefix: string, wrench: Wrench2D): Record<string, number> => ({
    [`${prefix}Fx`]: wrench.fx,
    [`${prefix}Fy`]: wrench.fy,
    [`${prefix}Mz`]: wrench.mz,
  })

  return {
    t,
    x: state.x,
    y: state.y,
    heading: state.heading,
    u: state.u,
    v: state.v,
    r: state.r,
    rpm: state.rpm,
    rudderAngle: state.rudderAngle,
    thrust: forces.thrust,
    washSpeed: forces.washSpeed,
    rudderAlpha: forces.rudderAlpha,
    sog: Math.hypot(forces.groundVelocity.x, forces.groundVelocity.y),
    stw: Math.hypot(state.u, state.v),
    apparentWindSpeed: forces.apparentWind.speed,
    apparentWindAngle: forces.apparentWind.angleFromBow,
    ...w("hull", forces.hull),
    ...w("keel", forces.keel),
    ...w("rudder", forces.rudder),
    ...w("prop", forces.prop),
    ...w("walk", forces.propWalk),
    ...w("wind", forces.windage),
    ...w("sail", forces.sails),
    ...w("total", forces.total),
  } as TelemetryRow
}

/**
 * Collects rows at a fixed sample interval so a 150 s run is a readable file
 * rather than eighteen thousand lines.
 */
export class TelemetryLog {
  readonly rows: TelemetryRow[] = []

  private readonly interval: number
  private nextSample = 0

  constructor(interval = 0.1) {
    this.interval = interval
  }

  record(t: number, state: BoatState, forces: ForceBreakdown): void {
    if (t + 1e-9 < this.nextSample) return
    this.nextSample = t + this.interval
    this.rows.push(telemetryRow(t, state, forces))
  }

  csv(): string {
    return telemetryToCsv(this.rows)
  }
}

export function telemetryToCsv(rows: readonly TelemetryRow[], digits = 4): string {
  const first = rows[0]
  if (!first) return ""

  const columns = Object.keys(first) as (keyof TelemetryRow)[]
  const lines = [columns.join(",")]
  for (const row of rows) {
    lines.push(columns.map((c) => trim(row[c], digits)).join(","))
  }
  return `${lines.join("\n")}\n`
}

function trim(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "0"
  return Number(value.toFixed(digits)).toString()
}
