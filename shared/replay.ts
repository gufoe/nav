/** Compact control snapshot per physics step (120 Hz). */
export type ReplayFrame = [
  rudder: number,
  throttle: number,
  mainsheet: number,
  jibSheet: number,
  engineEngaged: 0 | 1,
]

export interface ReplayPayload {
  v: 1
  scenarioId: string
  boatId: string
  /** Simulation time from level start to pass (ms). */
  timeMs: number
  fixedDt: number
  frames: ReplayFrame[]
}

export function frameFromControls(c: {
  rudder: number
  throttle: number
  mainsheet: number
  jibSheet: number
  engineEngaged: boolean
}): ReplayFrame {
  return [
    round4(c.rudder),
    round4(c.throttle),
    round4(c.mainsheet),
    round4(c.jibSheet),
    c.engineEngaged ? 1 : 0,
  ]
}

export function controlsFromFrame(f: ReplayFrame): {
  rudder: number
  throttle: number
  mainsheet: number
  jibSheet: number
  engineEngaged: boolean
} {
  return {
    rudder: f[0],
    throttle: f[1],
    mainsheet: f[2],
    jibSheet: f[3],
    engineEngaged: f[4] === 1,
  }
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000
}
