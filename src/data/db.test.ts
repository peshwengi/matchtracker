import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Match, Stage } from '../domain/types.ts'
import { MatchTrackerDb } from './db.ts'
import { newEntity } from './entity.ts'

describe('MatchTrackerDb', () => {
  let db: MatchTrackerDb

  beforeEach(async () => {
    db = new MatchTrackerDb(`test-${crypto.randomUUID()}`)
    await db.open()
  })

  it('stores a match and finds its stages by matchId', async () => {
    const match = newEntity<Match>({
      name: 'Club PRS',
      format: 'prs',
      startsOn: '2026-11-21',
      rifleId: 'rifle',
      barrelId: 'barrel',
      batchId: 'batch',
    })
    await db.matches.add(match)
    await db.stages.bulkAdd([
      newEntity<Stage>({ matchId: match.id, sequence: 1, roundsFired: 10, impacts: 8 }),
      newEntity<Stage>({ matchId: match.id, sequence: 2, roundsFired: 10, impacts: 6 }),
      newEntity<Stage>({ matchId: 'other', sequence: 1, roundsFired: 10, impacts: 10 }),
    ])

    const stages = await db.stages.where('matchId').equals(match.id).sortBy('sequence')
    expect(stages.map((s) => s.impacts)).toEqual([8, 6])
    expect((await db.matches.get(match.id))?.name).toBe('Club PRS')
  })
})
