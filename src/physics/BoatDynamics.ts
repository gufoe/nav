import type { BoatState } from "./model/BoatState.ts"
import type { BoatSpec } from "./model/BoatSpec.ts"
import type { Controls } from "./model/Controls.ts"
import type { PhysicsEnvironment } from "./model/Environment.ts"
import type { ApparentWind } from "./fluids/ApparentWind.ts"
import { currentVelocityWorld, groundVelocityWorld } from "./fluids/Current.ts"
import { computeApparentWind } from "./fluids/ApparentWind.ts"
import { PHYSICS_DT } from "./fluids/constants.ts"
import { integrateRigidBody } from "./math/Integrator.ts"
import { addWrench, cloneWrench, zeroWrench, type Wrench2D } from "./math/Wrench.ts"
import { hullResistance } from "./forces/HullResistance.ts"
import { keelForce } from "./forces/KeelForce.ts"
import { rudderForce } from "./forces/RudderForce.ts"
import { propellerForce } from "./forces/PropellerForce.ts"
import { propWalkForce } from "./forces/PropWalk.ts"
import { windageForce } from "./forces/WindageForce.ts"
import { sailForce, type SailResult } from "./forces/SailForce.ts"
import { clamp } from "../math/MathUtil.ts"

/** Per-component forces, kept separate so any one can be read or disabled. */
export interface ForceBreakdown {
  hull: Wrench2D
  keel: Wrench2D
  rudder: Wrench2D
  prop: Wrench2D
  propWalk: Wrench2D
  windage: Wrench2D
  sails: Wrench2D
  total: Wrench2D

  apparentWind: ApparentWind
  groundVelocity: { x: number; y: number }

  thrust: number
  shaftRps: number
  washSpeed: number
  rudderAlpha: number
  rudderStalled: boolean
  sailState: SailResult
}

export interface DynamicsStepResult {
  state: BoatState
  forces: ForceBreakdown
}

/**
 * Force-based 3-DOF rigid body:  M ν̇ + C(ν)ν + D(ν)ν = τ
 *
 * Nothing here decides how the boat "should" behave. Each module returns a
 * wrench, they are summed, and the result is integrated.
 */
export class BoatDynamics {
  readonly boat: BoatSpec

  constructor(boat: BoatSpec) {
    this.boat = boat
  }

  step(
    state: BoatState,
    controls: Controls,
    env: PhysicsEnvironment,
    dt: number = PHYSICS_DT,
  ): DynamicsStepResult {
    const actuated = advanceActuators(state, controls, this.boat, dt)
    const forces = this.computeForces(actuated, controls, env)
    const next = integrateRigidBody(
      actuated,
      forces.total,
      this.boat,
      currentVelocityWorld(env),
      dt,
    )
    return { state: next, forces }
  }

  computeForces(
    state: BoatState,
    controls: Controls,
    env: PhysicsEnvironment,
  ): ForceBreakdown {
    const current = currentVelocityWorld(env)
    const groundVelocity = groundVelocityWorld(state, current)
    const apparentWind = computeApparentWind(state.heading, env, groundVelocity)

    const hull = hullResistance(state, this.boat)
    const keel = keelForce(state, this.boat)
    const prop = propellerForce(state, this.boat)
    const propWalk = propWalkForce(prop.thrust, this.boat)
    const rudder = rudderForce(
      state,
      this.boat,
      prop.washSpeed,
      prop.washArea,
      prop.thrust,
    )
    const windage = windageForce(this.boat, apparentWind)
    const sails = sailForce(controls, this.boat, apparentWind)

    const total = zeroWrench()
    addWrench(total, hull)
    addWrench(total, keel)
    addWrench(total, rudder.wrench)
    addWrench(total, prop.wrench)
    addWrench(total, propWalk)
    addWrench(total, windage)
    addWrench(total, sails.wrench)

    return {
      hull,
      keel,
      rudder: cloneWrench(rudder.wrench),
      prop: cloneWrench(prop.wrench),
      propWalk,
      windage,
      sails: cloneWrench(sails.wrench),
      total,
      apparentWind,
      groundVelocity,
      thrust: prop.thrust,
      shaftRps: prop.shaftRps,
      washSpeed: prop.washSpeed,
      rudderAlpha: rudder.alpha,
      rudderStalled: rudder.stalled,
      sailState: sails,
    }
  }
}

/**
 * Helm and throttle are demands, not instant states: the wheel takes time to
 * turn and the engine takes time to spool. Short bursts of power therefore
 * behave the way they do on a real boat.
 */
export function advanceActuators(
  state: BoatState,
  controls: Controls,
  boat: BoatSpec,
  dt: number,
): BoatState {
  const st = boat.steering
  const eng = boat.engine

  const demandedAngle = clamp(controls.rudder, -1, 1) * st.maxAngle
  const rudderAngle = approach(state.rudderAngle, demandedAngle, st.maxRate * dt)

  const throttle = controls.engineEngaged ? clamp(controls.throttle, -1, 1) : 0
  const demandedRpm =
    throttle >= 0 ? throttle * eng.maxAheadRpm : throttle * eng.maxAsternRpm
  const rpmBlend = 1 - Math.exp(-dt / Math.max(eng.timeConstant, 1e-6))
  const rpm = state.rpm + (demandedRpm - state.rpm) * rpmBlend

  return { ...state, rudderAngle, rpm }
}

function approach(value: number, target: number, maxDelta: number): number {
  const delta = target - value
  if (Math.abs(delta) <= maxDelta) return target
  return value + Math.sign(delta) * maxDelta
}
