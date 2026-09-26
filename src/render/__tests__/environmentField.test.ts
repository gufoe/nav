import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { degToRad } from "../../math/MathUtil.ts"
import {
  flowMarkerDriftState,
  flowMarkerPosition,
  hash01,
  swellCrestAlong,
  swellCrestIndexMid,
  swellPhaseTimeFromTravel,
  swellWavelength,
  windStreakFlowDirection,
} from "../environmentField.ts"

describe("environmentField", () => {
  test("hash01 is stable and varies by cell", () => {
    const a = hash01(1, 2, 0x57)
    const b = hash01(1, 2, 0x57)
    const c = hash01(2, 2, 0x57)
    assert.equal(a, b)
    assert.notEqual(a, c)
    assert.ok(a >= 0 && a <= 1)
  })

  test("wind streak direction is downwind of meteorological FROM", () => {
    const from = degToRad(135)
    assert.ok(Math.abs(windStreakFlowDirection(from) - (from + Math.PI)) < 1e-12)
  })

  test("flow markers move downwind over time", () => {
    const flowDir = degToRad(45)
    const spacing = 8
    const driftSpeed = 2
    const salt = 0x57
    const ia = 0
    const ic = 0

    const pos = (t: number) => {
      const { drift } = flowMarkerDriftState(t, driftSpeed, spacing)
      return flowMarkerPosition({ ia, ic, spacing, drift, salt, flowDir })
    }

    const p0 = pos(0)
    const p1 = pos(1)
    const ux = Math.cos(flowDir)
    const uy = Math.sin(flowDir)
    const delta = (p1.cx - p0.cx) * ux + (p1.cy - p0.cy) * uy
    assert.ok(delta > 0, "marker should drift with flow, not against it")
  })

  test("flow marker displacement is monotonic without modulo snaps", () => {
    const flowDir = 0
    const spacing = 9
    const driftSpeed = 1.8
    const salt = 0x63
    let prev = flowMarkerPosition({
      ia: 0,
      ic: 0,
      spacing,
      drift: 0,
      salt,
      flowDir,
    }).cx

    for (let t = 0.1; t <= 120; t += 0.5) {
      const { drift } = flowMarkerDriftState(t, driftSpeed, spacing)
      const cx = flowMarkerPosition({
        ia: 0,
        ic: 0,
        spacing,
        drift,
        salt,
        flowDir,
      }).cx
      assert.ok(cx + 1e-9 >= prev, `snap at t=${t}`)
      prev = cx
    }
  })

  test("swell helpers use bounded travel, not unbounded phase offset", () => {
    const period = 3.2
    const wavelength = swellWavelength(period)
    const travel = 50
    assert.ok(wavelength >= 5 && wavelength <= 22)
    assert.equal(swellCrestAlong(3, wavelength, travel), 3 * wavelength + travel)
    assert.equal(swellCrestIndexMid(travel, wavelength), Math.floor(travel / wavelength))
    assert.ok(swellPhaseTimeFromTravel(travel, 2) === travel / 2)
  })
})
