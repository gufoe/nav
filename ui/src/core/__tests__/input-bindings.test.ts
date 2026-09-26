import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

/**
 * Boat-control actions must be handled in Helm.update — UI-only actions are listed separately.
 */
const BOAT_ACTIONS = [
  "throttleUp",
  "throttleDown",
  "throttleNeutral",
  "rudderLeft",
  "rudderRight",
  "rudderCenter",
  "helmAutoCenter",
  "engineToggle",
  "sheetIn",
  "sheetOut",
] as const

const UI_ACTIONS = [
  "pause",
  "menu",
  "confirm",
  "reset",
  "debug",
  "help",
  "simSpeed1",
  "simSpeed2",
  "simSpeed3",
] as const

test("every boat-control action is referenced in Helm", () => {
  const helmPath = join(dirname(fileURLToPath(import.meta.url)), "../../sim/Helm.ts")
  const source = readFileSync(helmPath, "utf8")
  for (const action of BOAT_ACTIONS) {
    assert.match(
      source,
      new RegExp(`"${action}"`),
      `Helm.ts should handle action "${action}"`,
    )
  }
})

test("UI actions are not required in Helm", () => {
  void UI_ACTIONS
  assert.ok(true)
})
