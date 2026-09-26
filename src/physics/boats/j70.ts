import type { BoatSpec } from "../model/BoatSpec.ts"
import { degToRad } from "../../math/MathUtil.ts"

/**
 * J/Boats J/70 one-design sport keelboat (~6.9 m, ~1.1 t all-up).
 * Light, short, and lively under power — less mass but still a right-hand prop.
 */
export const J70: BoatSpec = {
  id: "j70",
  name: "J/70",
  prototype: "J/Boats J/70",
  kind: "Sport keelboat",

  mass: 1095,
  yawInertia: 3800,

  lengthOverall: 6.93,
  lengthWaterline: 6.63,
  beam: 2.22,
  draft: 1.68,

  addedMass: {
    surge: 110,
    sway: 820,
    yaw: 950,
    swayYaw: 0,
    yawSway: 0,
  },

  hull: {
    Xu: 45,
    Xuu: 28,
    Yv: 220,
    Yvv: 580,
    Nr: 1800,
    Nrr: 4800,
  },

  keel: {
    area: 0.95,
    aspectRatio: 2.0,
    x: -0.15,
    y: 0,
    cd0: 0.022,
    oswald: 0.82,
    enabled: true,
  },

  steering: {
    maxAngle: degToRad(30),
    maxRate: degToRad(45),
    wheelTurnsLockToLock: 1.8,
  },

  rudder: {
    area: 0.28,
    aspectRatio: 3.2,
    x: -2.65,
    y: 0,
    cd0: 0.028,
    oswald: 0.88,
    washAreaFraction: 0.5,
    asternAuthority: 1.15,
  },

  engine: {
    maxAheadRpm: 3200,
    maxAsternRpm: 2800,
    timeConstant: 0.35,
  },

  gearbox: {
    forwardRatio: 2.4,
    reverseRatio: 2.8,
  },

  propeller: {
    x: -2.45,
    y: 0,
    diameter: 0.28,
    wakeFraction: 0.15,
    reverseEfficiency: 0.68,
    slipstreamGain: 0.8,

    propWalkDirection: 1,
    forwardWalk: 0.025,
    reverseWalk: 0.12,

    kt0Forward: 0.32,
    kt1Forward: 0.26,
    kt0Reverse: 0.3,
    kt1Reverse: 0.22,
  },

  windage: {
    frontalArea: 1.6,
    lateralArea: 4.2,
    cdFront: 0.65,
    cdSide: 0.85,
    centerX: 0.25,
    centerY: 0,
  },

  sails: {
    enabled: false,
    main: {
      area: 13,
      x: -0.2,
      y: 0,
      maxSheetAngle: degToRad(75),
    },
    jib: {
      area: 11,
      x: 1.2,
      y: 0,
      maxSheetAngle: degToRad(70),
    },
  },
}
