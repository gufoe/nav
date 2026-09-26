import { getSelectedBoatId, setSelectedBoatId } from "../core/settings.ts"
import { BOAT_CATALOG } from "../physics/boats/index.ts"
import type { BoatSpec } from "../physics/model/BoatSpec.ts"

function formatBoatMeta(spec: BoatSpec): string {
  const loaFt = (spec.lengthOverall * 3.28084).toFixed(0)
  const disp = spec.mass >= 1000 ? `${(spec.mass / 1000).toFixed(1)} t` : `${spec.mass} kg`
  return `${spec.prototype} · ${loaFt} ft LOA · ${disp}`
}

function boatOptionsHtml(selectedId: string): string {
  return BOAT_CATALOG.map(
    (spec) => `
        <label class="settings-boat${spec.id === selectedId ? " settings-boat--selected" : ""}">
          <input
            class="settings-boat__input"
            type="radio"
            name="nav-boat"
            value="${spec.id}"
            ${spec.id === selectedId ? "checked" : ""}
          />
          <span class="settings-boat__card">
            <span class="settings-boat__kind">${spec.kind}</span>
            <span class="settings-boat__name">${spec.name}</span>
            <span class="settings-boat__meta">${formatBoatMeta(spec)}</span>
          </span>
        </label>
      `,
  ).join("")
}

/** Modal for persisted game settings (boat choice). */
export class SettingsOverlay {
  private readonly root: HTMLElement
  private open = false
  private onChange: (() => void) | null = null

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div")
    this.root.className = "settings-overlay hidden"
    this.root.setAttribute("role", "dialog")
    this.root.setAttribute("aria-modal", "true")
    this.root.setAttribute("aria-labelledby", "settings-title")
    this.root.innerHTML = `
      <div class="settings-overlay__backdrop" data-action="close"></div>
      <div class="settings-overlay__panel">
        <header class="settings-overlay__header">
          <h2 class="settings-overlay__title" id="settings-title">Boat</h2>
          <button class="settings-overlay__close btn" type="button" data-action="close" aria-label="Close">
            Done
          </button>
        </header>
        <section class="settings-section">
          <p class="settings-section__hint">Physics is approximate; real boats vary with load and trim.</p>
          <div class="settings-boats" data-field="boats">
            ${boatOptionsHtml(getSelectedBoatId())}
          </div>
        </section>
      </div>
    `

    this.root.querySelectorAll<HTMLElement>("[data-action='close']").forEach((el) => {
      el.addEventListener("click", () => this.close())
    })

    this.wireBoatInputs()

    parent.appendChild(this.root)
  }

  private wireBoatInputs(): void {
    const host = this.root.querySelector<HTMLElement>('[data-field="boats"]')
    if (!host) return
    host.querySelectorAll<HTMLInputElement>(".settings-boat__input").forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return
        setSelectedBoatId(input.value)
        this.syncSelection(input.value)
        this.onChange?.()
      })
    })
  }

  private syncSelection(boatId: string): void {
    const host = this.root.querySelector<HTMLElement>('[data-field="boats"]')
    if (!host) return
    host.querySelectorAll<HTMLElement>(".settings-boat").forEach((label) => {
      const input = label.querySelector<HTMLInputElement>(".settings-boat__input")
      label.classList.toggle("settings-boat--selected", input?.value === boatId)
    })
  }

  setOnChange(handler: (() => void) | null): void {
    this.onChange = handler
  }

  isOpen(): boolean {
    return this.open
  }

  show(): void {
    const selected = getSelectedBoatId()
    const host = this.root.querySelector<HTMLElement>('[data-field="boats"]')
    if (host) {
      host.innerHTML = boatOptionsHtml(selected)
      this.wireBoatInputs()
    }
    this.open = true
    this.root.classList.remove("hidden")
  }

  close(): void {
    this.open = false
    this.root.classList.add("hidden")
  }

  toggle(): void {
    if (this.open) this.close()
    else this.show()
  }

  destroy(): void {
    this.root.remove()
  }
}
