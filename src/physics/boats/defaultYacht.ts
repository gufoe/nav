import type { BoatSpec } from "../model/BoatSpec.ts"
import { degToRad } from "../../math/MathUtil.ts"

/**
 * Jeanneau Sun Odyssey 36i envelope (~11 m LOA, ~6.5 t displacement).
 * Hydrodynamic coefficients are tuned against manoeuvres in __tests__;
 * prop-walk fractions are empirical calibration targets.
 * Not intended as an exact reproduction.
 */
export const SUN_ODYSSEY_36I: BoatSpec = {
  id: "sun-odyssey-36i",
  name: "Sun Odyssey 36i",
  prototype: "Jeanneau Sun Odyssey 36i",
  kind: "Cruising yacht",

  mass: 6500,
  yawInertia: 52000,

  lengthOverall: 11.0,
  lengthWaterline: 9.5,
  beam: 3.5,
  draft: 1.9,

  addedMass: {
    surge: 650,
    sway: 4800,
    yaw: 13000,
    swayYaw: 0,
    yawSway: 0,
  },

  hull: {
    Xu: 250,
    Xuu: 130,
    Yv: 1200,
    Yvv: 3000,
    /** Lower yaw damping than the first tune — fin keel, not full keel. */
    Nr: 9500,
    Nrr: 25000,
  },

  keel: {
    area: 2.35,
    aspectRatio: 1.6,
    x: -0.3,
    y: 0,
    cd0: 0.02,
    oswald: 0.8,
    enabled: true,
  },

  steering: {
    maxAngle: degToRad(35),
    /** ~2 s lock-to-lock at the wheel; rudder hits ±35° in ~1 s from midships. */
    maxRate: degToRad(35),
    wheelTurnsLockToLock: 2.5,
  },

  rudder: {
    area: 0.62,
    aspectRatio: 3.0,
    x: -4.2,
    y: 0,
    cd0: 0.03,
    oswald: 0.85,
    washAreaFraction: 0.45,
    /** Lets rudder bite once sternway exists; full astern still feels walk-heavy. */
    asternAuthority: 1.05,
  },

  engine: {
    maxAheadRpm: 2800,
    maxAsternRpm: 2400,
    timeConstant: 0.6,
  },

  gearbox: {
    forwardRatio: 2.62,
    reverseRatio: 3.06,
  },

  propeller: {
    x: -3.8,
    y: 0,
    diameter: 0.42,
    wakeFraction: 0.2,
    reverseEfficiency: 0.65,
    slipstreamGain: 0.75,

    propWalkDirection: 1,
    forwardWalk: 0.02,
    reverseWalk: 0.105,

    kt0Forward: 0.35,
    kt1Forward: 0.28,
    kt0Reverse: 0.32,
    kt1Reverse: 0.24,
  },

  windage: {
    frontalArea: 4.5,
    lateralArea: 16,
    cdFront: 0.7,
    cdSide: 0.9,
    centerX: 0.6,
    centerY: 0,
  },

  sails: {
    enabled: false,
    main: {
      area: 32,
      x: -0.6,
      y: 0,
      maxSheetAngle: degToRad(80),
    },
    jib: {
      area: 28,
      x: 2.4,
      y: 0,
      maxSheetAngle: degToRad(75),
    },
  },
}

/** @deprecated use {@link SUN_ODYSSEY_36I} */
export const DEFAULT_YACHT = SUN_ODYSSEY_36I
