import type { FrameContext, Scene } from "../core/Scene.ts"
import type { Game } from "../core/Game.ts"
import { SimScene } from "./SimScene.ts"
import { SCENARIOS } from "../sim/scenarios.ts"
import type { Scenario } from "../sim/types.ts"
import { getSelectedBoatId } from "../core/settings.ts"
import { boatById } from "../physics/boats/index.ts"
import type { BoatSpec } from "../physics/model/BoatSpec.ts"
import { SettingsOverlay } from "../ui/SettingsOverlay.ts"
import { ScoreboardScene } from "./ScoreboardScene.ts"

const BASICS_SCENARIOS = SCENARIOS.filter((s) => s.id.startsWith("basics-"))
const CHALLENGE_SCENARIOS = SCENARIOS.filter((s) => !s.id.startsWith("basics-"))

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
    this.settings.setOnChange(() => {
      this.refreshBoatPicker()
    })

    const root = document.createElement("div")
    root.className = "menu menu--home"
    root.innerHTML = `
      <header class="menu__header">
        <div class="menu__brand">Nav</div>
        <p class="menu__tagline">Dock under wind and tide.</p>
      </header>

      <div class="menu-home__zones">
        <section class="menu-zone menu-zone--boat" aria-labelledby="menu-zone-boat">
          <h2 class="menu-zone__label" id="menu-zone-boat">Boat</h2>
          <button class="menu-zone__body menu__boat-picker" type="button" data-action="boat" aria-haspopup="dialog">
            <span class="menu__boat-picker-inner" data-field="boat-summary"></span>
          </button>
        </section>

        <section class="menu-zone menu-zone--scores" aria-labelledby="menu-zone-scores">
          <h2 class="menu-zone__label" id="menu-zone-scores">Scoreboard</h2>
          <button class="menu-zone__body menu__scoreboard-entry" type="button" data-action="scoreboard">
            <span class="menu__scoreboard-link">Times &amp; replays →</span>
          </button>
        </section>

        <section class="menu-zone menu-zone--levels" aria-labelledby="menu-zone-levels">
          <h2 class="menu-zone__label" id="menu-zone-levels">Levels</h2>
          <div class="menu-zone__body">
            <div class="menu__section" aria-labelledby="menu-basics-heading">
              <h3 class="menu__section-title" id="menu-basics-heading">Basics</h3>
              <div class="menu-levels">
                ${BASICS_SCENARIOS.map((scenario, index) => renderLevelButton(scenario, index === 0)).join("")}
              </div>
            </div>
            ${
              CHALLENGE_SCENARIOS.length > 0
                ? `
            <div class="menu__section" aria-labelledby="menu-challenge-heading">
              <h3 class="menu__section-title" id="menu-challenge-heading">Challenge</h3>
              <div class="menu-levels">
                ${CHALLENGE_SCENARIOS.map((scenario) => renderLevelButton(scenario, false)).join("")}
              </div>
            </div>`
                : ""
            }
          </div>
        </section>
      </div>

      <nav class="menu__footer" aria-label="Help">
        <button class="menu__footer-link" type="button" data-action="help">Help <kbd>H</kbd></button>
      </nav>
    `

    root.querySelector<HTMLButtonElement>("[data-action='boat']")?.addEventListener("click", () => {
      this.settings?.show()
    })

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

    root.querySelectorAll<HTMLButtonElement>("[data-scenario]").forEach((button) => {
      button.addEventListener("click", () => {
        const scenario = SCENARIOS.find((s) => s.id === button.dataset.scenario)
        if (scenario) this.game.setScene(new SimScene(this.game, scenario))
      })
    })

    this.game.uiRoot.appendChild(root)
    this.root = root
    this.refreshBoatPicker()
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

  draw(ctx: FrameContext): void {
    ctx.ctx.fillStyle = "#0b1c28"
    ctx.ctx.fillRect(0, 0, ctx.width, ctx.height)
  }

  private refreshBoatPicker(): void {
    const el = this.root?.querySelector<HTMLElement>('[data-field="boat-summary"]')
    if (!el) return
    const spec = boatById(getSelectedBoatId())
    el.innerHTML = `
      <span class="menu__boat-name">${escapeHtml(spec.prototype)}</span>
      <span class="menu__boat-meta">${escapeHtml(formatBoatMeta(spec))}</span>
    `
  }
}

function renderLevelButton(scenario: Scenario, primary: boolean): string {
  return `
    <button
      class="menu-level${primary ? " menu-level--primary" : ""}"
      data-scenario="${scenario.id}"
      type="button"
    >
      <span class="menu-level__name">${escapeHtml(scenario.name)}</span>
    </button>
  `
}

function formatBoatMeta(spec: BoatSpec): string {
  const loaFt = (spec.lengthOverall * 3.28084).toFixed(0)
  const kind = spec.kind
  return `${kind} · ${loaFt} ft LOA`
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
