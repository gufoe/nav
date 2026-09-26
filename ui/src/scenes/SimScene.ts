import type { FrameContext, Scene } from "../core/Scene.ts"
import type { Game } from "../core/Game.ts"
import type { Scenario } from "../sim/types.ts"
import { CanvasRenderer } from "../render/CanvasRenderer.ts"
import { DockCamera } from "../render/DockCamera.ts"
import { EnvironmentViz } from "../render/EnvironmentViz.ts"
import { MenuScene } from "./MenuScene.ts"
import { ScoreboardScene } from "./ScoreboardScene.ts"
import { Helm } from "../sim/Helm.ts"
import { clamp, radToDeg } from "../math/MathUtil.ts"
import { boatHeadingDisplayDeg, worldDirectionToRoseDeg } from "../ui/compassRose.ts"
import { formatKnots, msToKnots, toCardinal } from "../math/Units.ts"
import { BoatDynamics, type ForceBreakdown } from "../physics/BoatDynamics.ts"
import { boatById } from "../physics/boats/index.ts"
import { getSelectedBoatId } from "../core/settings.ts"
import type { BoatSpec } from "../physics/model/BoatSpec.ts"
import {
  cloneBoatState,
  driftAngle,
  speedThroughWater,
  type BoatState,
} from "../physics/model/BoatState.ts"
import { environmentFromScenario } from "../physics/model/Environment.ts"
import { windFlowFrom, currentFlowFrom } from "../sim/WorldFlow.ts"
import { WakeTrail } from "../sim/WakeTrail.ts"
import { currentVelocityWorld } from "../physics/fluids/Current.ts"
import { PHYSICS_DT } from "../physics/fluids/constants.ts"
import { DEFAULT_SIM_SPEED, type SimSpeed } from "../sim/simSpeed.ts"
import { CheckpointProgress } from "../sim/CheckpointProgress.ts"
import {
  resolveCheckpoints,
  type ParkingCheckpoint,
} from "../sim/checkpoints.ts"
import { objectiveTargets, type SemaphoreState } from "../sim/checkpointObjective.ts"
import { evaluateObjectiveStatus } from "../sim/evaluateObjectiveStatus.ts"
import { boatHullHitsDock } from "../sim/dockCollision.ts"
import { GameplayRecorder } from "../recording/GameplayRecorder.ts"
import {
  readRememberedPlayerName,
  rememberPlayerName,
} from "../recording/playerName.ts"
import { submitScore } from "../api/scores.ts"
import { formatRunTimeMs } from "../util/formatTime.ts"
import type { ReplayPayloadV2 } from "../../../shared/replay.ts"
import { snapshotControls } from "../recording/replayPhysics.ts"
import { TouchControls } from "../ui/TouchControls.ts"

const WAKE_MAX_AGE_S = 90

/** Docking scene: the force model drives the boat, input only sets demands. */
export class SimScene implements Scene {
  readonly id = "sim"

  private readonly game: Game
  private readonly scenario: Scenario
  private readonly boatSpec: BoatSpec
  private readonly dynamics: BoatDynamics
  private readonly helm = new Helm()

  private renderer: CanvasRenderer | null = null
  private envViz: EnvironmentViz | null = null
  private readonly dockCamera = new DockCamera()
  private dockCameraSnapPending = false
  private hud: HTMLElement | null = null
  private touchControls: TouchControls | null = null

  private boat: BoatState
  private forces: ForceBreakdown
  private paused = false
  private showForces = false
  private previousFixedDt = PHYSICS_DT
  private previousTimeScale = 1
  private simSpeed: SimSpeed = DEFAULT_SIM_SPEED
  private readonly wake = new WakeTrail(500, 0.75, WAKE_MAX_AGE_S)
  private readonly checkpoints: readonly ParkingCheckpoint[]
  private readonly checkpointProgress: CheckpointProgress
  private readonly recorder: GameplayRecorder
  private pendingReplay: ReplayPayloadV2 | null = null
  private scoreSubmitting = false
  private scoreSaved = false
  private scoreError: string | null = null
  private gameOver = false

  constructor(game: Game, scenario: Scenario) {
    this.game = game
    this.scenario = scenario
    this.boatSpec = boatById(getSelectedBoatId())
    this.dynamics = new BoatDynamics(this.boatSpec)
    this.boat = cloneBoatState(scenario.boat)
    this.forces = this.dynamics.computeForces(
      this.boat,
      this.helm.controls,
      environmentFromScenario(scenario.environment),
    )
    this.checkpoints = resolveCheckpoints(scenario)
    this.checkpointProgress = new CheckpointProgress(this.checkpoints)
    this.recorder = new GameplayRecorder(
      scenario.id,
      getSelectedBoatId() ?? scenario.boatId ?? this.boatSpec.id,
    )
  }

