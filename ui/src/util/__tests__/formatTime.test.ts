import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { formatRunTimeMs } from "../formatTime.ts"

describe("formatRunTimeMs", () => {
  test("formats minutes, seconds, tenths", () => {
    assert.equal(formatRunTimeMs(83200), "1:23.2")
    assert.equal(formatRunTimeMs(500), "0:00.5")
  })
})
