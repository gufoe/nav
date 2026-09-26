/** Allowed simulation speed multipliers (wall clock → sim time). */
export const SIM_SPEED_OPTIONS = [1, 2, 3] as const
export type SimSpeed = (typeof SIM_SPEED_OPTIONS)[number]

export const DEFAULT_SIM_SPEED: SimSpeed = 2

export function isSimSpeed(value: number): value is SimSpeed {
  return (SIM_SPEED_OPTIONS as readonly number[]).includes(value)
}
