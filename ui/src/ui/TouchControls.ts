import type { Action, Input } from "../core/Input.ts"

/** Compact touch helm: hold a control to steer or move the throttle lever. */
export class TouchControls {
  readonly root: HTMLElement

  constructor(parent: HTMLElement, input: Input) {
    this.root = document.createElement("section")
    this.root.className = "touch-controls"
    this.root.setAttribute("aria-label", "Touch helm")
    this.root.innerHTML = `
      <div class="touch-controls__cluster touch-controls__cluster--helm" aria-label="Steering">
        <button class="touch-control touch-control--hold" type="button" data-hold="rudderLeft" aria-label="Steer port">Port</button>
        <button class="touch-control touch-control--hold" type="button" data-hold="rudderRight" aria-label="Steer starboard">Starboard</button>
      </div>
      <div class="touch-controls__cluster touch-controls__cluster--throttle" aria-label="Throttle">
        <button class="touch-control touch-control--hold" type="button" data-hold="throttleUp" aria-label="Increase throttle">Ahead</button>
        <button class="touch-control touch-control--neutral" type="button" data-press="throttleNeutral">Neutral</button>
        <button class="touch-control touch-control--hold" type="button" data-hold="throttleDown" aria-label="Decrease throttle">Astern</button>
      </div>
      <button class="touch-control touch-control--pause" type="button" data-press="pause" aria-label="Pause simulation">II</button>
    `

    this.root.querySelectorAll<HTMLButtonElement>("[data-hold]").forEach((button) => {
      const action = button.dataset.hold as Action
      const release = (event: PointerEvent) => {
        input.releaseAction(action)
        if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId)
      }
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault()
        button.setPointerCapture(event.pointerId)
        input.pressAction(action)
      })
      button.addEventListener("pointerup", release)
      button.addEventListener("pointercancel", release)
      button.addEventListener("lostpointercapture", () => input.releaseAction(action))
    })

    this.root.querySelectorAll<HTMLButtonElement>("[data-press]").forEach((button) => {
      const action = button.dataset.press as Action
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault()
        input.pressAction(action)
        input.releaseAction(action)
      })
    })

    parent.appendChild(this.root)
  }

  destroy(): void {
    this.root.remove()
  }
}
