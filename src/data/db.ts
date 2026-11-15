import Dexie, { type EntityTable } from 'dexie'
import type {
  AmmoBatch,
  Barrel,
  ComponentLot,
  Load,
  Match,
  RangeString,
  Rifle,
  Stage,
} from '../domain/types.ts'

export class MatchTrackerDb extends Dexie {
  rifles!: EntityTable<Rifle, 'id'>
  barrels!: EntityTable<Barrel, 'id'>
  componentLots!: EntityTable<ComponentLot, 'id'>
  loads!: EntityTable<Load, 'id'>
  batches!: EntityTable<AmmoBatch, 'id'>
  rangeStrings!: EntityTable<RangeString, 'id'>
  matches!: EntityTable<Match, 'id'>
  stages!: EntityTable<Stage, 'id'>

  constructor(name = 'matchtracker') {
    super(name)
    // Only indexed fields are listed here. Never edit a published version:
    // add version(2) with an upgrade function instead.
    this.version(1).stores({
      rifles: 'id',
      barrels: 'id, rifleId',
      componentLots: 'id, kind',
      loads: 'id, rifleId',
      batches: 'id, loadId',
      rangeStrings: 'id, batchId, barrelId',
      matches: 'id, startsOn, batchId, barrelId',
      stages: 'id, matchId',
    })
  }
}

export const db = new MatchTrackerDb()
