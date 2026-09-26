import type { FrameContext, Scene } from "../core/Scene.ts"
import type { Game } from "../core/Game.ts"
import { SCENARIOS } from "../sim/scenarios.ts"
import { MenuScene } from "./MenuScene.ts"
import { fetchScore, fetchScores, type ScoreListItem } from "../api/scores.ts"
import { formatRunTimeMs } from "../util/formatTime.ts"
import { ReplayScene } from "./ReplayScene.ts"
import { BOAT_CATALOG } from "../physics/boats/index.ts"
import { getSelectedBoatId } from "../core/settings.ts"

export interface ScoreboardOptions {
  levelId?: string
  boatId?: string
}

export class ScoreboardScene implements Scene {
  readonly id = "scoreboard"

  private readonly game: Game
  private root: HTMLElement | null = null
  private levelId: string
  private boatId: string
  private scores: ScoreListItem[] = []
  private loading = false
  private error: string | null = null

  constructor(game: Game, options: ScoreboardOptions = {}) {
    this.game = game
    this.levelId = options.levelId ?? SCENARIOS[0]?.id ?? "basics-calm"
    this.boatId = options.boatId ?? getSelectedBoatId()
  }

  enter(ctx: FrameContext): void {
    void ctx
    const root = document.createElement("div")
    root.className = "menu scoreboard"
    root.innerHTML = `
      <div class="menu__brand">Scoreboard</div>
      <p class="menu__tagline">Fastest runs for each level and boat model.</p>
      <div class="scoreboard__filters">
        <label class="scoreboard__level">
          <span>Level</span>
          <select data-field="level">
            ${SCENARIOS.map(
              (s) =>
                `<option value="${s.id}"${s.id === this.levelId ? " selected" : ""}>${s.name}</option>`,
            ).join("")}
          </select>
        </label>
        <label class="scoreboard__level">
          <span>Boat</span>
          <select data-field="boat">
            ${BOAT_CATALOG.map(
              (b) =>
                `<option value="${b.id}"${b.id === this.boatId ? " selected" : ""}>${b.prototype}</option>`,
            ).join("")}
          </select>
        </label>
      </div>
      <p class="scoreboard__status" data-field="status">Loading…</p>
      <div class="scoreboard__table-wrap" data-field="table"></div>
      <div class="menu__actions">
        <button class="btn btn--primary" type="button" data-action="back">Back to menu</button>
      </div>
    `

    root.querySelector<HTMLSelectElement>("[data-field='level']")?.addEventListener(
      "change",
      (ev) => {
        this.levelId = (ev.target as HTMLSelectElement).value
        void this.reload()
      },
    )
    root.querySelector<HTMLSelectElement>("[data-field='boat']")?.addEventListener(
      "change",
      (ev) => {
        this.boatId = (ev.target as HTMLSelectElement).value
        void this.reload()
      },
    )
    root.querySelector<HTMLButtonElement>("[data-action='back']")?.addEventListener("click", () => {
      this.game.setScene(new MenuScene(this.game))
    })

    this.game.uiRoot.appendChild(root)
    this.root = root
    void this.reload()
  }

  exit(): void {
    this.root?.remove()
    this.root = null
  }

  update(ctx: FrameContext): void {
    if (ctx.input.wasActionPressed("menu")) {
      this.game.setScene(new MenuScene(this.game))
    }
  }

  draw(ctx: FrameContext): void {
    ctx.ctx.fillStyle = "#0b1c28"
    ctx.ctx.fillRect(0, 0, ctx.width, ctx.height)
  }

  private scoreboardOptions(): ScoreboardOptions {
    return { levelId: this.levelId, boatId: this.boatId }
  }

  private async reload(): Promise<void> {
    this.loading = true
    this.error = null
    this.renderTable()
    try {
      this.scores = await fetchScores(this.levelId, this.boatId)
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Could not load scores"
      this.scores = []
    } finally {
      this.loading = false
      this.renderTable()
    }
  }

  private renderTable(): void {
    const status = this.root?.querySelector<HTMLElement>('[data-field="status"]')
    const tableWrap = this.root?.querySelector<HTMLElement>('[data-field="table"]')
    if (!status || !tableWrap) return

    if (this.loading) {
      status.textContent = "Loading…"
      tableWrap.innerHTML = ""
      return
    }
    if (this.error) {
      status.textContent = this.error
      tableWrap.innerHTML = ""
      return
    }
    if (this.scores.length === 0) {
      status.textContent = "No scores yet for this level and boat — be the first."
      tableWrap.innerHTML = ""
      return
    }
    status.textContent = `Top ${this.scores.length} runs`
    tableWrap.innerHTML = `
      <table class="scoreboard__table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Sim time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.scores
            .map(
              (row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(row.playerName)}</td>
              <td>${formatRunTimeMs(row.timeMs)}</td>
              <td><button class="btn btn--small" type="button" data-replay="${row.id}">Watch</button></td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `
    tableWrap.querySelectorAll<HTMLButtonElement>("[data-replay]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.replay)
        if (Number.isInteger(id)) void this.openReplay(id)
      })
    })
  }

  private async openReplay(id: number): Promise<void> {
    const status = this.root?.querySelector<HTMLElement>('[data-field="status"]')
    if (status) status.textContent = "Loading replay…"
    const opts = this.scoreboardOptions()
    try {
      const detail = await fetchScore(id)
      this.game.setScene(
        new ReplayScene(this.game, detail.replay, {
          title: `${detail.playerName} · ${formatRunTimeMs(detail.timeMs)}`,
          onBack: () => {
            this.game.setScene(new ScoreboardScene(this.game, opts))
          },
        }),
      )
    } catch (err) {
      if (status) {
        status.textContent =
          err instanceof Error ? err.message : "Could not load replay"
      }
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