  enter(ctx: FrameContext): void {
    this.renderer = new CanvasRenderer(ctx.ctx)
    this.envViz = new EnvironmentViz(ctx.ctx)

    // Physics runs on its own fixed step, independent of the frame rate.
    this.previousFixedDt = this.game.time.fixedDt
    this.previousTimeScale = this.game.time.scale
    this.simSpeed = DEFAULT_SIM_SPEED
    this.game.time.fixedDt = PHYSICS_DT
    this.applySimSpeed()

    const hud = document.createElement("div")
    hud.className = "hud-root"
    hud.innerHTML = `
      <aside class="conditions conditions--boat" aria-label="Boat motion and controls">
        <div class="conditions__title conditions__title--scenario" data-field="scenario"></div>
        <p class="conditions__boat" data-field="boat"></p>
        <p class="conditions__status hidden" data-field="status"></p>
        <ul class="conditions__list">
          <li class="conditions__row conditions__row--sog">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">SOG</span>
            <span class="conditions__value" data-field="sog"></span>
          </li>
          <li class="conditions__row conditions__row--stw">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">STW</span>
            <span class="conditions__value" data-field="stw"></span>
          </li>
          <li class="conditions__row conditions__row--heading">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">Heading</span>
            <span class="conditions__value" data-field="heading"></span>
          </li>
          <li class="conditions__row conditions__row--drift">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">Drift</span>
            <span class="conditions__value" data-field="drift"></span>
          </li>
          <li class="conditions__row conditions__row--rot">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">Rate of turn</span>
            <span class="conditions__value" data-field="rot"></span>
          </li>
        </ul>
        <div class="conditions__title conditions__subtitle">Controls</div>
        <ul class="conditions__list">
          <li class="conditions__row conditions__row--helm">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">Helm</span>
            <span class="conditions__value" data-field="helm"></span>
          </li>
          <li class="conditions__row conditions__row--throttle">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">Throttle</span>
            <span class="conditions__value" data-field="throttle"></span>
          </li>
          <li class="conditions__row conditions__row--engine" data-field="engine-row">
            <span class="conditions__swatch"></span>
            <span class="conditions__label">Engine</span>
            <span class="conditions__value" data-field="engine"></span>
          </li>
        </ul>
        <div class="hud-meters" aria-hidden="true">
          <div class="hud-meter">
            <span class="hud-meter__label">Helm demand</span>
            <div class="hud-meter__track">
              <div class="hud-meter__fill hud-meter__fill--helm" data-meter="helm"></div>
            </div>
          </div>
          <div class="hud-meter">
            <span class="hud-meter__label">Throttle</span>
            <div class="hud-meter__track">
              <div class="hud-meter__fill hud-meter__fill--throttle" data-meter="throttle"></div>
            </div>
          </div>
        </div>
      </aside>
      <aside class="conditions conditions--env" aria-label="Sea and wind conditions">
        <div class="conditions__title">Conditions</div>
        <div class="conditions__body">
          <div class="conditions__rose" aria-hidden="true">
            <svg viewBox="0 0 96 96" class="conditions__svg">
              <circle cx="48" cy="48" r="42" class="conditions__ring" />
              <circle cx="48" cy="48" r="34" class="conditions__ring-inner" />
              <g class="conditions__ticks" aria-hidden="true">
                <line x1="48" y1="8" x2="48" y2="14" class="conditions__tick conditions__tick--major" />
                <line x1="48" y1="82" x2="48" y2="88" class="conditions__tick conditions__tick--major" />
                <line x1="8" y1="48" x2="14" y2="48" class="conditions__tick conditions__tick--major" />
                <line x1="82" y1="48" x2="88" y2="48" class="conditions__tick conditions__tick--major" />
                <line x1="62" y1="14" x2="59" y2="19" class="conditions__tick" />
                <line x1="82" y1="34" x2="77" y2="37" class="conditions__tick" />
                <line x1="82" y1="62" x2="77" y2="59" class="conditions__tick" />
                <line x1="62" y1="82" x2="59" y2="77" class="conditions__tick" />
                <line x1="34" y1="82" x2="37" y2="77" class="conditions__tick" />
                <line x1="14" y1="62" x2="19" y2="59" class="conditions__tick" />
                <line x1="14" y1="34" x2="19" y2="37" class="conditions__tick" />
                <line x1="34" y1="14" x2="37" y2="19" class="conditions__tick" />
              </g>
              <circle cx="48" cy="48" r="2.25" class="conditions__hub" />
              <text x="48" y="14" text-anchor="middle" class="conditions__cardinal conditions__cardinal--n">N</text>
              <text x="48" y="90" text-anchor="middle" class="conditions__cardinal">S</text>
              <text x="10" y="52" text-anchor="middle" class="conditions__cardinal">W</text>
              <text x="86" y="52" text-anchor="middle" class="conditions__cardinal">E</text>
              <g data-arrow="wind" class="conditions__arrow conditions__arrow--wind">
                <path d="M48 18 L54 40 L48 36 L42 40 Z" />
              </g>
              <g data-arrow="current" class="conditions__arrow conditions__arrow--current">
                <path d="M48 22 L53 38 L48 35 L43 38 Z" />
              </g>
              <g data-arrow="wave" class="conditions__arrow conditions__arrow--wave">
                <path d="M48 26 L52 37 L48 35 L44 37 Z" />
              </g>
            </svg>
          </div>
          <ul class="conditions__list">
            <li class="conditions__row conditions__row--wind">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Wind</span>
              <span class="conditions__value" data-field="wind"></span>
            </li>
            <li class="conditions__row conditions__row--current">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Current</span>
              <span class="conditions__value" data-field="current"></span>
            </li>
            <li class="conditions__row conditions__row--wave">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Waves</span>
              <span class="conditions__value" data-field="waves"></span>
            </li>
            <li class="conditions__row conditions__row--apparent">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Apparent</span>
              <span class="conditions__value" data-field="apparent"></span>
            </li>
          </ul>
        </div>
        <p class="conditions__note">
          Amber arrows = wind · Teal arrows = current · Soft lines = waves
        </p>
      </aside>
      <div class="hud-instrument hidden" data-field="instrument" aria-hidden="true">
        <aside class="conditions conditions--instrument conditions--instrument-tc" aria-label="Body state">
          <div class="conditions__title">Body & actuators</div>
          <ul class="conditions__list instrument-scalars">
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Surge u</span>
              <span class="conditions__value" data-field="inst-u"></span>
            </li>
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Sway v</span>
              <span class="conditions__value" data-field="inst-v"></span>
            </li>
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Yaw rate</span>
              <span class="conditions__value" data-field="inst-r"></span>
            </li>
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Thrust</span>
              <span class="conditions__value" data-field="inst-thrust"></span>
            </li>
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Prop wash</span>
              <span class="conditions__value" data-field="inst-wash"></span>
            </li>
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Rudder α</span>
              <span class="conditions__value" data-field="inst-rudder"></span>
            </li>
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Main</span>
              <span class="conditions__value" data-field="inst-main"></span>
            </li>
            <li class="conditions__row">
              <span class="conditions__swatch"></span>
              <span class="conditions__label">Jib</span>
              <span class="conditions__value" data-field="inst-jib"></span>
            </li>
          </ul>
        </aside>
        <aside class="conditions conditions--instrument conditions--instrument-bl" aria-label="Hydrodynamic forces">
          <div class="conditions__title">Hydrodynamics</div>
          <div class="instrument-table" data-field="forces-hydro"></div>
        </aside>
        <aside class="conditions conditions--instrument conditions--instrument-br" aria-label="Propulsion and wind forces">
          <div class="conditions__title">Propulsion & wind</div>
          <div class="instrument-table" data-field="forces-prop"></div>
        </aside>
      </div>
      <aside
        class="objective-panel hidden"
        data-field="objective-panel"
        aria-label="Hold objective"
      >
        <header class="objective-panel__head">
          <p class="objective-panel__step" data-field="objective-step"></p>
          <h2 class="objective-panel__title" data-field="objective-title"></h2>
          <p class="objective-panel__hint" data-field="objective-hint"></p>
        </header>
        <ul class="objective-semaphores" aria-label="Requirements">
          <li class="objective-semaphore" data-semaphore="place" data-state="off">
            <span class="objective-semaphore__lights" aria-hidden="true">
              <span class="objective-semaphore__lamp objective-semaphore__lamp--red"></span>
              <span class="objective-semaphore__lamp objective-semaphore__lamp--amber"></span>
              <span class="objective-semaphore__lamp objective-semaphore__lamp--green"></span>
            </span>
            <span class="objective-semaphore__body">
              <span class="objective-semaphore__label">Place</span>
              <span class="objective-semaphore__value" data-field="objective-place"></span>
            </span>
          </li>
          <li class="objective-semaphore" data-semaphore="speed" data-state="off">
            <span class="objective-semaphore__lights" aria-hidden="true">
              <span class="objective-semaphore__lamp objective-semaphore__lamp--red"></span>
              <span class="objective-semaphore__lamp objective-semaphore__lamp--amber"></span>
              <span class="objective-semaphore__lamp objective-semaphore__lamp--green"></span>
            </span>
            <span class="objective-semaphore__body">
              <span class="objective-semaphore__label">Speed</span>
              <span class="objective-semaphore__value" data-field="objective-speed"></span>
            </span>
          </li>
          <li class="objective-semaphore" data-semaphore="bearing" data-state="off">
            <span class="objective-semaphore__lights" aria-hidden="true">
              <span class="objective-semaphore__lamp objective-semaphore__lamp--red"></span>
              <span class="objective-semaphore__lamp objective-semaphore__lamp--amber"></span>
              <span class="objective-semaphore__lamp objective-semaphore__lamp--green"></span>
            </span>
            <span class="objective-semaphore__body">
              <span class="objective-semaphore__label">Heading</span>
              <span class="objective-semaphore__value" data-field="objective-bearing"></span>
            </span>
          </li>
        </ul>
        <div class="checkpoint-meter hidden" data-field="checkpoint-meter" aria-hidden="true">
          <div class="checkpoint-meter__track">
            <div class="checkpoint-meter__fill" data-field="checkpoint-fill"></div>
          </div>
        </div>
      </aside>
      <div
        class="game-over hidden"
        data-field="game-over"
        role="alertdialog"
        aria-labelledby="game-over-title"
        aria-modal="true"
      >
        <div class="game-over__backdrop" aria-hidden="true"></div>
        <div class="game-over__panel">
          <p class="game-over__eyebrow">Game over</p>
          <h2 class="game-over__title" id="game-over-title">Hit the dock</h2>
          <p class="game-over__detail" data-field="game-over-detail">
            Hull contact with the pontoon — no score saved for this run.
          </p>
          <div class="game-over__actions">
            <button class="btn btn--primary" type="button" data-action="game-over-retry">
              Try again
            </button>
            <button class="btn" type="button" data-action="game-over-menu">Scenarios</button>
          </div>
          <p class="game-over__keys"><kbd>R</kbd> reset · <kbd>Esc</kbd> menu</p>
        </div>
      </div>
      <div class="level-pass hidden" data-field="level-pass" role="dialog" aria-labelledby="level-pass-title">
        <p class="level-pass__title" id="level-pass-title">Level passed</p>
        <p class="level-pass__detail" data-field="level-pass-detail">All holds complete — well done.</p>
        <p class="level-pass__time" data-field="level-pass-time"></p>
        <label class="level-pass__name">
          <span>Enter the name you want to be remembered with</span>
          <input type="text" maxlength="64" autocomplete="nickname" data-field="player-name" />
        </label>
        <p class="level-pass__error hidden" data-field="score-error"></p>
        <p class="level-pass__saved hidden" data-field="score-saved">Score saved — check the scoreboard.</p>
        <div class="level-pass__actions">
          <button class="btn btn--primary" type="button" data-action="save-score">Save score</button>
          <button class="btn" type="button" data-action="level-scoreboard">View scoreboard</button>
          <button class="btn level-pass__btn" type="button" data-action="level-menu">
            Back to scenarios
          </button>
        </div>
      </div>
      <footer class="hud-bar conditions__note conditions__note--keys" aria-label="Keyboard shortcuts">
        <span><kbd>W</kbd><kbd>S</kbd> throttle</span>
        <span><kbd>A</kbd><kbd>D</kbd> steer</span>
        <span><kbd>X</kbd> neutral</span>
        <span><kbd>P</kbd> pause</span>
        <span><kbd>R</kbd> reset</span>
        <button class="hud__help-link" type="button" data-action="help">All controls <kbd>H</kbd></button>
      </footer>
    `
    hud.querySelector<HTMLButtonElement>("[data-action='help']")?.addEventListener("click", () => {
      this.game.toggleHelp()
    })
    hud.querySelector<HTMLButtonElement>("[data-action='game-over-retry']")?.addEventListener(
      "click",
      () => {
        this.reset()
      },
    )
    hud.querySelector<HTMLButtonElement>("[data-action='game-over-menu']")?.addEventListener(
      "click",
      () => {
        this.game.setScene(new MenuScene(this.game))
      },
    )
    hud.querySelector<HTMLButtonElement>("[data-action='level-menu']")?.addEventListener(
      "click",
      () => {
        this.game.setScene(new MenuScene(this.game))
      },
    )
    hud.querySelector<HTMLButtonElement>("[data-action='save-score']")?.addEventListener(
      "click",
      () => {
        void this.saveScore()
      },
    )
    hud.querySelector<HTMLButtonElement>("[data-action='level-scoreboard']")?.addEventListener(
      "click",
      () => {
        this.game.setScene(
          new ScoreboardScene(this.game, {
            levelId: this.scenario.id,
            boatId: this.pendingReplay?.boatId ?? getSelectedBoatId(),
          }),
        )
      },
    )

    this.recorder.reset(this.boat)
    this.game.uiRoot.appendChild(hud)
    this.hud = hud
    this.touchControls = new TouchControls(this.game.uiRoot, this.game.input)
    this.snapDockCamera(ctx)
    this.refreshHud()
  }

