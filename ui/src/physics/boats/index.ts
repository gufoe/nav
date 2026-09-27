import type { BoatSpec } from "../model/BoatSpec.ts"
import { SUN_ODYSSEY_36I, DEFAULT_YACHT } from "./defaultYacht.ts"
import { BENETEAU_OCEANIS_401 } from "./beneteauOceanis401.ts"
import { J70 } from "./j70.ts"
import { J24 } from "./j24.ts"
import { RIB_TENDER } from "./ribTender.ts"
import { HALLBERG_RASSY_340 } from "./hallbergRassy340.ts"

export { DEFAULT_YACHT, SUN_ODYSSEY_36I }

export const DEFAULT_BOAT_ID = SUN_ODYSSEY_36I.id

/** Legacy scenario id → canonical boat id. */
const LEGACY_BOAT_IDS: Readonly<Record<string, string>> = {
  "coastal-36": SUN_ODYSSEY_36I.id,
}

export const BOATS: Readonly<Record<string, BoatSpec>> = {
  [SUN_ODYSSEY_36I.id]: SUN_ODYSSEY_36I,
  [BENETEAU_OCEANIS_401.id]: BENETEAU_OCEANIS_401,
  [J70.id]: J70,
  [J24.id]: J24,
  [RIB_TENDER.id]: RIB_TENDER,
  [HALLBERG_RASSY_340.id]: HALLBERG_RASSY_340,
}

/** Selectable boats in settings (stable order). */
export const BOAT_CATALOG: readonly BoatSpec[] = [
  SUN_ODYSSEY_36I,
  BENETEAU_OCEANIS_401,
  HALLBERG_RASSY_340,
  J70,
  J24,
  RIB_TENDER,
]

export function normalizeBoatId(id: string): string {
  const trimmed = id.trim()
  const resolved = LEGACY_BOAT_IDS[trimmed] ?? trimmed
  return BOATS[resolved] ? resolved : DEFAULT_BOAT_ID
}

export function boatById(id: string): BoatSpec {
  return BOATS[normalizeBoatId(id)] ?? SUN_ODYSSEY_36I
}
