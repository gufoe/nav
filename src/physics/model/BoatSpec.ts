/**
 * Everything the physics needs to know about a particular yacht.
 * Behaviour lives in the force modules; boats differ only by this data.
 * All values SI; body-frame x is positive forward, y positive to port.
 */
export interface BoatSpec {
  id: string
  /** Short label in HUD and menus. */
  name: string
  /** Real-world model the coefficients are loosely based on (UI only). */
  prototype: string
  /** Hull role, e.g. cruising yacht vs sport keelboat (UI only). */
  kind: string

  /** Displacement [kg]. */
  mass: number
  /** Yaw moment of inertia about the CG [kg·m²]. */
  yawInertia: number

  lengthOverall: number
  lengthWaterline: number
  beam: number
  draft: number

  /**
   * Hydrodynamic added mass / inertia. Cross terms couple sway and yaw
   * (Y_{\dot r}, N_{\dot v}); default to zero until calibrated.
   */
  addedMass: {
    surge: number
    sway: number
    yaw: number
    /** Sway force from yaw acceleration [kg·m]. Same as Y_{\dot r}. */
    swayYaw?: number
    /** Yaw moment from sway acceleration [kg·m]. Same as N_{\dot v}. */
    yawSway?: number
  }

  /** Linear + quadratic hull damping on water-relative motion. */
  hull: {
    /** [N·s/m] and [N·s²/m²] */
    Xu: number
    Xuu: number
    Yv: number
    Yvv: number
    /** [N·m·s/rad] and [N·m·s²/rad²] */
    Nr: number
    Nrr: number
  }

  keel: {
    /** Lateral plane area [m²]. */
    area: number
    aspectRatio: number
    /** Centre of lateral resistance relative to CG [m]. */
    x: number
    y: number
    cd0: number
    oswald: number
    enabled: boolean
  }

  /** Steering mechanism limits (wheel/tiller), not hydrodynamics. */
  steering: {
    maxAngle: number
    maxRate: number
    /** Optional metadata for UI / presets; not used in forces. */
    wheelTurnsLockToLock?: number
  }

  rudder: {
    area: number
    aspectRatio: number
    x: number
    y: number
    cd0: number
    oswald: number
    /** Fraction of the blade area standing in the propeller slipstream. */
    washAreaFraction: number
    /**
     * Extra rudder lift when backing with sternway and no astern prop wash —
     * calibrated so helm can steer against prop walk once the boat is moving.
     */
    asternAuthority: number
  }

  engine: {
    maxAheadRpm: number
    maxAsternRpm: number
    /** First-order RPM response τ [s]: dn/dt = (n_target − n) / τ. */
    timeConstant: number
  }

  gearbox: {
    forwardRatio: number
    reverseRatio: number
  }

  propeller: {
    x: number
    y: number
    /** Diameter [m]. */
    diameter: number
    /** Hull wake fraction: advance speed Va = u·(1 − w). */
    wakeFraction: number
    /** Propeller-only astern thrust penalty (not gearbox ratio). */
    reverseEfficiency: number
    /** Fraction of the fully developed slipstream reached at the rudder. */
    slipstreamGain: number

    /** +1 = right-hand propeller: stern walks to port when going astern. */
    propWalkDirection: -1 | 1
    /** Empirical side force as a fraction of thrust; fit from trials, not theory. */
    forwardWalk: number
    reverseWalk: number

    /** KT(J) = kt0 − kt1·J, separate fits for ahead and astern. */
    kt0Forward: number
    kt1Forward: number
    kt0Reverse: number
    kt1Reverse: number
  }

  windage: {
    /** Projected areas [m²]. */
    frontalArea: number
    lateralArea: number
    cdFront: number
    cdSide: number
    /** Centre of windage relative to CG [m]. */
    centerX: number
    centerY: number
  }

  sails: {
    enabled: boolean
    main: SailSpec
    jib: SailSpec
  }
}

export interface SailSpec {
  /** Sail area [m²]. */
  area: number
  /** Centre of effort relative to CG [m]. */
  x: number
  y: number
  /** Largest angle off the centreline the sheet can let the sail out [rad]. */
  maxSheetAngle: number
}