  private dockCameraTarget(ctx: FrameContext) {
    const { dock } = this.scenario
    return {
      dockX: dock.position.x,
      dockY: dock.position.y,
      boatX: this.boat.x,
      boatY: this.boat.y,
      width: ctx.width,
      height: ctx.height,
    }
  }

  private snapDockCamera(ctx: FrameContext): void {
    this.dockCamera.snapTo(this.dockCameraTarget(ctx))
    this.applyDockCameraView()
  }

  private applyDockCameraView(): void {
    const cam = this.dockCamera
    this.renderer?.setView(
      cam.pixelsPerMeter,
      cam.centerX,
      cam.centerY,
      cam.viewFrame.cx,
      cam.viewFrame.cy,
    )
    this.envViz?.setPixelsPerMeter(cam.pixelsPerMeter)
  }

  exit(): void {
    this.touchControls?.destroy()
    this.touchControls = null
    this.game.time.fixedDt = this.previousFixedDt
    this.game.time.scale = this.previousTimeScale
    this.hud?.remove()
    this.hud = null
    this.renderer = null
    this.envViz = null
  }

  update(ctx: FrameContext): void {
    const { input, time } = ctx

    if (this.game.isHelpOpen()) {
      this.refreshHud()
      return
    }

    if (input.wasActionPressed("menu")) {
      this.game.setScene(new MenuScene(this.game))
      return
    }
    if (input.wasActionPressed("pause")) this.paused = !this.paused
    if (input.wasActionPressed("debug")) this.showForces = !this.showForces
    if (input.wasActionPressed("reset")) this.reset()
    if (input.wasActionPressed("simSpeed1")) this.setSimSpeed(1)
    if (input.wasActionPressed("simSpeed2")) this.setSimSpeed(2)
    if (input.wasActionPressed("simSpeed3")) this.setSimSpeed(3)

    if (!this.paused) this.helm.update(input, time.dt)

    this.refreshHud()
  }

