import type { BoatSpec } from "../model/BoatSpec.ts"
import { degToRad } from "../../math/MathUtil.ts"

/**
 * J/Boats J/24 one-design (~7.3 m, ~1.4 t).
 * Heavier and beamier than the J/70; common club racer with aux outboard.
 */
export const J24: BoatSpec = {
  id: "j24",
  name: "J/24",
  prototype: "J/Boats J/24",
  kind: "One-design keelboat",

  mass: 1400,
  yawInertia: 5200,

  lengthOverall: 7.32,
  lengthWaterline: 6.1,
  beam: 2.71,
  draft: 1.37,

  addedMass: {
    surge: 140,
    sway: 980,
    yaw: 1200,
    swayYaw: 0,
    yawSway: 0,
  },

  hull: {
    Xu: 58,
    Xuu: 36,
    Yv: 280,
    Yvv: 720,
    Nr: 2400,
    Nrr: 6200,
  },

  keel: {
    area: 1.15,
    aspectRatio: 1.85,
    x: -0.18,
    y: 0,
    cd0: 0.022,
    oswald: 0.81,
    enabled: true,
  },

  steering: {
    maxAngle: degToRad(32),
    maxRate: degToRad(42),
    wheelTurnsLockToLock: 2.0,
  },

  rudder: {
    area: 0.32,
    aspectRatio: 3.0,
    x: -2.95,
    y: 0,
    cd0: 0.028,
    oswald: 0.87,
    washAreaFraction: 0.45,
    asternAuthority: 1.1,
  },

  engine: {
    maxAheadRpm: 3000,
    maxAsternRpm: 2600,
    timeConstant: 0.4,
  },

  gearbox: {
    forwardRatio: 2.5,
    reverseRatio: 2.9,
  },

  propeller: {
    x: -2.75,
    y: 0,
    diameter: 0.26,
    wakeFraction: 0.16,
    reverseEfficiency: 0.65,
    slipstreamGain: 0.75,

    propWalkDirection: 1,
    forwardWalk: 0.028,
    reverseWalk: 0.13,

    kt0Forward: 0.3,
    kt1Forward: 0.24,
    kt0Reverse: 0.28,
    kt1Reverse: 0.2,
  },

  windage: {
    frontalArea: 1.9,
    lateralArea: 5.0,
    cdFront: 0.64,
    cdSide: 0.84,
    centerX: 0.22,
    centerY: 0,
  },

  sails: {
    enabled: false,
    main: {
      area: 15,
      x: -0.25,
      y: 0,
      maxSheetAngle: degToRad(75),
    },
    jib: {
      area: 12,
      x: 1.35,
      y: 0,
      maxSheetAngle: degToRad(70),
    },
  },
}
