import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { MatchTrackerDb } from './db.ts'

describe('MatchTrackerDb upgrades', () => {
  it('keeps version 1 data when upgrading', async () => {
    const name = `test-${crypto.randomUUID()}`
    const v1 = new Dexie(name)
    v1.version(1).stores({
      loads: 'id',
      rangeStrings: 'id, loadId',
      matches: 'id, startsOn, loadId',
      stages: 'id, matchId',
    })
    await v1.table('loads').add({ id: 'a', chargeGr: 30.2, bullet: 'Hybrid', bulletWeightGr: 108 })
    await v1.table('rangeStrings').add({ id: 's', loadId: 'a', velocitiesFps: [2800] })
    v1.close()

    const db = new MatchTrackerDb(name)
    await db.open()
    expect(await db.loads.get('a')).toMatchObject({ chargeGr: 30.2 })
    expect(await db.rangeStrings.where('loadId').equals('a').count()).toBe(1)
    expect(db.tables.map((t) => t.name).sort()).toEqual(['loads', 'matches', 'rangeStrings'])
  })
})
