/** Key codes we care about for docking practice. Extend as needed. */
export type Action =
  | "throttleUp"
  | "throttleDown"
  | "throttleNeutral"
  | "rudderLeft"
  | "rudderRight"
  | "rudderCenter"
  | "helmAutoCenter"
  | "engineToggle"
  | "sheetIn"
  | "sheetOut"
  | "pause"
  | "menu"
  | "confirm"
  | "reset"
  | "debug"
  | "help"
  | "simSpeed1"
  | "simSpeed2"
  | "simSpeed3"

/** Human-readable rows for the in-app help overlay (derived from BINDINGS). */
export type HelpEntry = { keys: string; description: string }

const KEY_LABELS: Record<string, string> = {
  KeyW: "W",
  KeyS: "S",
  KeyX: "X",
  KeyA: "A",
  KeyD: "D",
  KeyQ: "Q",
  KeyE: "E",
  KeyP: "P",
  KeyR: "R",
  KeyC: "C",
  KeyF: "F",
  KeyH: "H",
  KeyK: "K",
  KeyM: "M",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Space: "Space",
  Escape: "Esc",
  Enter: "Enter",
  F1: "F1",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
}

/** Display label for a bound key code (tests / tooling). */
export function keyLabel(code: string): string {
  return KEY_LABELS[code] ?? code
}

const BINDINGS: Record<Action, readonly string[]> = {
  throttleUp: ["KeyW", "ArrowUp"],
  throttleDown: ["KeyS", "ArrowDown"],
  throttleNeutral: ["KeyX"],
  rudderLeft: ["KeyA", "ArrowLeft"],
  rudderRight: ["KeyD", "ArrowRight"],
  rudderCenter: ["KeyC"],
  helmAutoCenter: ["KeyK"],
  engineToggle: ["KeyM"],
  sheetIn: ["KeyQ"],
  sheetOut: ["KeyE"],
  pause: ["KeyP", "Space"],
  menu: ["Escape"],
  confirm: ["Enter"],
  reset: ["KeyR"],
  debug: ["KeyF"],
  help: ["KeyH", "F1"],
  simSpeed1: ["Digit1", "Numpad1"],
  simSpeed2: ["Digit2", "Numpad2"],
  simSpeed3: ["Digit3", "Numpad3"],
}

/** Descriptions only — key labels come from BINDINGS. */
const HELP_SPEC = [
  { action: "throttleUp", description: "Throttle ahead (lever stays put)" },
  { action: "throttleDown", description: "Throttle astern" },
  { action: "throttleNeutral", description: "Neutral throttle" },
  { action: "rudderLeft", description: "Helm to port" },
  { action: "rudderRight", description: "Helm to starboard" },
  { action: "rudderCenter", description: "Helm to midships (demand)" },
  { action: "helmAutoCenter", description: "Toggle auto-center helm when keys released" },
  { action: "engineToggle", description: "Toggle engine engaged (throttle lever unchanged)" },
  {
    actions: ["sheetIn", "sheetOut"] as const,
    description: "Sheet in / ease (sail-equipped boats)",
  },
  { action: "pause", description: "Pause simulation" },
  { action: "reset", description: "Reset boat and helm to scenario start" },
  { action: "debug", description: "Toggle instrumentation overlay (forces & state)" },
  {
    actions: ["simSpeed1", "simSpeed2", "simSpeed3"] as const,
    description: "Simulation speed (1× / 2× / 3×)",
  },
  { action: "menu", description: "Return to scenario menu" },
  { action: "help", description: "Show or hide this help" },
] as const

function formatBindingCodes(codes: readonly string[]): string {
  return codes.map(keyLabel).join(" / ")
}

function helpKeysForSpec(
  entry: (typeof HELP_SPEC)[number],
): string {
  if ("actions" in entry) {
    return entry.actions.map((action) => keyLabel(BINDINGS[action][0]!)).join(" / ")
  }
  if (entry.action === "help") {
    return `${formatBindingCodes(BINDINGS.help)} / ?`
  }
  return formatBindingCodes(BINDINGS[entry.action])
}

export const HELP_ENTRIES: readonly HelpEntry[] = HELP_SPEC.map((entry) => ({
  keys: helpKeysForSpec(entry),
  description: entry.description,
}))

/** Key codes per action (for tests and tooling). */
export const ACTION_BINDINGS: Record<Action, readonly string[]> = BINDINGS

const QUESTION_MARK_CODE = "__question__"

/**
 * Keyboard / pointer input snapshot.
 * Call `endFrame()` once per frame, after scenes have read the edges.
 */
export class Input {
  private readonly down = new Set<string>()
  private readonly pressed = new Set<string>()
  private readonly released = new Set<string>()

  private attached = false

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return
    const code = e.key === "?" ? QUESTION_MARK_CODE : e.code
    if (!this.down.has(code)) {
      this.down.add(code)
      this.pressed.add(code)
    }
    // Prevent arrow keys from scrolling the page.
    if (e.code.startsWith("Arrow") || e.code === "Space") {
      e.preventDefault()
    }
    if (e.key === "?" || e.code === "F1") {
      e.preventDefault()
    }
  }

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const code = e.key === "?" ? QUESTION_MARK_CODE : e.code
    if (this.down.has(code)) {
      this.down.delete(code)
      this.released.add(code)
    }
  }

  private readonly onBlur = (): void => {
    this.down.clear()
  }

  attach(target: Window = window): void {
    if (this.attached) return
    target.addEventListener("keydown", this.onKeyDown)
    target.addEventListener("keyup", this.onKeyUp)
    target.addEventListener("blur", this.onBlur)
    this.attached = true
  }

  detach(target: Window = window): void {
    if (!this.attached) return
    target.removeEventListener("keydown", this.onKeyDown)
    target.removeEventListener("keyup", this.onKeyUp)
    target.removeEventListener("blur", this.onBlur)
    this.attached = false
    this.down.clear()
    this.pressed.clear()
    this.released.clear()
  }

  /**
   * Clear per-frame edge state. Call at the *end* of a frame: key events
   * arrive between frames, so clearing first would drop every press.
   */
  endFrame(): void {
    this.pressed.clear()
    this.released.clear()
  }

  isDown(code: string): boolean {
    return this.down.has(code)
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code)
  }

  wasReleased(code: string): boolean {
    return this.released.has(code)
  }

  isActionDown(action: Action): boolean {
    return BINDINGS[action].some((code) => this.down.has(code))
  }

  wasActionPressed(action: Action): boolean {
    if (action === "help" && this.pressed.has(QUESTION_MARK_CODE)) return true
    return BINDINGS[action].some((code) => this.pressed.has(code))
  }

  /** Drop edge-triggered state so a global overlay can swallow a binding. */
  consumeAction(action: Action): void {
    for (const code of BINDINGS[action]) {
      this.pressed.delete(code)
    }
    if (action === "help") this.pressed.delete(QUESTION_MARK_CODE)
  }
}

/** Human-readable keys for one action (matches help overlay). */
export function formatActionKeys(action: Action): string {
  if (action === "help") return `${formatBindingCodes(BINDINGS.help)} / ?`
  return formatBindingCodes(BINDINGS[action])
}

/** Actions bound in-game but omitted from the help panel. */
export const HELP_OMITTED_ACTIONS: readonly Action[] = ["confirm"]
