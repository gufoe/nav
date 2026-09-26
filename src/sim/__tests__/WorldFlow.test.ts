import { test } from "node:test"
import assert from "node:assert/strict"

import { degToRad } from "../../math/MathUtil.ts"
import { trueWindVelocityWorld } from "../../physics/fluids/ApparentWind.ts"
import { currentVelocityWorld } from "../../physics/fluids/Current.ts"
import { createMildEnvironment } from "../types.ts"
import {
  windFlowFrom,
  currentFlowFrom,
  flowUnit,
  wavePropagationFlow,
} from "../WorldFlow.ts"

test("wind flow matches physics true-wind velocity", () => {
  const env = {
    windSpeed: 10,
    windDirection: degToRad(90),
    currentSpeed: 0,
    currentDirection: 0,
  }
  const flow = windFlowFrom(env)!
  const tw = trueWindVelocityWorld(env)
  assert.ok(flow)
  assert.ok(Math.abs(flow.vx - tw.x) < 1e-12)
  assert.ok(Math.abs(flow.vy - tw.y) < 1e-12)
  assert.ok(Math.abs(flow.speed - env.windSpeed) < 1e-12)
  assert.ok(Math.abs(flow.fromHeading - env.windDirection) < 1e-12)

  const { ux, uy } = flowUnit(flow)
  assert.ok(Math.abs(ux * flow.vx + uy * flow.vy - flow.speed) < 1e-9)
})

test("current flow matches physics current velocity", () => {
  const env = {
    windSpeed: 0,
    windDirection: 0,
    currentSpeed: 1.2,
    currentDirection: degToRad(45),
  }
  const flow = currentFlowFrom(env)!
  const cv = currentVelocityWorld(env)
  assert.ok(Math.abs(flow.vx - cv.x) < 1e-12)
  assert.ok(Math.abs(flow.vy - cv.y) < 1e-12)
  assert.ok(Math.abs(flow.headingTo - env.currentDirection) < 1e-12)
})

test("calm wind returns null", () => {
  assert.equal(windFlowFrom({ windSpeed: 0.1, windDirection: 0, currentSpeed: 0, currentDirection: 0 }), null)
})

test("wave propagation matches scenario TO heading", () => {
  const env = createMildEnvironment()
  const flow = wavePropagationFlow(env)!
  const ux = Math.cos(env.waveDirection)
  const uy = Math.sin(env.waveDirection)
  assert.ok(Math.abs(flow.vx / flow.speed - ux) < 1e-9)
  assert.ok(Math.abs(flow.vy / flow.speed - uy) < 1e-9)
  assert.ok(flow.speed > 0)
})
