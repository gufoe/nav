import type { BoatSpec } from "../model/BoatSpec.ts"
import { degToRad } from "../../math/MathUtil.ts"

/**
 * Beneteau Oceanis 40.1 envelope (~12.9 m LOA, ~8.5 t displacement).
 * Heavier and beamier than a 36 ft cruiser; more windage, slower to spin.
 * Coefficients scaled from the Sun Odyssey 36i tune, not a yard trial.
 */
export const BENETEAU_OCEANIS_401: BoatSpec = {
  id: "beneteau-oceanis-40",
  name: "Oceanis 40.1",
  prototype: "Beneteau Oceanis 40.1",
  kind: "Cruising yacht",

  mass: 8500,
  yawInertia: 92000,

  lengthOverall: 12.87,
  lengthWaterline: 11.66,
  beam: 4.18,
  draft: 2.17,

  addedMass: {
    surge: 850,
    sway: 6200,
    yaw: 22000,
    swayYaw: 0,
    yawSway: 0,
  },

  hull: {
    Xu: 310,
    Xuu: 165,
    Yv: 1500,
    Yvv: 3800,
    Nr: 11800,
    Nrr: 32000,
  },

  keel: {
    area: 2.85,
    aspectRatio: 1.55,
    x: -0.35,
    y: 0,
    cd0: 0.02,
    oswald: 0.8,
    enabled: true,
  },

  steering: {
    maxAngle: degToRad(35),
    maxRate: degToRad(32),
    wheelTurnsLockToLock: 2.5,
  },

  rudder: {
    area: 0.78,
    aspectRatio: 3.0,
    x: -4.85,
    y: 0,
    cd0: 0.03,
    oswald: 0.85,
    washAreaFraction: 0.42,
    asternAuthority: 1.0,
  },

  engine: {
    maxAheadRpm: 3000,
    maxAsternRpm: 2600,
    timeConstant: 0.65,
  },

  gearbox: {
    forwardRatio: 2.62,
    reverseRatio: 3.06,
  },

  propeller: {
    x: -4.4,
    y: 0,
    diameter: 0.46,
    wakeFraction: 0.22,
    reverseEfficiency: 0.64,
    slipstreamGain: 0.72,

    propWalkDirection: 1,
    forwardWalk: 0.018,
    reverseWalk: 0.095,

    kt0Forward: 0.38,
    kt1Forward: 0.3,
    kt0Reverse: 0.34,
    kt1Reverse: 0.25,
  },

  windage: {
    frontalArea: 5.8,
    lateralArea: 21,
    cdFront: 0.72,
    cdSide: 0.92,
    centerX: 0.75,
    centerY: 0,
  },

  sails: {
    enabled: false,
    main: {
      area: 38,
      x: -0.7,
      y: 0,
      maxSheetAngle: degToRad(80),
    },
    jib: {
      area: 32,
      x: 2.8,
      y: 0,
      maxSheetAngle: degToRad(75),
    },
  },
}
