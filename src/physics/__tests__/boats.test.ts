import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOAT_CATALOG,
  boatById,
  normalizeBoatId,
} from "../boats/index.ts"

describe("boat catalog", () => {
  it("lists distinct famous prototypes including a full-keel cruiser", () => {
    assert.equal(BOAT_CATALOG.length, 4)
    const ids = new Set(BOAT_CATALOG.map((b) => b.id))
    assert.equal(ids.size, 4)
    for (const spec of BOAT_CATALOG) {
      assert.ok(spec.prototype.length > 0)
      assert.ok(spec.kind.length > 0)
      assert.ok(spec.mass > 0)
      assert.ok(spec.lengthOverall > 0)
    }
  })

  it("resolves legacy coastal-36", () => {
    assert.equal(normalizeBoatId("coastal-36"), "sun-odyssey-36i")
    assert.equal(boatById("coastal-36").name, "Sun Odyssey 36i")
  })

  it("returns J/70, Oceanis, and Hallberg-Rassy specs", () => {
    assert.equal(boatById("j70").prototype, "J/Boats J/70")
    assert.equal(boatById("beneteau-oceanis-40").prototype, "Beneteau Oceanis 40.1")
    assert.equal(boatById("hallberg-rassy-340").kind, "Full-keel cruiser")
    assert.ok(boatById("hallberg-rassy-340").mass > boatById("sun-odyssey-36i").mass)
  })
})
