// Domain entities. Plain data only: no storage or UI imports in src/domain.
//
// Conventions (see CLAUDE.md):
// - ids are UUID strings generated on the device, never auto-increment numbers
// - every stored entity carries createdAt/updatedAt (ISO strings) and optional deletedAt
// - units are part of the field name (Gr, In, Fps, Yd)
// - only chargeGr is required on a load; the owner does not want to be made to
//   enter detail up front, so new fields must be optional

export interface Entity {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * One batch of ammunition: a recipe and the rounds loaded to it. Component
 * descriptions are free text. There are deliberately no separate rifle,
 * barrel or component-lot records.
 */
export interface Load extends Entity {
  chargeGr: number
  powder?: string
  bullet?: string
  bulletWeightGr?: number
  /** Rifle or cartridge, e.g. "6 Dasher". */
  rifle?: string
  brass?: string
  primer?: string
  /** Cartridge base to ogive. */
  cbtoIn?: number
  /** YYYY-MM-DD. */
  loadedOn?: string
  name?: string
  notes?: string
}

/** A string of shots fired from one load over a chronograph and/or at a target. */
export interface RangeString extends Entity {
  loadId: string
  /** Local "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD". */
  firedOn: string
  velocitiesFps: number[]
  groupSizeIn?: number
  distanceYd?: number
  notes?: string
  /** Population SD as reported by Garmin ShotView, kept as a cross-check. */
  garminSdFps?: number
}

export type MatchFormat = 'prs' | 'elr-steel' | 'other'

export interface Match extends Entity {
  name: string
  format: MatchFormat
  /** YYYY-MM-DD. */
  startsOn: string
  location?: string
  loadId?: string
  notes?: string
}

export interface Stage extends Entity {
  matchId: string
  /** Order shot, starting at 1. */
  sequence: number
  name?: string
  roundsFired: number
  impacts: number
  notes?: string
}
