import { Vec2 } from "../math/Vec2.ts"
import { degToRad, radToDeg } from "../math/MathUtil.ts"
import type { Dock } from "./types.ts"
import type { ParkingCheckpoint } from "./checkpoints.ts"

/**
 * Standard marina slip styles on the **east** face of a N–S finger pontoon.
 * Every slot uses the same LOA × beam envelope; only position and heading change.
 */
export type SlipStyle =
  | "american-parallel"
  | "med-stern-to"
  | "med-bow-to"
  | "english-stern-to"

export const SLIP_ENVELOPE = {
  length: 11,
  width: 4,
  fenderGap: 0.45,
  halfBeam: 1.75,
} as const

/** Stations along the finger in world Y (north +). */
/** Spaced so full 11 m slips do not overlap (parallel vs stern-to footprints). */
export const FINGER_STATION = {
  north: 8,
  mid: 0,
  south: -8,
} as const

function slipZone(
  x: number,
  y: number,
  headingDeg: number,
  label: string,
  technique: string,
): ParkingCheckpoint {
  return {
    position: Vec2.from(x, y),
    heading: degToRad(headingDeg),
    length: SLIP_ENVELOPE.length,
    width: SLIP_ENVELOPE.width,
    label,
    technique,
  }
}

export type MooringSide = "east" | "west"

/** Outward from the deck (east = basin side on the default N–S finger). */
function outwardNormal(dock: Dock, side: MooringSide): Vec2 {
  const h = dock.heading
  const east = Vec2.from(-Math.sin(h), Math.cos(h))
  return side === "east" ? east : Vec2.from(-east.x, -east.y)
}

/** Point on the east or west face at a given world-Y station. */
export function mooringFacePoint(
  dock: Dock,
  worldY: number,
  side: MooringSide = "east",
): Vec2 {
  const h = dock.heading
  const cos = Math.cos(h)
  const sin = Math.sin(h)
  const halfW = dock.width / 2
  const localY = side === "east" ? halfW : -halfW
  if (Math.abs(sin) < 1e-6) {
    throw new Error("Dock heading must not be parallel to world Y")
  }
  const lx = (worldY - dock.position.y - localY * cos) / sin
  return Vec2.from(
    dock.position.x + lx * cos - localY * sin,
    dock.position.y + lx * sin + localY * cos,
  )
}

function centerOffFace(face: Vec2, normal: Vec2, distance: number): Vec2 {
  return Vec2.from(face.x + normal.x * distance, face.y + normal.y * distance)
}

/**
 * American alongside on the east face: bow north, stern south (world +y = north).
 * Finger deck uses {@link Dock.heading} −90° (local +x toward south); boat ψ = +90°.
 */
function americanParallelHeadingDeg(dock: Dock): number {
  const dockDeg = radToDeg(dock.heading)
  return dockDeg + 180
}

/** American: parallel to the finger, outside berth (floating slip). */
export function americanParallelSlip(
  dock: Dock,
  worldY: number,
  standOff: number,
  label: string,
  technique: string,
): ParkingCheckpoint {
  const face = mooringFacePoint(dock, worldY, "east")
  const n = outwardNormal(dock, "east")
  const outboard =
    SLIP_ENVELOPE.fenderGap + SLIP_ENVELOPE.halfBeam + standOff
  const center = centerOffFace(face, n, outboard)
  return slipZone(
    center.x,
    center.y,
    americanParallelHeadingDeg(dock),
    label,
    technique,
  )
}

/**
 * Med stern-to on the **west** (shore) face — bow to the basin side of the pier,
 * stern to the dock, opposite the American alongside slips.
 */
export function medSternToSlip(
  dock: Dock,
  worldY: number,
  label: string,
  technique: string,
): ParkingCheckpoint {
  const face = mooringFacePoint(dock, worldY, "west")
  const n = outwardNormal(dock, "west")
  const center = centerOffFace(
    face,
    n,
    SLIP_ENVELOPE.fenderGap + SLIP_ENVELOPE.length / 2,
  )
  return slipZone(center.x, center.y, 180, label, technique)
}

export function englishSternToSlip(
  dock: Dock,
  worldY: number,
  label: string,
  technique: string,
): ParkingCheckpoint {
  return medSternToSlip(dock, worldY, label, technique)
}

/** Med bow-to: bow into the dock, stern to open water. */
export function medBowToSlip(
  dock: Dock,
  worldY: number,
  label: string,
  technique: string,
): ParkingCheckpoint {
  const face = mooringFacePoint(dock, worldY, "east")
  const n = outwardNormal(dock, "east")
  const center = centerOffFace(
    face,
    n,
    SLIP_ENVELOPE.fenderGap + SLIP_ENVELOPE.length / 2,
  )
  return slipZone(center.x, center.y, 180, label, technique)
}

export function slipForStyle(
  dock: Dock,
  style: SlipStyle,
  worldY: number,
  options: { standOff?: number; label: string; technique: string },
): ParkingCheckpoint {
  const standOff = options.standOff ?? 0
  switch (style) {
    case "american-parallel":
      return americanParallelSlip(
        dock,
        worldY,
        standOff,
        options.label,
        options.technique,
      )
    case "med-stern-to":
      return medSternToSlip(dock, worldY, options.label, options.technique)
    case "med-bow-to":
      return medBowToSlip(dock, worldY, options.label, options.technique)
    case "english-stern-to":
      return englishSternToSlip(dock, worldY, options.label, options.technique)
  }
}

export function expectedHeadingDeg(style: SlipStyle, dock: Dock): number {
  switch (style) {
    case "american-parallel":
      return americanParallelHeadingDeg(dock)
    case "med-stern-to":
    case "english-stern-to":
      return 180
    case "med-bow-to":
      return 180
  }
}
