import type { BoatSpec } from "../model/BoatSpec.ts"
import { degToRad } from "../../math/MathUtil.ts"

/**
 * Hallberg-Rassy 340 envelope (~10.3 m LOA, ~9.3 t displacement).
 * Full-keel, heavy displacement — turns slowly, tracks straight, strong prop walk.
 * Coefficients scaled for character, not a yard trial.
 */
export const HALLBERG_RASSY_340: BoatSpec = {
  id: "hallberg-rassy-340",
  name: "Hallberg-Rassy 340",
  prototype: "Hallberg-Rassy 340",
  kind: "Full-keel cruiser",

  mass: 9300,
  yawInertia: 105000,

  lengthOverall: 10.28,
  lengthWaterline: 9.05,
  beam: 3.4,
  draft: 1.75,

  addedMass: {
    surge: 920,
    sway: 6800,
    yaw: 26000,
    swayYaw: 0,
    yawSway: 0,
  },

  hull: {
    Xu: 340,
    Xuu: 175,
    Yv: 1650,
    Yvv: 4200,
    /** Full keel resists yaw — high linear and quadratic damping. */
    Nr: 14500,
    Nrr: 38000,
  },

  keel: {
    area: 3.35,
    aspectRatio: 1.15,
    x: -0.55,
    y: 0,
    cd0: 0.021,
    oswald: 0.78,
    enabled: true,
  },

  steering: {
    maxAngle: degToRad(32),
    maxRate: degToRad(26),
    wheelTurnsLockToLock: 3,
  },

  rudder: {
    area: 0.58,
    aspectRatio: 2.4,
    x: -4.0,
    y: 0,
    cd0: 0.034,
    oswald: 0.82,
    washAreaFraction: 0.38,
    asternAuthority: 0.92,
  },

  engine: {
    maxAheadRpm: 2700,
    maxAsternRpm: 2300,
    timeConstant: 0.75,
  },

  gearbox: {
    forwardRatio: 2.75,
    reverseRatio: 3.15,
  },

  propeller: {
    x: -3.65,
    y: 0,
    diameter: 0.4,
    wakeFraction: 0.24,
    reverseEfficiency: 0.62,
    slipstreamGain: 0.68,

    propWalkDirection: 1,
    forwardWalk: 0.016,
    reverseWalk: 0.118,

    kt0Forward: 0.34,
    kt1Forward: 0.27,
    kt0Reverse: 0.31,
    kt1Reverse: 0.23,
  },

  windage: {
    frontalArea: 5.2,
    lateralArea: 18,
    cdFront: 0.74,
    cdSide: 0.94,
    centerX: 0.55,
    centerY: 0,
  },

  sails: {
    enabled: false,
    main: {
      area: 30,
      x: -0.55,
      y: 0,
      maxSheetAngle: degToRad(80),
    },
    jib: {
      area: 26,
      x: 2.2,
      y: 0,
      maxSheetAngle: degToRad(75),
    },
  },
}
