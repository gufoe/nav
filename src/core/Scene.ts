import type { Time } from "./Time.ts"
import type { Input } from "./Input.ts"

/** Per-frame context passed to scenes. */
export interface FrameContext {
  time: Time
  input: Input
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
}

/**
 * A scene owns one mode of the app (menu, sim, briefing, …).
 * Physics will live inside SimScene later — not here.
 */
export interface Scene {
  readonly id: string
  enter?(ctx: FrameContext): void
  exit?(): void
  update(ctx: FrameContext): void
  /** Optional fixed-rate step for future physics. */
  fixedUpdate?(ctx: FrameContext): void
  draw(ctx: FrameContext): void
}
