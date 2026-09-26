export { PHYSICS_DT, AIR_DENSITY, WATER_DENSITY } from "./fluids/constants.ts"

export { BoatDynamics, advanceActuators } from "./BoatDynamics.ts"
export type { ForceBreakdown, DynamicsStepResult } from "./BoatDynamics.ts"

export {
  createBoatState,
  cloneBoatState,
  speedThroughWater,
  driftAngle,
} from "./model/BoatState.ts"
export type { BoatState } from "./model/BoatState.ts"

export { createControls } from "./model/Controls.ts"
export type { Controls } from "./model/Controls.ts"

export type { BoatSpec, SailSpec } from "./model/BoatSpec.ts"
export { createEnvironment, environmentFromScenario } from "./model/Environment.ts"
export type { PhysicsEnvironment } from "./model/Environment.ts"

export { DEFAULT_YACHT } from "./boats/defaultYacht.ts"

export { integrateRigidBody } from "./math/Integrator.ts"
export { bodyToWorld, worldToBody } from "./math/Frames.ts"
export type { Wrench2D } from "./math/Wrench.ts"

export { currentVelocityWorld, groundVelocityWorld } from "./fluids/Current.ts"
export { computeApparentWind, trueWindVelocityWorld } from "./fluids/ApparentWind.ts"
export type { ApparentWind } from "./fluids/ApparentWind.ts"