  /** Deterministic fixed-step physics; rendering interpolation is not needed yet. */
  fixedUpdate(ctx: FrameContext): void {
    if (this.paused || this.gameOver) return
    const controls = snapshotControls(this.helm.controls)
    const result = this.dynamics.step(
      this.boat,
      controls,
      environmentFromScenario(this.scenario.environment),
      ctx.time.fixedDt,
    )
    this.boat = result.state
    this.forces = result.forces

    if (boatHullHitsDock(this.boat, this.dynamics.boat, this.scenario.dock)) {
      this.gameOver = true
      this.paused = true
      this.refreshGameOverOverlay()
      return
    }

    const tickResult = this.checkpointProgress.tick(
      ctx.time.fixedDt,
      this.boat,
      result.forces.groundVelocity.x,
      result.forces.groundVelocity.y,
    )
    if (!this.checkpointProgress.isComplete) {
      this.recorder.recordStep(controls)
    }
    if (tickResult.levelJustPassed) {
      this.pendingReplay = this.recorder.finish()
      this.paused = true
    }

    const env = environmentFromScenario(this.scenario.environment)
    const spec = this.dynamics.boat
    const halfL = spec.lengthOverall / 2
    const sternX = this.boat.x - Math.cos(this.boat.heading) * halfL * 0.92
    const sternY = this.boat.y - Math.sin(this.boat.heading) * halfL * 0.92
    this.wake.tick(ctx.time.fixedDt, sternX, sternY, currentVelocityWorld(env))
  }

