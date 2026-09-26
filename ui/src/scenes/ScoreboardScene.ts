import type { FrameContext, Scene } from "../core/Scene.ts"
import type { Game } from "../core/Game.ts"
import { SCENARIOS } from "../sim/scenarios.ts"
import { MenuScene } from "./MenuScene.ts"
import { SimScene } from "./SimScene.ts"
import { fetchScore, fetchScores, type ScoreListItem } from "../api/scores.ts"
import { formatRunTimeMs } from "../util/formatTime.ts"
import { formatScoreDate } from "../util/formatScoreDate.ts"
import { ReplayScene } from "./ReplayScene.ts"
import { BOAT_CATALOG } from "../physics/boats/index.ts"
import { getSelectedBoatId, setSelectedBoatId } from "../core/settings.ts"
import { readRememberedPlayerName } from "../recording/playerName.ts"

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
    root.className = "menu menu--scoreboard scoreboard"
    root.innerHTML = `
      <header class="scoreboard__hero">
        <h1 class="scoreboard__hero-title">Scoreboard</h1>
        <p class="scoreboard__hero-tagline">Simulation time, fastest first — open any row for a replay.</p>
      </header>
      <div class="scoreboard__panel scoreboard__panel--focus">
        <div class="scoreboard__filters">
          <label class="scoreboard__filter">
            <span>Level</span>
            <select data-field="level">
              ${SCENARIOS.map(
                (s) =>
                  `<option value="${s.id}"${s.id === this.levelId ? " selected" : ""}>${s.name}</option>`,
              ).join("")}
            </select>
          </label>
          <label class="scoreboard__filter">
            <span>Boat</span>
            <select data-field="boat">
              ${BOAT_CATALOG.map(
                (b) =>
                  `<option value="${b.id}"${b.id === this.boatId ? " selected" : ""}>${b.prototype}</option>`,
              ).join("")}
            </select>
          </label>
          <button class="btn btn--small scoreboard__refresh" type="button" data-action="refresh" title="Reload scores">
            Refresh
          </button>
        </div>
        <p class="scoreboard__status" data-field="status">Loading…</p>
        <div class="scoreboard__table-wrap" data-field="table"></div>
      </div>
      <div class="menu__actions scoreboard__actions">
        <button class="btn btn--primary" type="button" data-action="play">Play this level</button>
        <button class="btn" type="button" data-action="back">Back to menu</button>
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
    root.querySelector<HTMLButtonElement>("[data-action='refresh']")?.addEventListener("click", () => {
      void this.reload()
    })
    root.querySelector<HTMLButtonElement>("[data-action='play']")?.addEventListener("click", () => {
      this.playSelectedLevel()
    })
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

  private selectedScenario() {
    return SCENARIOS.find((s) => s.id === this.levelId)
  }

  private playSelectedLevel(): void {
    const scenario = this.selectedScenario()
    if (!scenario) return
    setSelectedBoatId(this.boatId)
    this.game.setScene(new SimScene(this.game, scenario))
  }

  private async reload(): Promise<void> {
    this.loading = true
    this.error = null
    this.renderTable()
    try {
      this.scores = await fetchScores(this.levelId, this.boatId, 50)
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
      status.textContent = "Loading scores…"
      tableWrap.innerHTML = ""
      return
    }
    if (this.error) {
      status.textContent = this.error
      tableWrap.innerHTML = ""
      return
    }
    if (this.scores.length === 0) {
      status.textContent = ""
      tableWrap.innerHTML = `
        <div class="scoreboard__empty">
          <p>No runs yet — finish the level and save your time.</p>
        </div>
      `
      return
    }

    const leaderMs = this.scores[0]?.timeMs ?? 0
    const remembered = readRememberedPlayerName().toLowerCase()

    status.textContent =
      this.scores.length >= 50 ? "Top 50" : `${this.scores.length} run${this.scores.length === 1 ? "" : "s"}`

    tableWrap.innerHTML = `
      <table class="scoreboard__table">
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Pilot</th>
            <th scope="col">Sim time</th>
            <th scope="col">Gap</th>
            <th scope="col">Date</th>
            <th scope="col"><span class="visually-hidden">Replay</span></th>
          </tr>
        </thead>
        <tbody>
          ${this.scores
            .map((row, index) => {
              const rank = index + 1
              const isYou =
                remembered.length > 0 &&
                row.playerName.trim().toLowerCase() === remembered
              const gap =
                index === 0
                  ? "—"
                  : `+${formatRunTimeMs(row.timeMs - leaderMs)}`
              const rowClass = [
                rank <= 3 ? `scoreboard__row--medal-${rank}` : "",
                isYou ? "scoreboard__row--you" : "",
              ]
                .filter(Boolean)
                .join(" ")
              return `
            <tr class="${rowClass}">
              <td class="scoreboard__rank">${formatRank(rank)}</td>
              <td class="scoreboard__pilot">
                ${escapeHtml(row.playerName)}
                ${isYou ? '<span class="scoreboard__you-badge">you</span>' : ""}
              </td>
              <td class="scoreboard__time">${formatRunTimeMs(row.timeMs)}</td>
              <td class="scoreboard__gap">${gap}</td>
              <td class="scoreboard__date">${formatScoreDate(row.createdAt)}</td>
              <td class="scoreboard__replay">
                <button class="btn btn--small" type="button" data-replay="${row.id}">Watch</button>
              </td>
            </tr>`
            })
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
      this.renderTable()
    }
  }
}

function formatRank(rank: number): string {
  if (rank === 1) return "1st"
  if (rank === 2) return "2nd"
  if (rank === 3) return "3rd"
  return String(rank)
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
