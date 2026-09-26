import { DEFAULT_BOAT_ID, normalizeBoatId } from "../physics/boats/index.ts"

const STORAGE_KEY = "nav.settings.v1"

export interface NavSettings {
  boatId: string
}

const DEFAULT_SETTINGS: NavSettings = {
  boatId: DEFAULT_BOAT_ID,
}

let cached: NavSettings | null = null

export function loadSettings(): NavSettings {
  if (cached) return cached
  if (typeof localStorage === "undefined") {
    cached = { ...DEFAULT_SETTINGS }
    return cached
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cached = { ...DEFAULT_SETTINGS }
      return cached
    }
    const parsed = JSON.parse(raw) as Partial<NavSettings>
    cached = {
      boatId: normalizeBoatId(parsed.boatId ?? DEFAULT_SETTINGS.boatId),
    }
    return cached
  } catch {
    cached = { ...DEFAULT_SETTINGS }
    return cached
  }
}

export function saveSettings(next: NavSettings): NavSettings {
  cached = {
    boatId: normalizeBoatId(next.boatId),
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  }
  return cached
}

export function getSelectedBoatId(): string {
  return loadSettings().boatId
}

export function setSelectedBoatId(boatId: string): NavSettings {
  return saveSettings({ boatId })
}

/** Test helper */
export function resetSettingsCache(): void {
  cached = null
}
