const STORAGE_KEY = "nav-player-name"

export function readRememberedPlayerName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? ""
  } catch {
    return ""
  }
}

export function rememberPlayerName(name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  try {
    localStorage.setItem(STORAGE_KEY, trimmed.slice(0, 64))
  } catch {
    /* private mode / blocked storage */
  }
}
