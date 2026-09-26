/** Physics-facing environment (SI, uniform over the play area). */
export interface PhysicsEnvironment {
  /** True wind speed [m/s]. */
  windSpeed: number
  /** Direction the wind blows FROM [rad], world frame. */
  windDirection: number
  /** Current speed [m/s]. */
  currentSpeed: number
  /** Direction the water flows TO [rad], world frame. */
  currentDirection: number
}

export function createEnvironment(
  partial: Partial<PhysicsEnvironment> = {},
): PhysicsEnvironment {
  return {
    windSpeed: 0,
    windDirection: 0,
    currentSpeed: 0,
    currentDirection: 0,
    ...partial,
  }
}

export function environmentFromScenario(env: PhysicsEnvironment): PhysicsEnvironment {
  return {
    windSpeed: env.windSpeed,
    windDirection: env.windDirection,
    currentSpeed: env.currentSpeed,
    currentDirection: env.currentDirection,
  }
}
