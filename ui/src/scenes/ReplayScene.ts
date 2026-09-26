import type { FrameContext, Scene } from "../core/Scene.ts"
import type { Game } from "../core/Game.ts"
import { controlsFromFrame, type ReplayPayload } from "../../../shared/replay.ts"
import { SCENARIOS } from "../sim/scenarios.ts"
import { CanvasRenderer } from "../render/CanvasRenderer.ts"
import { DockCamera } from "../render/DockCamera.ts"
import { EnvironmentViz } from "../render/EnvironmentViz.ts"
import { BoatDynamics, type ForceBreakdown } from "../physics/BoatDynamics.ts"
import { boatById } from "../physics/boats/index.ts"
import {
  cloneBoatState,
  type BoatState,
} from "../physics/model/BoatState.ts"
import { environmentFromScenario } from "../physics/model/Environment.ts"
import { createControls } from "../physics/model/Controls.ts"
import { currentVelocityWorld } from "../physics/fluids/Current.ts"
import { WakeTrail } from "../sim/WakeTrail.ts"
import { resolveCheckpoints } from "../sim/checkpoints.ts"
import { MenuScene } from "./MenuScene.ts"
import { formatRunTimeMs } from "../util/formatTime.ts"

const WAKE_MAX_AGE_S = 90

export interface ReplaySceneOptions {
  title?: string
  onBack?: () => void
}

/** Deterministic playback by re-running physics with recorded controls. */
export class ReplayScene implements Scene {
  readonly id = "replay"

  private readonly game: Game
  private readonly replay: ReplayPayload
  private readonly options: ReplaySceneOptions
  private readonly scenario
  private readonly boatSpec
  private readonly dynamics: BoatDynamics
  private readonly dockCamera = new DockCamera()
  private readonly wake = new WakeTrail(500, 0.75, WAKE_MAX_AGE_S)
  private readonly checkpoints

  private renderer: CanvasRenderer | null = null
  private envViz: EnvironmentViz | null = null
  private hud: HTMLElement | null = null
  private boat: BoatState
  private forces: ForceBreakdown
  private frameIndex = 0
  private paused = false
  private finished = false

  constructor(game: Game, replay: ReplayPayload, options: ReplaySceneOptions = {}) {
    this.game = game
    this.replay = replay
    this.options = options
    const scenario = SCENARIOS.find((s) => s.id === replay.scenarioId)
    if (!scenario) {
      throw new Error(`Unknown scenario in replay: ${replay.scenarioId}`)
    }
    this.scenario = scenario
    this.boatSpec = boatById(replay.boatId)
    this.dynamics = new BoatDynamics(this.boatSpec)
    this.boat = cloneBoatState(scenario.boat)
    this.forces = this.dynamics.computeForces(
      this.boat,
      createControls(),
      environmentFromScenario(scenario.environment),
    )
    this.checkpoints = resolveCheckpoints(scenario)
  }

  enter(ctx: FrameContext): void {
    this.renderer = new CanvasRenderer(ctx.ctx)
    this.envViz = new EnvironmentViz(ctx.ctx)
    this.frameIndex = 0
    this.finished = this.replay.frames.length === 0
    this.paused = false

    const hud = document.createElement("div")
    hud.className = "hud-root replay-hud"
    const title = this.options.title ?? "Replay"
    hud.innerHTML = `
      <div class="replay-bar" role="status">
        <p class="replay-bar__title">${title}</p>
        <p class="replay-bar__meta" data-field="replay-meta"></p>
        <div class="replay-bar__actions">
          <button class="btn" type="button" data-action="replay-toggle">Pause</button>
          <button class="btn btn--primary" type="button" data-action="replay-back">Back</button>
        </div>
      </div>
    `
    hud.querySelector<HTMLButtonElement>("[data-action='replay-toggle']")?.addEventListener(
      "click",
      () => {
        this.paused = !this.paused
        this.refreshHud()
      },
    )
    hud.querySelector<HTMLButtonElement>("[data-action='replay-back']")?.addEventListener(
      "click",
      () => this.goBack(),
    )

    this.game.uiRoot.appendChild(hud)
    this.hud = hud
    this.snapDockCamera(ctx)
    this.refreshHud()
  }

  exit(): void {
    this.hud?.remove()
    this.hud = null
    this.renderer = null
    this.envViz = null
  }

  update(ctx: FrameContext): void {
    if (ctx.input.wasActionPressed("menu")) {
      this.goBack()
      return
    }
    if (ctx.input.wasActionPressed("pause")) {
      this.paused = !this.paused
    }
    this.refreshHud()
  }

