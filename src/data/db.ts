import Dexie, { type EntityTable } from 'dexie'
import type { Load, Match, RangeString, Stage } from '../domain/types.ts'

export class MatchTrackerDb extends Dexie {
  loads!: EntityTable<Load, 'id'>
  rangeStrings!: EntityTable<RangeString, 'id'>
  matches!: EntityTable<Match, 'id'>
  stages!: EntityTable<Stage, 'id'>

  constructor(name = 'matchtracker') {
    super(name)
    // Only indexed fields are listed here. Once the app is in use, never edit
    // an existing version: add the next version with an upgrade function.
    this.version(1).stores({
      loads: 'id',
      rangeStrings: 'id, loadId',
      matches: 'id, startsOn, loadId',
      stages: 'id, matchId',
    })
  }
}

export const db = new MatchTrackerDb()
