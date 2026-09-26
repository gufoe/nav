import type { FrameContext, Scene } from "../core/Scene.ts"
import type { Game } from "../core/Game.ts"
import { SimScene } from "./SimScene.ts"
import { SCENARIOS } from "../sim/scenarios.ts"
import { getSelectedBoatId } from "../core/settings.ts"
import { boatById } from "../physics/boats/index.ts"
import { SettingsOverlay } from "../ui/SettingsOverlay.ts"
import { ScoreboardScene } from "./ScoreboardScene.ts"

export class MenuScene implements Scene {
  readonly id = "menu"

  private readonly game: Game
  private root: HTMLElement | null = null
  private settings: SettingsOverlay | null = null

  constructor(game: Game) {
    this.game = game
  }

  enter(ctx: FrameContext): void {
    void ctx
    const overlayRoot = this.game.uiRoot.parentElement ?? document.body
    this.settings = new SettingsOverlay(overlayRoot)
    this.settings.setOnChange(() => this.refreshBoatSummary())

    const root = document.createElement("div")
    root.className = "menu"
    root.innerHTML = `
      <div class="menu__brand">Nav</div>
      <p class="menu__tagline">
        Practice sailboat docking under wind, current and prop walk.
        Every boat here is driven by a force-based 3-DOF model.
      </p>
      <p class="menu__boat" data-field="boat-summary"></p>
      <div class="menu__actions">
        ${SCENARIOS.map(
          (scenario, index) => `
            <button
              class="btn ${index === 0 ? "btn--primary" : ""}"
              data-scenario="${scenario.id}"
              title="${scenario.description}"
              type="button"
            >${scenario.name}</button>
          `,
        ).join("")}
        <button class="btn" data-action="scoreboard" type="button">
          Scoreboard
        </button>
        <button class="btn" data-action="settings" type="button">
          Settings
        </button>
        <button class="btn" data-action="help" type="button">
          Controls &amp; hotkeys (H)
        </button>
      </div>
    `

    root.querySelector<HTMLButtonElement>("[data-action='help']")?.addEventListener("click", () => {
      this.game.toggleHelp()
    })

    root.querySelector<HTMLButtonElement>("[data-action='scoreboard']")?.addEventListener(
      "click",
      () => {
        this.game.setScene(
          new ScoreboardScene(this.game, { boatId: getSelectedBoatId() }),
        )
      },
    )

    root.querySelector<HTMLButtonElement>("[data-action='settings']")?.addEventListener("click", () => {
      this.settings?.show()
    })

    root.querySelectorAll<HTMLButtonElement>("[data-scenario]").forEach((button) => {
      button.addEventListener("click", () => {
        const scenario = SCENARIOS.find((s) => s.id === button.dataset.scenario)
        if (scenario) this.game.setScene(new SimScene(this.game, scenario))
      })
    })

    this.game.uiRoot.appendChild(root)
    this.root = root
    this.refreshBoatSummary()
  }

  exit(): void {
    this.settings?.destroy()
    this.settings = null
    this.root?.remove()
    this.root = null
  }

  update(ctx: FrameContext): void {
    if (this.game.isHelpOpen()) return
    if (this.settings?.isOpen() && ctx.input.wasActionPressed("menu")) {
      this.settings.close()
      ctx.input.consumeAction("menu")
    }
  }

  private refreshBoatSummary(): void {
    const el = this.root?.querySelector<HTMLElement>('[data-field="boat-summary"]')
    if (!el) return
    const spec = boatById(getSelectedBoatId())
    el.textContent = `Boat: ${spec.prototype} (${spec.kind})`
  }

  draw(ctx: FrameContext): void {
    // Soft backdrop; menu UI sits on top via #ui.
    ctx.ctx.fillStyle = "#0b1c28"
    ctx.ctx.fillRect(0, 0, ctx.width, ctx.height)
  }
}
