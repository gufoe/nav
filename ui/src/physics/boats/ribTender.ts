import type { BoatSpec } from "../model/BoatSpec.ts"
import { degToRad } from "../../math/MathUtil.ts"

/**
 * Compact rigid inflatable tender with an outboard (~5.4 m, ~480 kg all-up).
 * The outboard's prop wash gives immediate low-speed steering; there is no keel
 * or sail plan to steady the hull once the throttle comes off.
 */
export const RIB_TENDER: BoatSpec = {
  id: "rib-tender",
  name: "RIB Tender",
  prototype: "Zodiac Pro 5.5",
  kind: "Rigid inflatable tender",

  mass: 480,
  yawInertia: 1250,

  lengthOverall: 5.4,
  lengthWaterline: 4.65,
  beam: 2.45,
  draft: 0.42,

  addedMass: {
    surge: 75,
    sway: 360,
    yaw: 430,
    swayYaw: 0,
    yawSway: 0,
  },

  hull: {
    Xu: 48,
    Xuu: 25,
    Yv: 150,
    Yvv: 390,
    Nr: 860,
    Nrr: 2300,
  },

  keel: {
    area: 0.28,
    aspectRatio: 1.1,
    x: -0.2,
    y: 0,
    cd0: 0.05,
    oswald: 0.72,
    enabled: false,
  },

  steering: {
    maxAngle: degToRad(35),
    maxRate: degToRad(70),
    wheelTurnsLockToLock: 1.5,
  },

  rudder: {
    area: 0.24,
    aspectRatio: 2.1,
    x: -2.18,
    y: 0,
    cd0: 0.04,
    oswald: 0.78,
    washAreaFraction: 0.9,
    asternAuthority: 0.8,
  },

  engine: {
    maxAheadRpm: 5200,
    maxAsternRpm: 4300,
    timeConstant: 0.24,
  },

  gearbox: {
    forwardRatio: 2.0,
    reverseRatio: 2.15,
  },

  propeller: {
    x: -2.42,
    y: 0,
    diameter: 0.31,
    wakeFraction: 0.08,
    reverseEfficiency: 0.72,
    slipstreamGain: 0.95,

    propWalkDirection: 1,
    forwardWalk: 0.01,
    reverseWalk: 0.05,

    kt0Forward: 0.34,
    kt1Forward: 0.25,
    kt0Reverse: 0.3,
    kt1Reverse: 0.2,
  },

  windage: {
    frontalArea: 1.65,
    lateralArea: 3.5,
    cdFront: 0.78,
    cdSide: 0.95,
    centerX: 0.15,
    centerY: 0,
  },

  sails: {
    enabled: false,
    main: {
      area: 0,
      x: 0,
      y: 0,
      maxSheetAngle: degToRad(80),
    },
    jib: {
      area: 0,
      x: 0,
      y: 0,
      maxSheetAngle: degToRad(80),
    },
  },
}
