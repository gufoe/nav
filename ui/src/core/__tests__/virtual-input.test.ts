import { test } from "node:test"
import assert from "node:assert/strict"

import { Input } from "../Input.ts"

test("virtual actions expose held and edge-triggered input", () => {
  const input = new Input()

  input.pressAction("throttleUp")
  assert.equal(input.isActionDown("throttleUp"), true)
  assert.equal(input.wasActionPressed("throttleUp"), true)

  input.endFrame()
  assert.equal(input.wasActionPressed("throttleUp"), false)

  input.releaseAction("throttleUp")
  assert.equal(input.isActionDown("throttleUp"), false)
})

test("a tapped virtual action remains pressed for the current frame", () => {
  const input = new Input()

  input.pressAction("pause")
  input.releaseAction("pause")

  assert.equal(input.isActionDown("pause"), false)
  assert.equal(input.wasActionPressed("pause"), true)
})
