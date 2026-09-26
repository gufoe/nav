/**
 * Prints the standard manoeuvre set for a boat: the numbers you compare
 * against real trials when calibrating a BoatSpec.
 *
 *   npm run physics:report
 *   npm run physics:report -- --csv          → telemetry/ (one CSV per run)
 *   npm run physics:report -- --csv out/dir
 *
 * Each CSV has one row per sample with the pose, velocities, actuators and
 * every component wrench, so a wrong-looking manoeuvre can be traced to the
 * force that caused it.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import {
  distanceFromOrigin,
  groundSpeed,
  knots,
  run,
  toKnots,
  waterSpeed,
  type RunResult,
} from "../src/physics/__tests__/harness.ts"
import { createControls } from "../src/physics/model/Controls.ts"
import type { BoatState } from "../src/physics/model/BoatState.ts"
import { DEFAULT_YACHT } from "../src/physics/boats/defaultYacht.ts"
import { telemetryToCsv } from "../src/physics/calibration/Telemetry.ts"
import { analyzeTurningCircle } from "../src/physics/calibration/TurningCircle.ts"
import { analyzeCrashStop } from "../src/physics/calibration/CrashStop.ts"
import { degToRad, radToDeg, wrapAngle } from "../src/math/MathUtil.ts"

const csvDir = parseCsvDir(process.argv.slice(2))
const record = csvDir ? 0.1 : undefined

const f = (n: number, d = 2): string => n.toFixed(d)

console.log(`${DEFAULT_YACHT.name} — manoeuvre report\n`)

// A — coasting
report("A-coast", () => {
  const stop = run({
    state: { u: knots(3) },
    duration: 300,
    until: (s) => s.u < knots(0.5),
    record,
  })
  return [stop, `A  coast 3 kn → 0.5 kn: ${f(stop.time, 1)} s, ${f(stop.state.x, 1)} m`]
})

// B — acceleration
report("B-acceleration", () => {
  let to2 = -1
  let to4 = -1
  const full = run({
    controls: createControls({ throttle: 1 }),
    duration: 180,
    until: (s, t) => {
      if (to2 < 0 && s.u >= knots(2)) to2 = t
      if (to4 < 0 && s.u >= knots(4)) to4 = t
      return false
    },
    record,
  })
  const cruise = run({ controls: createControls({ throttle: 0.7 }), duration: 180 })
  return [
    full,
    `B  0–2 kn ${f(to2, 1)} s · 0–4 kn ${f(to4, 1)} s · full ${f(toKnots(full.state.u))} kn · 70% ${f(toKnots(cruise.state.u))} kn`,
  ]
})

// C — turning circle
report("C-turning-circle", () => {
  const samples: { state: BoatState; time: number }[] = []
  const turn = run({
    controls: createControls({ throttle: 0.7, rudder: 1 }),
    state: { u: knots(5), heading: 0 },
    duration: 120,
    record,
    onStep: (state, _f, t) => samples.push({ state: { ...state }, time: t }),
  })
  const tc = analyzeTurningCircle(samples, 0, -1)
  const diaLoa = tc.steadyDiameter / DEFAULT_YACHT.lengthOverall
  return [
    turn,
    `C  turn @ 90°: adv ${f(tc.advance90, 1)} m · xfer ${f(tc.transfer90, 1)} m · tac dia ${f(tc.tacticalDiameter180, 1)} m · steady dia ${f(tc.steadyDiameter, 1)} m (${f(diaLoa, 2)} LOA) · ${f(radToDeg(tc.steadyYawRate), 1)} °/s · ${f(toKnots(tc.steadySpeed))} kn`,
  ]
})

// D — prop wash
report("D-prop-wash", () => {
  const burst = run({
    controls: createControls({ throttle: 1, rudder: 1 }),
    duration: 2.5,
    record: record && 0.05,
  })
  const centred = run({ controls: createControls({ throttle: 1 }), duration: 2.5 })
  return [
    burst,
    `D  2.5 s burst, hard to starboard: ${f(radToDeg(burst.state.r), 1)} °/s, ${f(burst.state.x)} m headway · wash ${f(burst.forces.washSpeed)} m/s · helm midships ${f(radToDeg(centred.state.r), 1)} °/s`,
  ]
})

// E — prop walk
report("E-prop-walk", () => {
  const astern = run({
    controls: createControls({ throttle: -1 }),
    duration: 8,
    record: record && 0.05,
  })
  return [
    astern,
    `E  8 s full astern: ${f(radToDeg(astern.state.r), 1)} °/s · stern walks ${f(astern.state.y)} m · ${f(astern.state.x)} m astern · thrust ${f(astern.forces.thrust, 0)} N`,
  ]
})

// F — current
report("F-current", () => {
  const set = knots(2)
  const drift = run({
    state: { u: -set },
    env: { currentSpeed: set, currentDirection: 0 },
    duration: 180,
    record,
  })
  return [
    drift,
    `F  2 kn current: STW ${f(toKnots(waterSpeed(drift.state)))} kn · SOG ${f(toKnots(groundSpeed(drift)))} kn`,
  ]
})

// I — crash stop
report("I-crash-stop", () => {
  const samples: { state: BoatState; time: number }[] = []
  const stop = run({
    state: { u: knots(3), heading: 0 },
    controls: createControls({ throttle: -1 }),
    duration: 120,
    until: (s) => s.u <= 0.05,
    record,
    onStep: (state, _f, t) => samples.push({ state: { ...state }, time: t }),
  })
  const cs = analyzeCrashStop(samples, 0)
  return [
    stop,
    `I  crash stop 3 kn → 0: ${f(cs.timeToStop, 1)} s · ${f(cs.headway, 1)} m headway · max lateral ${f(cs.maxLateral, 1)} m · heading Δ ${f(cs.headingChangeDeg, 1)}° · yaw ${f(radToDeg(cs.finalYawRate), 1)} °/s`,
  ]
})

// G — crosswind
report("G-crosswind", () => {
  const wind = run({
    env: { windSpeed: knots(15), windDirection: Math.PI / 2 },
    duration: 60,
    record,
  })
  return [
    wind,
    `G  60 s in 15 kn on the beam: ${f(distanceFromOrigin(wind.state), 1)} m downwind · ${f(toKnots(groundSpeed(wind)))} kn · bow off ${f(radToDeg(wind.state.heading), 0)}°`,
  ]
})

// H — sail polar
{
  const sailing = { ...DEFAULT_YACHT, sails: { ...DEFAULT_YACHT.sails, enabled: true } }
  const windDirection = Math.PI / 2

  for (const tws of [6, 12, 18]) {
    const entries: string[] = []
    for (const twa of [30, 45, 60, 90, 120, 150, 180]) {
      const heading = wrapAngle(windDirection - degToRad(twa))
      const sheet = Math.min(1, Math.max(0, (twa - 15) / 135))
      let latest: BoatState | null = null
      const sail = run({
        boat: sailing,
        state: { heading },
        env: { windSpeed: knots(tws), windDirection },
        controls: () =>
          createControls({
            mainsheet: sheet,
            jibSheet: sheet,
            rudder: latest ? autopilot(latest, heading) : 0,
          }),
        duration: 150,
        until: (s) => {
          latest = s
          return false
        },
        record: record && 0.5,
      })
      entries.push(`${twa}° ${f(toKnots(waterSpeed(sail.state)), 1)}`)
      writeCsv(`H-polar-${tws}kn-${twa}deg`, sail)
    }
    console.log(`H  polar @ ${tws} kn TWS (kn): ${entries.join(" · ")}`)
  }
}

if (csvDir) console.log(`\nTelemetry written to ${csvDir}/`)

function report(name: string, manoeuvre: () => [RunResult, string]): void {
  const [result, line] = manoeuvre()
  console.log(line)
  writeCsv(name, result)
}

function writeCsv(name: string, result: RunResult): void {
  if (!csvDir || result.telemetry.length === 0) return
  mkdirSync(csvDir, { recursive: true })
  writeFileSync(join(csvDir, `${name}.csv`), telemetryToCsv(result.telemetry))
}

function parseCsvDir(args: string[]): string | null {
  const index = args.indexOf("--csv")
  if (index < 0) return null
  const next = args[index + 1]
  return next && !next.startsWith("--") ? next : "telemetry"
}

function autopilot(state: BoatState, target: number): number {
  const error = wrapAngle(target - state.heading)
  return Math.max(-1, Math.min(1, -2.5 * error + 4 * state.r))
}
