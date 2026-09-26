import { describe, test } from "node:test"
import assert from "node:assert/strict"

import { degToRad } from "../../math/MathUtil.ts"
import { boatHeadingDisplayDeg, worldDirectionToRoseDeg } from "../compassRose.ts"

describe("compassRose", () => {
  test("world north points up on the rose", () => {
    assert.ok(Math.abs(worldDirectionToRoseDeg(degToRad(90))) < 1e-9)
  })

  test("world east rotates rose 90° from north-up", () => {
    assert.ok(Math.abs(worldDirectionToRoseDeg(0) - 90) < 1e-9)
  })

  test("matches SimScene setArrow formula", () => {
    const world = degToRad(35)
    assert.ok(Math.abs(worldDirectionToRoseDeg(world) - (90 - (35))) < 1e-9)
  })

  test("boat HUD matches rose (0=north, 90=east, 180=south)", () => {
    assert.equal(boatHeadingDisplayDeg(degToRad(90)), 0)
    assert.equal(boatHeadingDisplayDeg(degToRad(0)), 90)
    assert.equal(boatHeadingDisplayDeg(degToRad(-90)), 180)
  })

  test("starboard turn increases displayed heading", () => {
    const north = degToRad(90)
    const starboard = degToRad(75)
    assert.ok(boatHeadingDisplayDeg(starboard) > boatHeadingDisplayDeg(north))
  })
})
