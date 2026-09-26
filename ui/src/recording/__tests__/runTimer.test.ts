import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { RUN_TIMER_START_SOG_MPS, runTimerShouldStart } from "../runTimer.ts"

describe("runTimer", () => {
  test("starts once SOG crosses threshold", () => {
    assert.equal(runTimerShouldStart(RUN_TIMER_START_SOG_MPS - 0.01), false)
    assert.equal(runTimerShouldStart(RUN_TIMER_START_SOG_MPS), true)
  })
})
