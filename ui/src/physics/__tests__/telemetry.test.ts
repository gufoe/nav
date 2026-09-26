import { test } from "node:test"
import assert from "node:assert/strict"

import { knots, run } from "./harness.ts"
import { createControls } from "../model/Controls.ts"
import { telemetryToCsv } from "../calibration/Telemetry.ts"

test("telemetry samples at the requested interval", () => {
  const logged = run({
    controls: createControls({ throttle: 1, rudder: 1 }),
    state: { u: knots(3) },
    duration: 10,
    record: 0.5,
  })

  // t = 0 plus one sample every 0.5 s.
  assert.equal(logged.telemetry.length, 21)
  assert.equal(logged.telemetry[0]?.t, 0)
  assert.ok(Math.abs((logged.telemetry[20]?.t ?? 0) - 10) < 1e-6)

  const none = run({ duration: 5 })
  assert.equal(none.telemetry.length, 0)
})

test("logged components sum to the logged total", () => {
  const logged = run({
    controls: createControls({ throttle: -0.8, rudder: -1 }),
    env: { windSpeed: knots(12), windDirection: 1, currentSpeed: 0.4, currentDirection: 2 },
    duration: 4,
    record: 0.25,
  })

  for (const row of logged.telemetry) {
    const fx = row.hullFx + row.keelFx + row.rudderFx + row.propFx + row.walkFx + row.windFx + row.sailFx
    const mz = row.hullMz + row.keelMz + row.rudderMz + row.propMz + row.walkMz + row.windMz + row.sailMz
    assert.ok(Math.abs(fx - row.totalFx) < 1e-6, `fx ${fx} vs ${row.totalFx}`)
    assert.ok(Math.abs(mz - row.totalMz) < 1e-6, `mz ${mz} vs ${row.totalMz}`)
  }
})

test("CSV has a header and one line per sample", () => {
  const logged = run({
    controls: createControls({ throttle: 1 }),
    duration: 2,
    record: 0.5,
  })
  const lines = telemetryToCsv(logged.telemetry).trimEnd().split("\n")

  assert.equal(lines.length, logged.telemetry.length + 1)
  assert.match(lines[0] ?? "", /^t,x,y,heading,u,v,r,/)
  assert.ok((lines[0] ?? "").includes("rudderMz"))
  assert.equal(lines[1]?.split(",").length, (lines[0] ?? "").split(",").length)
  assert.equal(telemetryToCsv([]), "")
})