  draw(ctx: FrameContext): void {
    const renderer = this.renderer
    const envViz = this.envViz
    if (!renderer || !envViz) return

    const target = this.dockCameraTarget(ctx)
    if (this.dockCameraSnapPending) {
      this.dockCamera.snapTo(target)
      this.dockCameraSnapPending = false
    } else {
      this.dockCamera.update(ctx.time.dt, target)
    }
    this.applyDockCameraView()

    renderer.clear(ctx.width, ctx.height)
    renderer.withWorld(ctx, () => {
      envViz.draw(ctx, this.scenario.environment, ctx.time.elapsed)
      renderer.drawGrid(ctx)

      const { dock } = this.scenario
      renderer.drawDock(
        dock.position.x,
        dock.position.y,
        dock.heading,
        dock.length,
        dock.width,
      )

      const cp = this.checkpointProgress.snapshot()
      const pulse =
        cp.phase === "approach"
          ? 0.5 + 0.5 * Math.sin(ctx.time.elapsed * 4.2)
          : 0.5 + 0.5 * Math.sin(ctx.time.elapsed * 6)
      this.checkpoints.forEach((zone, index) => {
        let style: "upcoming" | "active" | "completed" = "upcoming"
        if (index < cp.currentIndex) style = "completed"
        else if (index === cp.currentIndex && cp.phase !== "complete") style = "active"
        renderer.drawParkingZone(
          zone.position.x,
          zone.position.y,
          zone.heading,
          zone.length,
          zone.width,
          style,
          index === cp.currentIndex ? pulse : 0,
        )
        renderer.drawParkingZoneCaption(
          zone.position.x,
          zone.position.y,
          index,
          zone.label,
          style,
        )
      })

      if (cp.phase === "celebrating" && cp.activeZone) {
        const z = cp.activeZone
        renderer.drawParkingCelebration(
          z.position.x,
          z.position.y,
          cp.celebrationProgress,
        )
      }

      const spec = this.dynamics.boat
      renderer.drawWakeTrail(this.wake.snapshot(), WAKE_MAX_AGE_S)
      renderer.drawVector(
        this.boat.x,
        this.boat.y,
        this.forces.groundVelocity.x,
        this.forces.groundVelocity.y,
        "rgba(106, 160, 188, 0.85)",
        // Eight seconds ahead: where the boat ends up if nothing changes.
        8,
      )
      renderer.drawBoat(this.boat.x, this.boat.y, this.boat.heading, {
        length: spec.lengthOverall,
        beam: spec.beam,
        rudderAngle: this.boat.rudderAngle,
      })
    })

  }

  private reset(): void {
    this.boat = cloneBoatState(this.scenario.boat)
    this.helm.reset()
    this.wake.reset()
    this.checkpointProgress.reset()
    this.recorder.reset(this.boat)
    this.pendingReplay = null
    this.scoreSubmitting = false
    this.scoreSaved = false
    this.scoreError = null
    this.gameOver = false
    this.paused = false
    this.dockCameraSnapPending = true
  }

  private setSimSpeed(speed: SimSpeed): void {
    this.simSpeed = speed
    this.applySimSpeed()
  }

  private applySimSpeed(): void {
    this.game.time.scale = this.simSpeed
  }

