import { Time } from "./Time.ts"
import { Input } from "./Input.ts"
import type { FrameContext, Scene } from "./Scene.ts"
import { HelpOverlay } from "../ui/HelpOverlay.ts"

export interface GameOptions {
  canvas: HTMLCanvasElement
  uiRoot: HTMLElement
  /** Max fixed physics steps per frame (anti spiral-of-death). */
  maxFixedSteps?: number
}

/**
 * Owns the canvas, input, time, and active scene.
 * Scene switches are deferred to the end of the frame.
 */
export class Game {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly uiRoot: HTMLElement
  readonly time = new Time()
  readonly input = new Input()
  private readonly helpOverlay: HelpOverlay

  private scene: Scene | null = null
  private pendingScene: Scene | null = null
  private running = false
  private rafId = 0
  private lastTimestamp = 0
  private readonly maxFixedSteps: number

  private readonly onResize = (): void => {
    this.resize()
  }

  constructor(options: GameOptions) {
    this.canvas = options.canvas
    this.uiRoot = options.uiRoot
    this.maxFixedSteps = options.maxFixedSteps ?? 12

    const ctx = this.canvas.getContext("2d")
    if (!ctx) throw new Error("2D canvas context unavailable")
    this.ctx = ctx

    const overlayRoot = this.uiRoot.parentElement ?? document.body
    this.helpOverlay = new HelpOverlay(overlayRoot)
  }

  isHelpOpen(): boolean {
    return this.helpOverlay.isOpen()
  }

  toggleHelp(): void {
    this.helpOverlay.toggle()
  }

  start(initialScene: Scene): void {
    if (this.running) return
    this.running = true
    this.input.attach()
    window.addEventListener("resize", this.onResize)
    this.resize()
    this.setScene(initialScene)
    this.lastTimestamp = performance.now()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    if (!this.running) return
    this.running = false
    cancelAnimationFrame(this.rafId)
    window.removeEventListener("resize", this.onResize)
    this.input.detach()
    this.helpOverlay.destroy()
    this.scene?.exit?.()
    this.scene = null
  }

  setScene(scene: Scene): void {
    this.pendingScene = scene
  }

  getScene(): Scene | null {
    return this.scene
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) return

    const rawDt = (timestamp - this.lastTimestamp) / 1000
    this.lastTimestamp = timestamp

    this.time.advance(rawDt)
    this.applyPendingScene()

    const ctx = this.frameContext()

    let steps = 0
    while (this.time.consumeFixedStep() && steps < this.maxFixedSteps) {
      this.scene?.fixedUpdate?.(ctx)
      steps++
    }

    this.helpOverlay.handleInput(this.input)
    this.scene?.update(ctx)
    this.scene?.draw(ctx)
    this.input.endFrame()

    this.rafId = requestAnimationFrame(this.tick)
  }

  private applyPendingScene(): void {
    if (!this.pendingScene) return
    const next = this.pendingScene
    this.pendingScene = null
    this.scene?.exit?.()
    this.scene = next
    this.uiRoot.replaceChildren()
    next.enter?.(this.frameContext())
  }

  private frameContext(): FrameContext {
    return {
      time: this.time,
      input: this.input,
      canvas: this.canvas,
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
    }
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr))
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }
}
