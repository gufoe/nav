/** When true, show on-screen helm and compact mobile HUD (CSS `.touch-ui`). */
export function prefersTouchHelm(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return true
  if (window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches) return true
  if (navigator.maxTouchPoints > 0 && window.innerWidth <= 900) return true
  return false
}

/** On-screen Port/Starboard/Ahead controls (also when portrait CSS alone would miss `pointer: fine`). */
export function shouldShowTouchControls(): boolean {
  return prefersTouchHelm()
}

export function syncTouchUiClass(root: HTMLElement = document.documentElement): void {
  root.classList.toggle("touch-ui", prefersTouchHelm())
}

export function installTouchUiClass(): void {
  syncTouchUiClass()
  window.addEventListener("resize", () => syncTouchUiClass(), { passive: true })
  for (const query of [
    "(hover: none) and (pointer: coarse)",
    "(max-width: 900px) and (orientation: portrait)",
  ]) {
    window.matchMedia(query).addEventListener("change", () => syncTouchUiClass())
  }
}
