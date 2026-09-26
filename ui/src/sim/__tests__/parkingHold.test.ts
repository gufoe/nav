import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { createBoatState } from "../../physics/model/BoatState.ts"
import { degToRad } from "../../math/MathUtil.ts"
import {
  APPROACH_HOLD,
  BERTH_HOLD,
  isBoatMeetingHold,
} from "../parkingHold.ts"

describe("parkingHold", () => {
  test("approach allows slow way on that berth rejects", () => {
    const boat = createBoatState({ u: 0.5, v: 0, r: 0.02 })
    const slow = isBoatMeetingHold(boat, 0.55, 0, APPROACH_HOLD)
    const strict = isBoatMeetingHold(boat, 0.55, 0, BERTH_HOLD)
    assert.equal(slow, true)
    assert.equal(strict, false)
  })

  test("heading must match slot when target heading is provided", () => {
    const aligned = createBoatState({ u: 0.1, v: 0, r: 0, heading: degToRad(90) })
    const skewed = createBoatState({ u: 0.1, v: 0, r: 0, heading: degToRad(50) })
    const target = degToRad(90)
    assert.equal(isBoatMeetingHold(aligned, 0.1, 0, BERTH_HOLD, target), true)
    assert.equal(isBoatMeetingHold(skewed, 0.1, 0, BERTH_HOLD, target), false)
  })

  test("approach allows SOG/STW difference from current", () => {
    const boat = createBoatState({ u: 0.3, v: 0, r: 0 })
    assert.equal(
      isBoatMeetingHold(boat, 0.65, 0.05, APPROACH_HOLD),
      true,
    )
    assert.equal(
      isBoatMeetingHold(boat, 0.65, 0.05, BERTH_HOLD),
      false,
    )
  })
})
