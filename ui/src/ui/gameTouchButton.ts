/**
 * Bind a control for game-style hold/tap without triggering extra browser/OS
 * behaviors (double-tap zoom, context menu, synthetic click, selection).
 * Does not call the Vibration API — we never haptic from JS.
 */
export function bindGameTouchButton(el: HTMLElement): void {
  const swallow = (event: Event) => {
    event.preventDefault()
  }

  el.addEventListener("touchstart", swallow, { passive: false })
  el.addEventListener("contextmenu", swallow)
  el.addEventListener("selectstart", swallow)

  el.addEventListener("click", (event) => {
    // Keep keyboard activation; skip the extra synthetic click after touch.
    if (event.detail === 0) return
    event.preventDefault()
  })
}
