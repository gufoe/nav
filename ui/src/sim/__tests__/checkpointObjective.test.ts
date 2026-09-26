import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { Vec2 } from "../../math/Vec2.ts"
import { degToRad } from "../../math/MathUtil.ts"
import { resolveCheckpoints } from "../checkpoints.ts"
import { SCENARIOS } from "../scenarios.ts"
import { holdCriteriaFor } from "../parkingHold.ts"
import {
  objectiveBearingLabel,
  objectivePlaceLabel,
  objectiveSpeedLabel,
} from "../checkpointObjective.ts"

describe("checkpointObjective", () => {
  test("formats place, speed, and bearing for basics approach", () => {
    const scenario = SCENARIOS.find((s) => s.id === "basics-calm")!
    const approach = resolveCheckpoints(scenario)[0]!
    const criteria = holdCriteriaFor("approach")

    assert.equal(objectivePlaceLabel(approach), "East · approach slip")
    assert.match(objectiveSpeedLabel(criteria), /^≤ [\d.]+ kn SOG$/)
    assert.equal(objectiveBearingLabel(approach), "0° · S→N along finger")
  })

  test("stern-to bearing label uses normalized degrees", () => {
    assert.equal(
      objectiveBearingLabel({
        position: Vec2.from(0, 0),
        heading: degToRad(180),
        length: 11,
        width: 4,
        label: "Med — stern-to (west)",
        technique: "",
      }),
      "180° · stern-to (bow east)",
    )
  })
})
