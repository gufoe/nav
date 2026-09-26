import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { Vec2 } from "../../math/Vec2.ts"
import { createBoatState } from "../../physics/model/BoatState.ts"
import { CheckpointProgress } from "../CheckpointProgress.ts"
import { resolveCheckpoints } from "../checkpoints.ts"
import { BERTH_HOLD } from "../parkingHold.ts"
import { SCENARIOS } from "../scenarios.ts"
import {
  boatInParkingZone,
  pointInParkingZone,
} from "../parkingZone.ts"

describe("parkingZone", () => {
  test("point inside oriented rectangle", () => {
    const zone = {
      position: Vec2.from(2, 3),
      heading: 0,
      length: 4,
      width: 2,
    }
    assert.equal(pointInParkingZone(2, 3, zone), true)
    assert.equal(pointInParkingZone(3.9, 3, zone), true)
    assert.equal(pointInParkingZone(4.1, 3, zone), false)
  })

  test("basics-calm approach completes at slow speed", () => {
    const scenario = SCENARIOS.find((s) => s.id === "basics-calm")!
    const zones = resolveCheckpoints(scenario)
    const progress = new CheckpointProgress(zones)
    const zone = zones[0]!
    const boat = createBoatState({
      x: zone.position.x,
      y: zone.position.y,
      heading: zone.heading,
      u: 0.45,
      v: 0,
    })

    assert.equal(boatInParkingZone(boat, zone), true)

    let dt = 0.05
    let steps = 0
    while (steps < 500 && progress.snapshot().phase === "approach") {
      progress.tick(dt, boat, 0.5, 0)
      steps++
    }
    assert.ok(steps * dt >= 0.8)
    assert.equal(progress.snapshot().phase, "celebrating")
  })

  test("moving too fast for berth resets hold progress", () => {
    const scenario = SCENARIOS.find((s) => s.id === "basics-calm")!
    const zones = resolveCheckpoints(scenario)
    const finish = zones[1]!
    const progress = new CheckpointProgress([finish])
    const zone = finish
    const boat = createBoatState({
      x: zone.position.x,
      y: zone.position.y,
      heading: zone.heading,
    })

    progress.tick(0.5, boat, 0, 0)
    const built = progress.snapshot().holdProgress
    assert.ok(built > 0.3)

    for (let i = 0; i < 10; i++) {
      progress.tick(0.05, boat, BERTH_HOLD.maxSog * 2, 0)
    }
    assert.ok(progress.snapshot().holdProgress < built - 0.15)
  })
})
