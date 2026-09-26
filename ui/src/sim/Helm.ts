import type { HelmInput } from "./HelmInput.ts"
import { clamp } from "../math/MathUtil.ts"
import { createControls, type Controls } from "../physics/model/Controls.ts"

/**
 * Turns key presses into control demands.
 *
 * The wheel springs back to midships when you let go, the throttle lever does
 * not — that is the part people get wrong when docking.
 */
export class Helm {
  readonly controls: Controls = createControls({ mainsheet: 0.5, jibSheet: 0.5 })

  /** When true, releasing A/D springs the wheel demand back to midships. */
  autoCenterRudder = true

  /** Normalized helm demand (−1…1) per second while a rudder key is held. */
  private readonly rudderRate = 2.5
  private readonly centringRate = 1.2
  private readonly throttleRate = 0.9
  private readonly sheetRate = 0.6

  update(input: HelmInput, dt: number): Controls {
    const c = this.controls

    if (input.wasActionPressed("helmAutoCenter")) {
      this.autoCenterRudder = !this.autoCenterRudder
    }
    if (input.wasActionPressed("engineToggle")) {
      c.engineEngaged = !c.engineEngaged
    }
    if (input.wasActionPressed("rudderCenter")) c.rudder = 0

    const port = input.isActionDown("rudderLeft")
    const starboard = input.isActionDown("rudderRight")
    if (port !== starboard) {
      const towards = starboard ? 1 : -1
      c.rudder = clamp(c.rudder + towards * this.rudderRate * dt, -1, 1)
    } else if (this.autoCenterRudder) {
      c.rudder = approach(c.rudder, 0, this.centringRate * dt)
    }

    if (input.isActionDown("throttleUp")) {
      c.throttle = clamp(c.throttle + this.throttleRate * dt, -1, 1)
    }
    if (input.isActionDown("throttleDown")) {
      c.throttle = clamp(c.throttle - this.throttleRate * dt, -1, 1)
    }
    if (input.wasActionPressed("throttleNeutral")) c.throttle = 0

    if (input.isActionDown("sheetIn")) {
      c.mainsheet = clamp(c.mainsheet - this.sheetRate * dt, 0, 1)
      c.jibSheet = clamp(c.jibSheet - this.sheetRate * dt, 0, 1)
    }
    if (input.isActionDown("sheetOut")) {
      c.mainsheet = clamp(c.mainsheet + this.sheetRate * dt, 0, 1)
      c.jibSheet = clamp(c.jibSheet + this.sheetRate * dt, 0, 1)
    }

    return c
  }

  reset(): void {
    this.autoCenterRudder = true
    this.controls.rudder = 0
    this.controls.throttle = 0
    this.controls.mainsheet = 0.5
    this.controls.jibSheet = 0.5
    this.controls.engineEngaged = true
  }
}

function approach(value: number, target: number, maxDelta: number): number {
  const delta = target - value
  if (Math.abs(delta) <= maxDelta) return target
  return value + Math.sign(delta) * maxDelta
}