  private refreshHud(): void {
    if (!this.hud) return
    const env = this.scenario.environment
    const boat = this.boat
    const controls = this.helm.controls

    const set = (field: string, text: string): void => {
      const el = this.hud?.querySelector(`[data-field="${field}"]`)
      if (el) el.textContent = text
    }

    const setStatus = (text: string, danger = false): void => {
      const el = this.hud?.querySelector<HTMLElement>('[data-field="status"]')
      if (!el) return
      el.textContent = text
      el.classList.toggle("hidden", text.length === 0)
      el.classList.toggle("conditions__status--danger", danger)
    }

    const sog = Math.hypot(
      this.forces.groundVelocity.x,
      this.forces.groundVelocity.y,
    )
    const helmDeg = radToDeg(boat.rudderAngle)

    set("scenario", this.scenario.name)
    set("boat", `${this.boatSpec.prototype} · ${this.boatSpec.kind}`)
    set("sog", `${msToKnots(sog).toFixed(2)} kn`)
    set("stw", `${msToKnots(speedThroughWater(boat)).toFixed(2)} kn`)
    set("heading", `${boatHeadingDisplayDeg(boat.heading)}°`)
    set("drift", `${radToDeg(driftAngle(boat)).toFixed(0)}°`)
    set("rot", `${radToDeg(boat.r).toFixed(1)} °/s`)
    const helmAuto = this.helm.autoCenterRudder ? "" : " · latch"
    set(
      "helm",
      (Math.abs(helmDeg) < 0.5
        ? "midships"
        : `${Math.abs(helmDeg).toFixed(0)}° ${helmDeg > 0 ? "stbd" : "port"}`) + helmAuto,
    )
    set("throttle", describeThrottle(controls.throttle))
    const engineLabel = controls.engineEngaged ? "engaged" : "disengaged"
    set(
      "engine",
      `${engineLabel} · ${Math.abs(boat.rpm).toFixed(0)} rpm · ${(this.forces.thrust / 1000).toFixed(2)} kN`,
    )
    setStatus(this.gameOver ? "" : this.paused ? "Simulation paused" : "", false)
    this.refreshGameOverOverlay()
    this.refreshCheckpointHud()
    set("sim-speed", `${this.simSpeed}×`)

    this.hud
      .querySelector('[data-field="engine-row"]')
      ?.classList.toggle("conditions__row--engine-on", controls.engineEngaged)

    const maxHelm = this.dynamics.boat.steering.maxAngle
    this.setBidirectionalMeter(
      "helm",
      maxHelm > 0 ? boat.rudderAngle / maxHelm : 0,
    )
    this.setBidirectionalMeter("throttle", controls.throttle)

    set(
      "wind",
      env.windSpeed < 0.2
        ? "calm"
        : `${formatKnots(env.windSpeed)} from ${toCardinal(env.windDirection)}`,
    )
    set(
      "current",
      env.currentSpeed < 0.03
        ? "slack"
        : `${formatKnots(env.currentSpeed)} to ${toCardinal(env.currentDirection)}`,
    )
    set(
      "waves",
      env.waveHeight < 0.05
        ? "flat"
        : `${env.waveHeight.toFixed(1)} m · ${toCardinal(env.waveDirection)}`,
    )
    set(
      "apparent",
      `${formatKnots(this.forces.apparentWind.speed)}\u202f@\u202f${Math.abs(
        radToDeg(this.forces.apparentWind.angleFromBow),
      ).toFixed(0)}°`,
    )

    this.hud.classList.toggle("hud-root--instrument", this.showForces)
    const instrumentRoot = this.hud.querySelector<HTMLElement>('[data-field="instrument"]')
    if (instrumentRoot) {
      instrumentRoot.classList.toggle("hidden", !this.showForces)
      instrumentRoot.setAttribute("aria-hidden", this.showForces ? "false" : "true")
    }
    if (this.showForces) this.refreshInstrumentation(boat)

    const wind = windFlowFrom(env)
    const current = currentFlowFrom(env)
    this.setArrow("wind", wind?.fromHeading ?? 0, wind !== null)
    this.setArrow("current", current?.headingTo ?? 0, current !== null)
    this.setArrow("wave", env.waveDirection, env.waveHeight >= 0.05)
  }

  private refreshInstrumentation(boat: BoatState): void {
    const f = this.forces
    const set = (field: string, text: string): void => {
      const el = this.hud?.querySelector(`[data-field="${field}"]`)
      if (el) el.textContent = text
    }

    set("inst-u", `${msToKnots(boat.u).toFixed(2)} kn`)
    set("inst-v", `${msToKnots(boat.v).toFixed(2)} kn`)
    set("inst-r", `${radToDeg(boat.r).toFixed(1)} °/s`)
    set("inst-thrust", `${(f.thrust / 1000).toFixed(2)} kN`)
    set("inst-wash", `${f.washSpeed.toFixed(2)} m/s`)
    set(
      "inst-rudder",
      `${radToDeg(f.rudderAlpha).toFixed(0)}°${f.rudderStalled ? " stalled" : ""}`,
    )
    set("inst-main", describeSail(f.sailState.main))
    set("inst-jib", describeSail(f.sailState.jib))

    const hydroEl = this.hud?.querySelector<HTMLElement>('[data-field="forces-hydro"]')
    if (hydroEl) {
      renderInstrumentTable(hydroEl, [
        ["hull", f.hull],
        ["keel", f.keel],
        ["rudder", f.rudder],
      ])
    }
    const propEl = this.hud?.querySelector<HTMLElement>('[data-field="forces-prop"]')
    if (propEl) {
      renderInstrumentTable(propEl, [
        ["prop", f.prop],
        ["walk", f.propWalk],
        ["windage", f.windage],
        ["sails", f.sails],
        ["TOTAL", f.total],
      ])
    }
  }

