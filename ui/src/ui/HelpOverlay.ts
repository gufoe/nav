import type { Input } from "../core/Input.ts"
import { HELP_ENTRIES } from "../core/Input.ts"

/** Modal listing controls; toggled from the game loop so it works in every scene. */
export class HelpOverlay {
  private readonly root: HTMLElement
  private open = false

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div")
    this.root.className = "help-overlay hidden"
    this.root.setAttribute("role", "dialog")
    this.root.setAttribute("aria-modal", "true")
    this.root.setAttribute("aria-labelledby", "help-title")
    this.root.innerHTML = `
      <div class="help-overlay__backdrop" data-action="close"></div>
      <div class="help-overlay__panel">
        <header class="help-overlay__header">
          <div>
            <p class="help-overlay__eyebrow">Docking reference</p>
            <h2 class="help-overlay__title" id="help-title">Controls</h2>
          </div>
          <button class="help-overlay__close btn" type="button" data-action="close" aria-label="Close help">
            Esc
          </button>
        </header>
        <p class="help-overlay__intro">Use the paired keys below, or the on-screen helm on touch devices. Hold steering and throttle controls; the throttle lever stays where you leave it.</p>
        <dl class="help-overlay__list">
          ${HELP_ENTRIES.map(
            ({ keys, description }) => `
              <div class="help-overlay__row">
                <dt class="help-overlay__keys">${keys.split(" / ").map((key) => `<kbd>${key}</kbd>`).join("<span aria-hidden=\"true\">or</span>")}</dt>
                <dd class="help-overlay__desc">${description}</dd>
              </div>
            `,
          ).join("")}
        </dl>
        <p class="help-overlay__footer">
          Keyboard: <kbd>H</kbd>, <kbd>?</kbd>, or <kbd>F1</kbd>. Touch: use this Help button anytime.
        </p>
      </div>
    `

    this.root.querySelectorAll<HTMLElement>("[data-action='close']").forEach((el) => {
      el.addEventListener("click", () => this.close())
    })

    parent.appendChild(this.root)
  }

  isOpen(): boolean {
    return this.open
  }

  /** Returns true when sim/menu should ignore the same-frame input (e.g. Esc closed help). */
  handleInput(input: Input): boolean {
    if (input.wasActionPressed("help")) {
      this.toggle()
      return true
    }

    if (this.open && input.wasActionPressed("menu")) {
      this.close()
      input.consumeAction("menu")
      return true
    }

    return this.open
  }

  toggle(): void {
    if (this.open) this.close()
    else this.show()
  }

  show(): void {
    this.open = true
    this.root.classList.remove("hidden")
  }

  close(): void {
    this.open = false
    this.root.classList.add("hidden")
  }

  destroy(): void {
    this.root.remove()
  }
}
