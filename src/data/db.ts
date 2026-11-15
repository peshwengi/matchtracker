import Dexie, { type EntityTable } from 'dexie'
import type { Load, Match, RangeString } from '../domain/types.ts'

/** Device-local settings. Never included in a backup. */
export interface Meta {
  key: string
  value: string
}

export class MatchTrackerDb extends Dexie {
  loads!: EntityTable<Load, 'id'>
  rangeStrings!: EntityTable<RangeString, 'id'>
  matches!: EntityTable<Match, 'id'>
  meta!: EntityTable<Meta, 'key'>

  constructor(name = 'matchtracker') {
    super(name)
    // Only indexed fields are listed here. The app is in use on the owner's
    // phone: never edit an existing version, add the next one.
    this.version(1).stores({
      loads: 'id',
      rangeStrings: 'id, loadId',
      matches: 'id, startsOn, loadId',
      stages: 'id, matchId',
    })
    // Per-stage scoring was dropped before it was ever used.
    this.version(2).stores({ stages: null })
    this.version(3).stores({ meta: 'key' })
  }
}

export const db = new MatchTrackerDb()
