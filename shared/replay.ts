/** Compact control snapshot per physics step (120 Hz). */
export type ReplayFrame = [
  rudder: number,
  throttle: number,
  mainsheet: number,
  jibSheet: number,
  engineEngaged: 0 | 1,
]

/** Full actuator + pose snapshot at recording start (ground + body frame). */
export type ReplayState = [
  x: number,
  y: number,
  heading: number,
  u: number,
  v: number,
  r: number,
  rpm: number,
  rudderAngle: number,
]

export interface ReplayPayloadV1 {
  v: 1
  scenarioId: string
  boatId: string
  /** Simulation time = frames.length × fixedDt. */
  timeMs: number
  fixedDt: number
  frames: ReplayFrame[]
}

export interface ReplayPayloadV2 {
  v: 2
  scenarioId: string
  boatId: string
  timeMs: number
  fixedDt: number
  initial: ReplayState
  frames: ReplayFrame[]
}

export type ReplayPayload = ReplayPayloadV1 | ReplayPayloadV2

export function stateToReplay(state: {
  x: number
  y: number
  heading: number
  u: number
  v: number
  r: number
  rpm: number
  rudderAngle: number
}): ReplayState {
  return [state.x, state.y, state.heading, state.u, state.v, state.r, state.rpm, state.rudderAngle]
}

export function replayToBoatState(initial: ReplayState): {
  x: number
  y: number
  heading: number
  u: number
  v: number
  r: number
  rpm: number
  rudderAngle: number
} {
  return {
    x: initial[0],
    y: initial[1],
    heading: initial[2],
    u: initial[3],
    v: initial[4],
    r: initial[5],
    rpm: initial[6],
    rudderAngle: initial[7],
  }
}

export function frameFromControls(c: {
  rudder: number
  throttle: number
  mainsheet: number
  jibSheet: number
  engineEngaged: boolean
}): ReplayFrame {
  return [
    c.rudder,
    c.throttle,
    c.mainsheet,
    c.jibSheet,
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

/** Scoreboard / HUD time — always physics steps, never wall clock. */
export function replaySimTimeMs(payload: {
  fixedDt: number
  frames: readonly unknown[]
}): number {
  return payload.frames.length * payload.fixedDt * 1000
}

export function isReplayPayload(value: unknown): value is ReplayPayload {
  if (!value || typeof value !== "object") return false
  const r = value as ReplayPayload
  if (r.v !== 1 && r.v !== 2) return false
  if (
    typeof r.scenarioId !== "string" ||
    typeof r.boatId !== "string" ||
    typeof r.fixedDt !== "number" ||
    !Array.isArray(r.frames)
  ) {
    return false
  }
  if (r.v === 2) {
    const initial = (r as ReplayPayloadV2).initial
    if (!Array.isArray(initial) || initial.length !== 8) return false
  }
  return true
}

export function resolveReplayInitial(
  payload: ReplayPayload,
  scenarioStart: ReturnType<typeof replayToBoatState>,
): ReturnType<typeof replayToBoatState> {
  if (payload.v === 2) {
    return replayToBoatState(payload.initial)
  }
  return { ...scenarioStart }
}
