import { test } from "node:test"
import assert from "node:assert/strict"

import {
  ACTION_BINDINGS,
  formatActionKeys,
  HELP_ENTRIES,
  HELP_OMITTED_ACTIONS,
  keyLabel,
  type Action,
} from "../Input.ts"

test("help lists every bound action except omitted ones", () => {
  const helpText = HELP_ENTRIES.map((row) => row.keys).join(" ")
  for (const [action, codes] of Object.entries(ACTION_BINDINGS) as [
    Action,
    readonly string[],
  ][]) {
    if (HELP_OMITTED_ACTIONS.includes(action)) continue
    for (const code of codes) {
      const label = keyLabel(code)
      assert.ok(
        helpText.includes(label),
        `help overlay should mention ${label} (${action} / ${code})`,
      )
    }
  }
  assert.ok(helpText.includes("?"), "help should mention ? for the help toggle")
})

test("formatActionKeys matches single-action help rows", () => {
  for (const row of HELP_ENTRIES) {
    if (row.keys.endsWith(" / ?")) {
      assert.equal(formatActionKeys("help"), row.keys)
      continue
    }
    if (row.keys === "Q / E") {
      assert.equal(formatActionKeys("sheetIn"), "Q")
      assert.equal(formatActionKeys("sheetOut"), "E")
      continue
    }
    if (row.description.includes("Simulation speed")) {
      assert.equal(row.keys, "1 / 2 / 3")
      continue
    }
    const matching = (Object.keys(ACTION_BINDINGS) as Action[]).filter(
      (action) => formatActionKeys(action) === row.keys,
    )
    assert.ok(matching.length >= 1, `no action produces help keys "${row.keys}"`)
  }
})
