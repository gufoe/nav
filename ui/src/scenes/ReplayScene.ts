import type { FrameContext, Scene } from "../core/Scene.ts"
import type { Game } from "../core/Game.ts"
import {
  type ReplayPayload,
  replaySimTimeMs,
  resolveReplayInitial,
} from "../../../shared/replay.ts"
import { stepReplay } from "../recording/replayPhysics.ts"
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
import {
  DEFAULT_REPLAY_SPEED,
  formatReplaySpeed,
  isReplaySpeed,
  REPLAY_SPEED_OPTIONS,
  replaySpeedFromHotkeyIndex,
  type ReplaySpeed,
} from "../sim/replaySpeed.ts"

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
  private replaySpeed: ReplaySpeed = DEFAULT_REPLAY_SPEED
  private previousFixedDt = 1 / 60
  private previousTimeScale = 1

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
    this.boat = cloneBoatState(
      resolveReplayInitial(replay, cloneBoatState(scenario.boat)),
    )
    this.forces = this.dynamics.computeForces(
      this.boat,
      createControls(),
      environmentFromScenario(scenario.environment),
    )
    this.checkpoints = resolveCheckpoints(scenario)
  }

  enter(ctx: FrameContext): void {
    this.previousFixedDt = this.game.time.fixedDt
    this.previousTimeScale = this.game.time.scale
    this.game.time.fixedDt = this.replay.fixedDt
    this.replaySpeed = DEFAULT_REPLAY_SPEED
    this.applyReplaySpeed()

    this.renderer = new CanvasRenderer(ctx.ctx)
    this.envViz = new EnvironmentViz(ctx.ctx)
    this.restartPlayback()
    this.paused = false

    const hud = document.createElement("div")
    hud.className = "hud-root replay-hud"
    const title = this.options.title ?? "Replay"
    const speedButtons = REPLAY_SPEED_OPTIONS.map(
      (speed) =>
        `<button class="btn btn--small replay-bar__speed-btn" type="button" data-speed="${speed}">${formatReplaySpeed(speed)}</button>`,
    ).join("")
    hud.innerHTML = `
      <div class="replay-bar" role="status">
        <p class="replay-bar__title">${title}</p>
        <p class="replay-bar__meta" data-field="replay-meta"></p>
        <div class="replay-bar__speed" role="group" aria-label="Playback speed">
          ${speedButtons}
        </div>
        <div class="replay-bar__actions">
          <button class="btn" type="button" data-action="replay-toggle">Pause</button>
          <button class="btn" type="button" data-action="replay-restart">Restart</button>
          <button class="btn btn--primary" type="button" data-action="replay-back">Back</button>
        </div>
      </div>
      <p class="replay-bar__hint"><kbd>1</kbd>–<kbd>4</kbd> speed · <kbd>P</kbd> pause · <kbd>R</kbd> restart</p>
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
    hud.querySelector<HTMLButtonElement>("[data-action='replay-restart']")?.addEventListener(
      "click",
      () => {
        this.restartPlayback()
        this.paused = false
        this.refreshHud()
      },
    )
    hud.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const speed = Number(btn.dataset.speed)
        if (isReplaySpeed(speed)) this.setReplaySpeed(speed)
      })
    })

    this.game.uiRoot.appendChild(hud)
    this.hud = hud
    this.snapDockCamera(ctx)
    this.refreshHud()
  }

  exit(): void {
    this.game.time.fixedDt = this.previousFixedDt
    this.game.time.scale = this.previousTimeScale
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
    if (ctx.input.wasActionPressed("reset")) {
      this.restartPlayback()
      this.paused = false
    }
    if (ctx.input.wasActionPressed("simSpeed1")) {
      this.setReplaySpeed(replaySpeedFromHotkeyIndex(0) ?? DEFAULT_REPLAY_SPEED)
    }
    if (ctx.input.wasActionPressed("simSpeed2")) {
      this.setReplaySpeed(replaySpeedFromHotkeyIndex(1) ?? DEFAULT_REPLAY_SPEED)
    }
    if (ctx.input.wasActionPressed("simSpeed3")) {
      this.setReplaySpeed(replaySpeedFromHotkeyIndex(2) ?? DEFAULT_REPLAY_SPEED)
    }
    if (ctx.input.wasActionPressed("simSpeed4")) {
      this.setReplaySpeed(replaySpeedFromHotkeyIndex(3) ?? DEFAULT_REPLAY_SPEED)
    }
    this.refreshHud()
  }

  fixedUpdate(ctx: FrameContext): void {
    void ctx
    if (this.paused || this.finished) return
    const frame = this.replay.frames[this.frameIndex]
    if (!frame) {
      this.finished = true
      return
    }
    const env = environmentFromScenario(this.scenario!.environment)
    const result = stepReplay(
      this.dynamics,
      this.boat,
      frame,
      env,
      this.replay.fixedDt,
    )
    this.boat = result.state
    this.forces = result.forces
    this.frameIndex += 1

    const halfL = this.boatSpec.lengthOverall / 2
    const sternX = this.boat.x - Math.cos(this.boat.heading) * halfL * 0.92
    const sternY = this.boat.y - Math.sin(this.boat.heading) * halfL * 0.92
    this.wake.tick(this.replay.fixedDt, sternX, sternY, currentVelocityWorld(env))

    if (this.frameIndex >= this.replay.frames.length) {
      this.finished = true
    }
  }

  draw(ctx: FrameContext): void {
    const renderer = this.renderer
    const envViz = this.envViz
    const scenario = this.scenario
    if (!renderer || !envViz || !scenario) return

    const spec = this.dynamics.boat
    const target = {
      dockX: scenario.dock.position.x,
      dockY: scenario.dock.position.y,
      dockHeading: scenario.dock.heading,
      dockLength: scenario.dock.length,
      dockWidth: scenario.dock.width,
      boatX: this.boat.x,
      boatY: this.boat.y,
      boatHeading: this.boat.heading,
      boatLength: spec.lengthOverall,
      boatBeam: spec.beam,
      width: ctx.width,
      height: ctx.height,
    }
    this.dockCamera.update(ctx.time.dt, target)
    const cam = this.dockCamera
    renderer.setView(
      cam.pixelsPerMeter,
      cam.centerX,
      cam.centerY,
      cam.viewFrame.cx,
      cam.viewFrame.cy,
    )
    envViz.setView(
      cam.pixelsPerMeter,
      cam.centerX,
      cam.centerY,
      cam.viewFrame.cx,
      cam.viewFrame.cy,
    )

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
    const spec = this.dynamics.boat
    this.dockCamera.snapTo({
      dockX: scenario.dock.position.x,
      dockY: scenario.dock.position.y,
      dockHeading: scenario.dock.heading,
      dockLength: scenario.dock.length,
      dockWidth: scenario.dock.width,
      boatX: this.boat.x,
      boatY: this.boat.y,
      boatHeading: this.boat.heading,
      boatLength: spec.lengthOverall,
      boatBeam: spec.beam,
      width: ctx.width,
      height: ctx.height,
    })
    this.renderer?.setView(
      this.dockCamera.pixelsPerMeter,
      this.dockCamera.centerX,
      this.dockCamera.centerY,
      this.dockCamera.viewFrame.cx,
      this.dockCamera.viewFrame.cy,
    )
    this.envViz?.setView(
      this.dockCamera.pixelsPerMeter,
      this.dockCamera.centerX,
      this.dockCamera.centerY,
      this.dockCamera.viewFrame.cx,
      this.dockCamera.viewFrame.cy,
    )
  }

  private restartPlayback(): void {
    this.frameIndex = 0
    this.finished = this.replay.frames.length === 0
    this.boat = cloneBoatState(
      resolveReplayInitial(this.replay, cloneBoatState(this.scenario!.boat)),
    )
    this.wake.reset()
    this.forces = this.dynamics.computeForces(
      this.boat,
      createControls(),
      environmentFromScenario(this.scenario!.environment),
    )
  }

  private setReplaySpeed(speed: ReplaySpeed): void {
    this.replaySpeed = speed
    this.applyReplaySpeed()
    this.refreshHud()
  }

  private applyReplaySpeed(): void {
    this.game.time.scale = this.replaySpeed
  }

  private refreshHud(): void {
    if (!this.hud) return
    const meta = this.hud.querySelector<HTMLElement>('[data-field="replay-meta"]')
    const toggle = this.hud.querySelector<HTMLButtonElement>("[data-action='replay-toggle']")
    const progressMs = this.frameIndex * this.replay.fixedDt * 1000
    const totalMs = replaySimTimeMs(this.replay)
    if (meta) {
      meta.textContent = `${formatRunTimeMs(progressMs)} / ${formatRunTimeMs(totalMs)} sim · ${formatReplaySpeed(this.replaySpeed)}${this.finished ? " · end" : ""}`
    }
    if (toggle) {
      toggle.textContent = this.paused || this.finished ? "Play" : "Pause"
    }
    this.hud.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((btn) => {
      const speed = Number(btn.dataset.speed)
      btn.classList.toggle("btn--primary", speed === this.replaySpeed)
    })
  }
}
