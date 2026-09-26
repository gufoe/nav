/** Replay playback speed vs real-time physics stepping. */
export const REPLAY_SPEED_OPTIONS = [0.5, 1, 2, 4] as const
export type ReplaySpeed = (typeof REPLAY_SPEED_OPTIONS)[number]

export const DEFAULT_REPLAY_SPEED: ReplaySpeed = 1

export function isReplaySpeed(value: number): value is ReplaySpeed {
  return (REPLAY_SPEED_OPTIONS as readonly number[]).includes(value)
}

export function formatReplaySpeed(speed: ReplaySpeed): string {
  return speed === 0.5 ? "½×" : `${speed}×`
}

/** Keys 1–4 map to the four replay speeds (same order as {@link REPLAY_SPEED_OPTIONS}). */
export function replaySpeedFromHotkeyIndex(index: number): ReplaySpeed | null {
  return REPLAY_SPEED_OPTIONS[index] ?? null
}
