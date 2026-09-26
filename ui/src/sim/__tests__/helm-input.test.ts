import { test } from "node:test"
import assert from "node:assert/strict"

import type { Action } from "../../core/Input.ts"
import type { HelmInput } from "../HelmInput.ts"
import { Helm } from "../Helm.ts"
import { advanceActuators } from "../../physics/BoatDynamics.ts"
import { DEFAULT_YACHT } from "../../physics/boats/defaultYacht.ts"
import { createDefaultBoat } from "../types.ts"

function mockInput(options: {
  down?: readonly Action[]
  pressed?: readonly Action[]
}): HelmInput {
  const down = new Set(options.down ?? [])
  const pressed = new Set(options.pressed ?? [])
  return {
    isActionDown: (action) => down.has(action),
    wasActionPressed: (action) => pressed.has(action),
  }
}

test("throttle keys change lever demand", () => {
  const helm = new Helm()
  helm.update(mockInput({ down: ["throttleUp"] }), 1)
  assert.ok(helm.controls.throttle > 0)
  helm.update(mockInput({ pressed: ["throttleNeutral"] }), 0)
  assert.equal(helm.controls.throttle, 0)
})

test("rudder keys move demand; auto-center returns to midships", () => {
  const helm = new Helm()
  for (let i = 0; i < 30; i++) {
    helm.update(mockInput({ down: ["rudderRight"] }), 0.05)
  }
  assert.ok(helm.controls.rudder > 0.5)
  for (let i = 0; i < 40; i++) {
    helm.update(mockInput({}), 0.05)
  }
  assert.ok(Math.abs(helm.controls.rudder) < 0.05)
})

test("K toggles auto-center; C snaps helm demand", () => {
  const helm = new Helm()
  for (let i = 0; i < 20; i++) {
    helm.update(mockInput({ down: ["rudderRight"] }), 0.05)
  }
  const held = helm.controls.rudder
  assert.ok(held > 0.3)

  helm.update(mockInput({ pressed: ["helmAutoCenter"] }), 0)
  assert.equal(helm.autoCenterRudder, false)
  helm.update(mockInput({}), 0.2)
  assert.ok(Math.abs(helm.controls.rudder - held) < 0.01)

  helm.update(mockInput({ pressed: ["rudderCenter"] }), 0)
  assert.equal(helm.controls.rudder, 0)
})

test("M toggles engine engaged without moving the throttle lever", () => {
  const helm = new Helm()
  helm.controls.throttle = 0.6
  helm.update(mockInput({ pressed: ["engineToggle"] }), 0)
  assert.equal(helm.controls.engineEngaged, false)
  assert.equal(helm.controls.throttle, 0.6)

  const state = createDefaultBoat(0, 0, 0)
  const spooled = advanceActuators(state, helm.controls, DEFAULT_YACHT, 2)
  assert.ok(Math.abs(spooled.rpm) < 1)

  helm.update(mockInput({ pressed: ["engineToggle"] }), 0)
  const driving = advanceActuators(state, helm.controls, DEFAULT_YACHT, 2)
  assert.ok(driving.rpm > 100)
})

test("reset restores default demands", () => {
  const helm = new Helm()
  helm.controls.rudder = 0.8
  helm.controls.throttle = -0.5
  helm.autoCenterRudder = false
  helm.reset()
  assert.equal(helm.controls.rudder, 0)
  assert.equal(helm.controls.throttle, 0)
  assert.equal(helm.controls.mainsheet, 0.5)
  assert.equal(helm.autoCenterRudder, true)
})

test("sheet keys adjust mainsheet and jib together", () => {
  const helm = new Helm()
  const start = helm.controls.mainsheet
  helm.update(mockInput({ down: ["sheetIn"] }), 0.5)
  assert.ok(helm.controls.mainsheet < start)
  assert.ok(helm.controls.jibSheet < start)
})