  /**
   * Screen SVG has Y-down; world angles are Y-up CCW from +X.
   * Rotate so N (world +Y) points up on the dial.
   */
  /** Center-zero bar: negative values grow to port / astern. */
  private setBidirectionalMeter(name: string, value: number): void {
    const el = this.hud?.querySelector<HTMLElement>(`[data-meter="${name}"]`)
    if (!el) return
    const v = clamp(value, -1, 1)
    const pct = Math.abs(v) * 50
    el.style.width = `${pct}%`
    if (v >= 0) {
      el.style.left = "50%"
      el.style.right = "auto"
    } else {
      el.style.left = "auto"
      el.style.right = "50%"
    }
  }

  private refreshGameOverOverlay(): void {
    if (!this.hud) return
    this.hud.classList.toggle("hud-root--game-over", this.gameOver)
    const panel = this.hud.querySelector<HTMLElement>('[data-field="game-over"]')
    panel?.classList.toggle("hidden", !this.gameOver)
    const detail = this.hud.querySelector<HTMLElement>('[data-field="game-over-detail"]')
    if (detail && this.gameOver) {
      const cp = this.checkpointProgress.snapshot()
      const holdNum = Math.min(cp.currentIndex + 1, this.checkpoints.length)
      const active = this.checkpoints[cp.currentIndex]
      const holdName = active?.label.split("—")[0]?.trim() ?? `Hold ${holdNum}`
      detail.textContent = `Contact on ${holdName} (hold ${holdNum}/${this.checkpoints.length}). No score saved — reset and try again.`
    }
  }

  private refreshCheckpointHud(): void {
    if (!this.hud) return
    const cp = this.checkpointProgress.snapshot()
    const panelEl = this.hud.querySelector<HTMLElement>('[data-field="objective-panel"]')
    const meterEl = this.hud.querySelector<HTMLElement>('[data-field="checkpoint-meter"]')
    const fillEl = this.hud.querySelector<HTMLElement>('[data-field="checkpoint-fill"]')
    const passEl = this.hud.querySelector<HTMLElement>('[data-field="level-pass"]')

    if (passEl) {
      const showPass = cp.phase === "complete"
      passEl.classList.toggle("hidden", !showPass)
      if (showPass) {
        this.refreshLevelPassOverlay()
      }
    }

    if (!panelEl || !meterEl || !fillEl) return

    const total = this.checkpoints.length
    const setField = (field: string, text: string): void => {
      const el = this.hud?.querySelector<HTMLElement>(`[data-field="${field}"]`)
      if (el) el.textContent = text
    }

    panelEl.classList.remove("hidden")

    if (cp.phase === "complete") {
      setField("objective-step", `Hold ${total}/${total}`)
      setField("objective-title", "Level complete")
      setField("objective-hint", "All holds secured.")
      this.setObjectiveSemaphore("place", "go", "—")
      this.setObjectiveSemaphore("speed", "go", "—")
      this.setObjectiveSemaphore("bearing", "go", "—")
      meterEl.classList.add("hidden")
      return
    }

    const holdNum = cp.currentIndex + 1
    const active = this.checkpoints[cp.currentIndex]
    const title = active?.label.split("—")[0]?.trim() ?? `Hold ${holdNum}`
    const hint = active?.technique ?? "Park in the marked green box."

    setField("objective-step", `Hold ${holdNum}/${total}`)
    setField("objective-title", title)
    setField("objective-hint", hint)

    if (cp.phase === "celebrating") {
      setField("objective-hint", "Hold secured — next slot unlocks.")
      this.setObjectiveSemaphore("place", "go", "In box")
      this.setObjectiveSemaphore("speed", "go", "OK")
      this.setObjectiveSemaphore("bearing", "go", "OK")
      meterEl.classList.add("hidden")
      return
    }

    if (!active || !cp.holdCriteria) return

    const targets = objectiveTargets(active, cp.holdCriteria)
    const gv = this.forces.groundVelocity
    const status = evaluateObjectiveStatus(
      this.boat,
      gv.x,
      gv.y,
      active,
      cp.holdCriteria,
    )

    this.setObjectiveSemaphore("place", status.place, targets.place)
    this.setObjectiveSemaphore("speed", status.speed, targets.speed)
    this.setObjectiveSemaphore("bearing", status.bearing, targets.bearing)

    meterEl.classList.remove("hidden")
    const pct = Math.round(cp.holdProgress * 100)
    fillEl.style.width = `${pct}%`
  }

