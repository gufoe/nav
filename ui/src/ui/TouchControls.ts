import type { Action, Input } from "../core/Input.ts"
import { clamp } from "../math/MathUtil.ts"
import { bindGameTouchButton } from "./gameTouchButton.ts"
import { shouldShowTouchControls } from "./touchUi.ts"

/** Compact touch helm: hold a control to steer or move the throttle lever. */
export class TouchControls {
  readonly root: HTMLElement
  private readonly onResize = () => this.syncVisible()

  constructor(parent: HTMLElement, input: Input) {
    this.root = document.createElement("section")
    this.root.className = "touch-controls"
    this.root.setAttribute("aria-label", "Touch helm")
    this.root.innerHTML = `
      <div class="touch-controls__dock touch-controls__dock--game">
        <div class="touch-controls__corner touch-controls__corner--helm" aria-label="Steering">
          <button class="touch-control touch-control--fab" type="button" data-hold="rudderLeft" aria-label="Steer port"><span class="touch-control__glyph" aria-hidden="true">◀</span></button>
          <button class="touch-control touch-control--fab" type="button" data-hold="rudderRight" aria-label="Steer starboard"><span class="touch-control__glyph" aria-hidden="true">▶</span></button>
        </div>
        <div class="touch-controls__corner touch-controls__corner--engine" aria-label="Throttle">
          <div class="touch-controls__throttle-meter" aria-hidden="true">
            <div class="touch-controls__throttle-track">
              <div class="touch-controls__throttle-fill" data-touch-throttle-fill></div>
            </div>
          </div>
          <div class="touch-controls__engine-pad">
            <button class="touch-control touch-control--fab" type="button" data-hold="throttleUp" aria-label="Increase throttle"><span class="touch-control__glyph" aria-hidden="true">▲</span></button>
            <button class="touch-control touch-control--fab touch-control--neutral" type="button" data-press="throttleNeutral" aria-label="Throttle to neutral"><span class="touch-control__glyph touch-control__glyph--letter" aria-hidden="true">N</span></button>
            <button class="touch-control touch-control--fab" type="button" data-hold="throttleDown" aria-label="Decrease throttle"><span class="touch-control__glyph" aria-hidden="true">▼</span></button>
          </div>
        </div>
      </div>
    `

    this.root.querySelectorAll<HTMLButtonElement>(".touch-control").forEach((button) => {
      bindGameTouchButton(button)
    })

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
    this.syncVisible()
    this.setThrottle(0)
    window.addEventListener("resize", this.onResize, { passive: true })
    window.addEventListener("orientationchange", this.onResize, { passive: true })
  }

  /** Sync vertical throttle bar (demand from helm). */
  setThrottle(throttle: number): void {
    const v = clamp(throttle, -1, 1)
    const fill = this.root.querySelector<HTMLElement>("[data-touch-throttle-fill]")
    const neutral = this.root.querySelector<HTMLElement>(".touch-control--neutral")
    if (fill) {
      const pct = Math.abs(v) * 50
      fill.style.height = `${pct}%`
      fill.style.width = "100%"
      fill.style.left = "0"
      fill.style.right = "0"
      fill.classList.toggle("touch-controls__throttle-fill--astern", v < -0.005)
      if (v >= 0) {
        fill.style.bottom = "50%"
        fill.style.top = "auto"
      } else {
        fill.style.top = "50%"
        fill.style.bottom = "auto"
      }
    }

    neutral?.classList.toggle("touch-control--at-neutral", Math.abs(v) < 0.005)
    neutral?.classList.toggle("touch-control--ahead", v > 0.005)
    neutral?.classList.toggle("touch-control--astern", v < -0.005)
  }

  private syncVisible(): void {
    this.root.classList.toggle("touch-controls--active", shouldShowTouchControls())
  }

  destroy(): void {
    window.removeEventListener("resize", this.onResize)
    window.removeEventListener("orientationchange", this.onResize)
    this.root.remove()
  }
}
