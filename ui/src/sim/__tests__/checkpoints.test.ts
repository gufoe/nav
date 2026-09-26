import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { SCENARIOS } from "../scenarios.ts"
import {
  assertCheckpointsSeparated,
  assertStandardSlipEnvelope,
  maxHoldDistanceFromDock,
  resolveCheckpoints,
} from "../checkpoints.ts"
import { CHECKPOINTS_PER_LEVEL } from "../parkingZone.ts"
import { degToRad } from "../../math/MathUtil.ts"

const CANONICAL_HEADINGS = new Set([90, 180])

function headingDeg(h: number): number {
  const d = (h * 180) / Math.PI
  const n = Math.round(((d % 360) + 360) % 360)
  return n > 180 ? n - 360 : n
}

describe("checkpoint layouts", () => {
  test("every scenario uses standard slips with canonical alignments", () => {
    for (const scenario of SCENARIOS) {
      const holds = resolveCheckpoints(scenario)
      assert.ok(holds.length >= 2 && holds.length <= 3)
      assert.doesNotThrow(() => assertStandardSlipEnvelope(holds))
      assert.doesNotThrow(() => assertCheckpointsSeparated(holds))
      assert.ok(maxHoldDistanceFromDock(holds, scenario.dock) <= 12)

      for (const h of holds) {
        const onEast = h.position.x >= scenario.dock.width / 2 + 2
        const onWest = h.position.x <= -(scenario.dock.width / 2 + 2)
        assert.ok(
          onEast || onWest,
          `${scenario.id} ${h.label} must be on a mooring side of the dock`,
        )
        if (/stern-to/i.test(h.label)) {
          assert.ok(onWest, `${h.label} should be on the west face`)
        }
        assert.ok(
          CANONICAL_HEADINGS.has(headingDeg(h.heading)),
          `${h.label} heading ${headingDeg(h.heading)}°`,
        )
      }
    }
  })

  test("basics-calm is approach, finish, then Med stern-to", () => {
    const scenario = SCENARIOS.find((s) => s.id === "basics-calm")!
    const holds = resolveCheckpoints(scenario)
    assert.equal(holds.length, CHECKPOINTS_PER_LEVEL)
    assert.match(holds[0]!.label, /approach.*east/i)
    assert.match(holds[1]!.label, /finish.*east/i)
    assert.match(holds[2]!.label, /stern-to.*west/i)
    assert.equal(holds[0]!.holdProfile, "approach")
    assert.equal(holds[1]!.holdProfile, "berth")
    assert.ok(Math.abs(holds[0]!.heading - degToRad(90)) < 0.01)
    assert.ok(holds[0]!.position.y < holds[1]!.position.y)
  })

  test("three-hold levels are always approach, finish, then other style", () => {
    for (const id of [
      "basics-calm",
      "basics-wind",
      "basics-wind-current",
      "basics-chop",
      "crosswind-berth",
    ]) {
      const holds = resolveCheckpoints(SCENARIOS.find((s) => s.id === id)!)
      assert.equal(holds.length, CHECKPOINTS_PER_LEVEL)
      assert.match(holds[0]!.label, /east/i)
      assert.match(holds[1]!.label, /east/i)
      assert.match(holds[2]!.label, /west/i)
      assert.match(holds[2]!.label, /stern-to/i)
      assert.equal(holds[0]!.holdProfile, "approach")
      assert.equal(holds[1]!.holdProfile, "berth")
      assert.ok(holds[0]!.position.x > 0)
      assert.ok(holds[1]!.position.x > 0)
      assert.ok(holds[2]!.position.x < 0)
    }
  })

  test("basics-chop third hold is Med stern-to after American finish", () => {
    const holds = resolveCheckpoints(
      SCENARIOS.find((s) => s.id === "basics-chop")!,
    )
    assert.match(holds[2]!.label, /stern-to/i)
    assert.equal(headingDeg(holds[0]!.heading), 90)
    assert.equal(headingDeg(holds[1]!.heading), 90)
    assert.equal(headingDeg(holds[2]!.heading), 180)
  })
})
