/** Ground speed (m/s) before score/replay recording begins (~0.12 kn). */
export const RUN_TIMER_START_SOG_MPS = 0.06

export function runTimerShouldStart(sogMps: number): boolean {
  return sogMps >= RUN_TIMER_START_SOG_MPS
}
