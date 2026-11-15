// Domain entities. Plain data only: no storage or UI imports in src/domain.
//
// Conventions (see CLAUDE.md):
// - ids are UUID strings generated on the device, never auto-increment numbers
// - every stored entity carries createdAt/updatedAt (ISO strings) and optional deletedAt
// - units are part of the field name (Gr, In, Fps, Yd, Mil)

export interface Entity {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Rifle extends Entity {
  name: string
  cartridge: string
  notes?: string
}

export interface Barrel extends Entity {
  rifleId: string
  description: string
  twistRateIn?: number
  installedOn?: string
  retiredOn?: string
}

export type ComponentKind = 'bullet' | 'powder' | 'primer' | 'brass'

/** One purchased lot of a component. Lots matter: a new powder lot is a new load. */
export interface ComponentLot extends Entity {
  kind: ComponentKind
  manufacturer: string
  product: string
  lotNumber?: string
  /** Bullet weight in grains; bullets only. */
  bulletWeightGr?: number
  notes?: string
}

/** A recipe: what goes into a round, independent of when it was loaded. */
export interface Load extends Entity {
  name: string
  rifleId: string
  bulletLotId: string
  powderLotId: string
  primerLotId: string
  brassLotId: string
  chargeGr: number
  /** Cartridge base to ogive. */
  cbtoIn?: number
  coalIn?: number
  notes?: string
}

/** A set of rounds loaded together from one Load, for testing or for a match. */
export interface AmmoBatch extends Entity {
  loadId: string
  loadedOn: string
  roundCount: number
  /** How many times this brass had been fired before this loading. */
  brassFirings?: number
  notes?: string
}

/** A string of shots fired from one batch over a chronograph and/or at a target. */
export interface RangeString extends Entity {
  batchId: string
  barrelId: string
  firedOn: string
  velocitiesFps: number[]
  groupSizeIn?: number
  distanceYd?: number
  temperatureF?: number
  notes?: string
}

export type MatchFormat = 'prs' | 'elr-steel' | 'other'

export interface Match extends Entity {
  name: string
  format: MatchFormat
  startsOn: string
  location?: string
  rifleId: string
  barrelId: string
  batchId: string
  notes?: string
}

export interface Stage extends Entity {
  matchId: string
  /** Order shot, starting at 1. */
  sequence: number
  name?: string
  roundsFired: number
  impacts: number
  /** Points available, when it differs from the round count. */
  pointsPossible?: number
  pointsScored?: number
  notes?: string
}
