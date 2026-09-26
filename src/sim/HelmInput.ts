import type { Action } from "../core/Input.ts"

/** Minimal input surface for {@link Helm} — easy to stub in tests. */
export interface HelmInput {
  isActionDown(action: Action): boolean
  wasActionPressed(action: Action): boolean
}
