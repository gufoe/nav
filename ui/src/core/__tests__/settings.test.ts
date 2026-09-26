import assert from "node:assert/strict"
import { describe, it, beforeEach, afterEach } from "node:test"
import {
  getSelectedBoatId,
  loadSettings,
  resetSettingsCache,
  saveSettings,
  setSelectedBoatId,
} from "../settings.ts"
import { DEFAULT_BOAT_ID } from "../../physics/boats/index.ts"

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.get(key) ?? null
    },
    key(index: number) {
      return [...map.keys()][index] ?? null
    },
    removeItem(key: string) {
      map.delete(key)
    },
    setItem(key: string, value: string) {
      map.set(key, value)
    },
  }
}

describe("settings", () => {
  const key = "nav.settings.v1"
  let previousStorage: Storage | undefined

  beforeEach(() => {
    previousStorage =
      "localStorage" in globalThis ? globalThis.localStorage : undefined
    globalThis.localStorage = memoryStorage()
    resetSettingsCache()
    globalThis.localStorage.removeItem(key)
  })

  afterEach(() => {
    resetSettingsCache()
    if (previousStorage) globalThis.localStorage = previousStorage
    else delete (globalThis as { localStorage?: Storage }).localStorage
  })

  it("defaults to the Sun Odyssey 36i", () => {
    assert.equal(getSelectedBoatId(), DEFAULT_BOAT_ID)
    assert.equal(DEFAULT_BOAT_ID, "sun-odyssey-36i")
  })

  it("persists boat selection", () => {
    setSelectedBoatId("j70")
    resetSettingsCache()
    assert.equal(loadSettings().boatId, "j70")
    assert.equal(getSelectedBoatId(), "j70")
  })

  it("migrates legacy coastal-36 id", () => {
    saveSettings({ boatId: "coastal-36" })
    resetSettingsCache()
    assert.equal(getSelectedBoatId(), "sun-odyssey-36i")
  })

  it("falls back on unknown boat id", () => {
    saveSettings({ boatId: "not-a-boat" })
    resetSettingsCache()
    assert.equal(getSelectedBoatId(), DEFAULT_BOAT_ID)
  })
})
