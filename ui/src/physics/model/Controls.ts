/**
 * Pilot demands. The physics never reads keys — only these.
 *
 * rudder:   -1 = hard to port, +1 = hard to starboard
 * throttle: -1 = full astern, 0 = neutral, +1 = full ahead
 * sheets:    0 = sheeted flat in, 1 = fully eased
 * engineEngaged: when false, throttle demand does not drive the prop (lever position is kept).
 */
export interface Controls {
  rudder: number
  throttle: number
  mainsheet: number
  jibSheet: number
  engineEngaged: boolean
}

export function createControls(partial: Partial<Controls> = {}): Controls {
  return {
    rudder: 0,
    throttle: 0,
    mainsheet: 1,
    jibSheet: 1,
    engineEngaged: true,
    ...partial,
  }
}
