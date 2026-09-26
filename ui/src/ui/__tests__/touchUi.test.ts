import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { prefersTouchHelm } from "../touchUi.ts"

describe("touchUi", () => {
  test("prefersTouchHelm is false without window", () => {
    assert.equal(prefersTouchHelm(), false)
  })
})
