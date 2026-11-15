// Domain entities. Plain data only: no storage or UI imports in src/domain.
//
// Conventions (see CLAUDE.md):
// - ids are UUID strings generated on the device, never auto-increment numbers
// - every stored entity carries createdAt/updatedAt (ISO strings) and optional deletedAt
// - units are part of the field name (Gr, In, Fps, Yd)
// - a load requires only charge, bullet and bullet weight; the owner does not
//   want to be made to enter detail up front, so new fields must be optional

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
  /** Bullet make and type, e.g. "Berger Hybrid". */
  bullet: string
  bulletWeightGr: number
  powder?: string
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

/** A match and the load shot at it. Only the name is required. */
export interface Match extends Entity {
  name: string
  /** YYYY-MM-DD. */
  startsOn: string
  location?: string
  loadId?: string
  /** Free text, e.g. "78/100, 12th". Deliberately unstructured. */
  result?: string
  notes?: string
}