  fixedUpdate(ctx: FrameContext): void {
    if (this.paused || this.finished) return
    const frame = this.replay.frames[this.frameIndex]
    if (!frame) {
      this.finished = true
      return
    }
    const controls = createControls(controlsFromFrame(frame))
    const result = this.dynamics.step(
      this.boat,
      controls,
      environmentFromScenario(this.scenario!.environment),
      ctx.time.fixedDt,
    )
    this.boat = result.state
    this.forces = result.forces
    this.frameIndex += 1

    const env = environmentFromScenario(this.scenario!.environment)
    const halfL = this.boatSpec.lengthOverall / 2
    const sternX = this.boat.x - Math.cos(this.boat.heading) * halfL * 0.92
    const sternY = this.boat.y - Math.sin(this.boat.heading) * halfL * 0.92
    this.wake.tick(ctx.time.fixedDt, sternX, sternY, currentVelocityWorld(env))

    if (this.frameIndex >= this.replay.frames.length) {
      this.finished = true
    }
  }

  draw(ctx: FrameContext): void {
    const renderer = this.renderer
    const envViz = this.envViz
    const scenario = this.scenario
    if (!renderer || !envViz || !scenario) return

    const target = {
      dockX: scenario.dock.position.x,
      dockY: scenario.dock.position.y,
      boatX: this.boat.x,
      boatY: this.boat.y,
      width: ctx.width,
      height: ctx.height,
    }
    this.dockCamera.update(ctx.time.dt, target)
    const cam = this.dockCamera
    renderer.setView(cam.pixelsPerMeter, cam.centerX, cam.centerY)
    envViz.setPixelsPerMeter(cam.pixelsPerMeter)

    renderer.clear(ctx.width, ctx.height)
    renderer.withWorld(ctx, () => {
      envViz.draw(ctx, scenario.environment, ctx.time.elapsed)
      renderer.drawGrid(ctx)
      const { dock } = scenario
      renderer.drawDock(
        dock.position.x,
        dock.position.y,
        dock.heading,
        dock.length,
        dock.width,
      )
      this.checkpoints.forEach((zone, index) => {
        renderer.drawParkingZone(
          zone.position.x,
          zone.position.y,
          zone.heading,
          zone.length,
          zone.width,
          "completed",
          0,
        )
        renderer.drawParkingZoneCaption(
          zone.position.x,
          zone.position.y,
          index,
          zone.label,
          "completed",
        )
      })
      renderer.drawWakeTrail(this.wake.snapshot(), WAKE_MAX_AGE_S)
      renderer.drawVector(
        this.boat.x,
        this.boat.y,
        this.forces.groundVelocity.x,
        this.forces.groundVelocity.y,
        "rgba(106, 160, 188, 0.85)",
        8,
      )
      renderer.drawBoat(this.boat.x, this.boat.y, this.boat.heading, {
        length: this.boatSpec.lengthOverall,
        beam: this.boatSpec.beam,
        rudderAngle: this.boat.rudderAngle,
      })
    })
    renderer.drawViewFrame(this.dockCamera.viewFrame)
  }

  private goBack(): void {
    if (this.options.onBack) {
      this.options.onBack()
      return
    }
    this.game.setScene(new MenuScene(this.game))
  }

  private snapDockCamera(ctx: FrameContext): void {
    const scenario = this.scenario!
    this.dockCamera.snapTo({
      dockX: scenario.dock.position.x,
      dockY: scenario.dock.position.y,
      boatX: this.boat.x,
      boatY: this.boat.y,
      width: ctx.width,
      height: ctx.height,
    })
    this.renderer?.setView(
      this.dockCamera.pixelsPerMeter,
      this.dockCamera.centerX,
      this.dockCamera.centerY,
    )
    this.envViz?.setPixelsPerMeter(this.dockCamera.pixelsPerMeter)
  }

  private refreshHud(): void {
    if (!this.hud) return
    const meta = this.hud.querySelector<HTMLElement>('[data-field="replay-meta"]')
    const toggle = this.hud.querySelector<HTMLButtonElement>("[data-action='replay-toggle']")
    const progressMs =
      this.frameIndex * this.replay.fixedDt * 1000
    if (meta) {
      meta.textContent = `${formatRunTimeMs(progressMs)} / ${formatRunTimeMs(this.replay.timeMs)} · frame ${this.frameIndex}/${this.replay.frames.length}${this.finished ? " · end" : ""}`
    }
    if (toggle) {
      toggle.textContent = this.paused || this.finished ? "Play" : "Pause"
    }
  }
}
