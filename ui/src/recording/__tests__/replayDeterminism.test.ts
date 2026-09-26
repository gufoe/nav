import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { GameplayRecorder } from "../GameplayRecorder.ts"
import { snapshotControls, stepReplay } from "../replayPhysics.ts"
import { resolveReplayInitial } from "../../../../shared/replay.ts"
import { BoatDynamics } from "../../physics/BoatDynamics.ts"
import { DEFAULT_YACHT } from "../../physics/boats/defaultYacht.ts"
import { cloneBoatState, createBoatState } from "../../physics/model/BoatState.ts"
import { createControls } from "../../physics/model/Controls.ts"
import { environmentFromScenario } from "../../physics/model/Environment.ts"
import { SCENARIOS } from "../../sim/scenarios.ts"
import { PHYSICS_DT } from "../../physics/fluids/constants.ts"

describe("replay determinism", () => {
  test("re-running recorded controls reproduces the live trajectory", () => {
    const scenario = SCENARIOS[0]!
    const env = environmentFromScenario(scenario.environment)
    const dynamics = new BoatDynamics(DEFAULT_YACHT)
    let live = cloneBoatState(scenario.boat)

    const recorder = new GameplayRecorder(scenario.id, DEFAULT_YACHT.id)
    recorder.reset(live)

    const frames: ReturnType<typeof snapshotControls>[] = []
    for (let i = 0; i < 240; i++) {
      const before = cloneBoatState(live)
      const controls = createControls({
        rudder: Math.sin(i / 40) * 0.6,
        throttle: i < 120 ? 0.35 : -0.2,
        mainsheet: 0.5,
        jibSheet: 0.5,
        engineEngaged: true,
      })
      frames.push(snapshotControls(controls))
      live = dynamics.step(live, controls, env, PHYSICS_DT).state
      if (!recorder.hasRecording) recorder.setInitial(before)
      recorder.recordStep(controls)
    }

    const payload = recorder.finish()
    assert.equal(payload.frames.length, 240)
    assert.equal(payload.timeMs, 240 * PHYSICS_DT * 1000)

    const replayDynamics = new BoatDynamics(DEFAULT_YACHT)
    let replayed = resolveReplayInitial(payload, cloneBoatState(scenario.boat))
    for (const frame of payload.frames) {
      replayed = stepReplay(replayDynamics, replayed, frame, env, payload.fixedDt).state
    }

    assert.deepEqual(replayed, live)
  })

  test("recorder captures initial pose at first recorded step", () => {
    const beforeStep = createBoatState({ x: 1, y: 2, heading: 0.1, rpm: 50, rudderAngle: 0.05 })
    const recorder = new GameplayRecorder("basics-calm", DEFAULT_YACHT.id)
    recorder.reset(beforeStep)
    recorder.setInitial(beforeStep)
    recorder.recordStep(createControls())
    const payload = recorder.finish()
    assert.equal(payload.v, 2)
    assert.equal(payload.initial[0], 1)
    assert.equal(payload.initial[6], 50)
  })

  test("delayed recording matches live trajectory from first recorded step", () => {
    const scenario = SCENARIOS[0]!
    const env = environmentFromScenario(scenario.environment)
    const dynamics = new BoatDynamics(DEFAULT_YACHT)
    let live = cloneBoatState(scenario.boat)

    const recorder = new GameplayRecorder(scenario.id, DEFAULT_YACHT.id)
    recorder.reset(live)

    const warmupSteps = 48
    const recordedSteps = 200
    for (let i = 0; i < warmupSteps + recordedSteps; i++) {
      const before = cloneBoatState(live)
      const controls = createControls({
        rudder: 0.2,
        throttle: i >= warmupSteps ? 0.4 : 0,
        engineEngaged: true,
      })
      live = dynamics.step(live, controls, env, PHYSICS_DT).state
      if (i >= warmupSteps) {
        if (!recorder.hasRecording) recorder.setInitial(before)
        recorder.recordStep(controls)
      }
    }

    const payload = recorder.finish()
    assert.equal(payload.frames.length, recordedSteps)

    const replayDynamics = new BoatDynamics(DEFAULT_YACHT)
    let replayed = resolveReplayInitial(payload, cloneBoatState(scenario.boat))
    for (const frame of payload.frames) {
      replayed = stepReplay(replayDynamics, replayed, frame, env, payload.fixedDt).state
    }

    assert.deepEqual(replayed, live)
  })
})