  private setObjectiveSemaphore(
    kind: "place" | "speed" | "bearing",
    state: SemaphoreState,
    value: string,
  ): void {
    const row = this.hud?.querySelector<HTMLElement>(`[data-semaphore="${kind}"]`)
    if (!row) return
    row.dataset.state = state
    const valueEl = row.querySelector<HTMLElement>(`[data-field="objective-${kind}"]`)
    if (valueEl) valueEl.textContent = value
  }

  private refreshLevelPassOverlay(): void {
    if (!this.hud) return
    const nameInput = this.hud.querySelector<HTMLInputElement>('[data-field="player-name"]')
    if (nameInput && !nameInput.dataset.prefilled) {
      nameInput.value = readRememberedPlayerName()
      nameInput.dataset.prefilled = "1"
    }
    const timeEl = this.hud.querySelector<HTMLElement>('[data-field="level-pass-time"]')
    const replay = this.pendingReplay
    if (timeEl && replay) {
      timeEl.textContent = `Sim time: ${formatRunTimeMs(replay.timeMs)}`
    }
    const errEl = this.hud.querySelector<HTMLElement>('[data-field="score-error"]')
    const savedEl = this.hud.querySelector<HTMLElement>('[data-field="score-saved"]')
    const saveBtn = this.hud.querySelector<HTMLButtonElement>("[data-action='save-score']")
    if (errEl) {
      errEl.textContent = this.scoreError ?? ""
      errEl.classList.toggle("hidden", !this.scoreError)
    }
    if (savedEl) {
      savedEl.classList.toggle("hidden", !this.scoreSaved)
    }
    if (saveBtn) {
      saveBtn.disabled = this.scoreSubmitting || this.scoreSaved || !replay
      saveBtn.textContent = this.scoreSubmitting ? "Saving…" : "Save score"
    }
  }

  private async saveScore(): Promise<void> {
    if (this.scoreSubmitting || this.scoreSaved || !this.pendingReplay || !this.hud) return
    const nameInput = this.hud.querySelector<HTMLInputElement>('[data-field="player-name"]')
    const playerName = nameInput?.value.trim() ?? ""
    if (!playerName) {
      this.scoreError = "Enter a name to save your run."
      this.refreshLevelPassOverlay()
      return
    }
    this.scoreSubmitting = true
    this.scoreError = null
    this.refreshLevelPassOverlay()
    try {
      await submitScore({
        levelId: this.scenario.id,
        playerName,
        timeMs: this.pendingReplay.timeMs,
        boatId: this.pendingReplay.boatId,
        replay: this.pendingReplay,
      })
      rememberPlayerName(playerName)
      this.scoreSaved = true
    } catch (err) {
      this.scoreError = err instanceof Error ? err.message : "Could not save score"
    } finally {
      this.scoreSubmitting = false
      this.refreshLevelPassOverlay()
    }
  }

  private setArrow(name: string, worldRadians: number, visible: boolean): void {
    const el = this.hud?.querySelector<SVGGElement>(`[data-arrow="${name}"]`)
    if (!el) return
    el.style.opacity = visible ? "1" : "0.2"
    const deg = worldDirectionToRoseDeg(worldRadians)
    el.setAttribute("transform", `rotate(${deg} 48 48)`)
  }
}

function describeSail(sail: ForceBreakdown["sailState"]["main"]): string {
  const state = sail.luffing ? "luffing" : "drawing"
  return `${state} · α ${Math.abs(radToDeg(sail.alpha)).toFixed(0)}° · boom ${Math.abs(radToDeg(sail.boomAngle)).toFixed(0)}°`
}

function wrenchForceMag(w: { fx: number; fy: number }): number {
  return Math.hypot(w.fx, w.fy)
}

function renderInstrumentTable(
  container: HTMLElement,
  rows: [string, { fx: number; fy: number; mz: number }][],
): void {
  const scale = Math.max(1, ...rows.map(([, w]) => wrenchForceMag(w)))
  const head = `
    <div class="instrument-table__row instrument-table__row--head">
      <span class="instrument-table__name"></span>
      <span class="instrument-table__num">fx kN</span>
      <span class="instrument-table__num">fy kN</span>
      <span class="instrument-table__num">mz kNm</span>
      <span class="instrument-table__bar-head">|F|</span>
    </div>`
  const body = rows
    .map(([name, w]) => {
      const mag = wrenchForceMag(w)
      const pct = (mag / scale) * 100
      const total = name === "TOTAL"
      return `
    <div class="instrument-table__row${total ? " instrument-table__row--total" : ""}">
      <span class="instrument-table__name">${name}</span>
      <span class="instrument-table__num">${(w.fx / 1000).toFixed(2)}</span>
      <span class="instrument-table__num">${(w.fy / 1000).toFixed(2)}</span>
      <span class="instrument-table__num">${(w.mz / 1000).toFixed(2)}</span>
      <span class="instrument-table__bar" aria-hidden="true">
        <i style="width:${pct.toFixed(1)}%"></i>
      </span>
    </div>`
    })
    .join("")
  container.innerHTML = head + body
}

function describeThrottle(throttle: number): string {
  const pct = Math.round(Math.abs(clamp(throttle, -1, 1)) * 100)
  if (pct === 0) return "neutral"
  return `${pct}% ${throttle > 0 ? "ahead" : "astern"}`
}
