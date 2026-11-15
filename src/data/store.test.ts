import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import fixture from '../domain/fixtures/shotview-session.csv?raw'
import { parseShotViewCsv } from '../domain/shotview.ts'
import { MatchTrackerDb } from './db.ts'
import { Store } from './store.ts'

const base = { chargeGr: 30.2, bullet: 'Hybrid', bulletWeightGr: 108 }

describe('Store', () => {
  let store: Store

  beforeEach(async () => {
    const db = new MatchTrackerDb(`test-${crypto.randomUUID()}`)
    await db.open()
    store = new Store(db)
  })

  it('creates a load from charge and bullet alone', async () => {
    const load = await store.createLoad(base)
    expect(await store.getLoad(load.id)).toMatchObject({ chargeGr: 30.2 })
    expect((await store.latestLoad())?.id).toBe(load.id)
  })

  it('removes cleared fields on update', async () => {
    const load = await store.createLoad({ ...base, powder: 'Varget' })
    await store.updateLoad(load.id, { ...base, chargeGr: 30.4 })
    const saved = await store.getLoad(load.id)
    expect(saved?.chargeGr).toBe(30.4)
    expect(saved && 'powder' in saved).toBe(false)
    expect(saved?.createdAt).toBe(load.createdAt)
  })

  it('imports a ShotView session', async () => {
    const load = await store.createLoad(base)
    const result = await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    expect(result).toMatchObject({ outcome: 'imported', bulletWeightMismatchGr: undefined })
    const [string] = await store.listStrings(load.id)
    expect(string).toMatchObject({ firedOn: '2024-06-15T07:23', garminSdFps: 18.4 })
    expect(string.velocitiesFps).toHaveLength(5)
  })

  it('does not import the same session twice', async () => {
    const load = await store.createLoad(base)
    const session = parseShotViewCsv(fixture)
    await store.importShotViewSession(load.id, session)
    expect(await store.importShotViewSession(load.id, session)).toEqual({ outcome: 'duplicate' })
    expect(await store.listStrings(load.id)).toHaveLength(1)
  })

  it('flags a bullet weight that disagrees with the load', async () => {
    const load = await store.createLoad({ ...base, bulletWeightGr: 105 })
    const result = await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    expect(result).toMatchObject({ outcome: 'imported', bulletWeightMismatchGr: 108 })
    expect((await store.getLoad(load.id))?.bulletWeightGr).toBe(105)
  })

  it('soft-deletes a load together with its strings', async () => {
    const load = await store.createLoad(base)
    await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    await store.deleteLoad(load.id)
    expect(await store.listLoads()).toEqual([])
    expect(await store.getLoad(load.id)).toBeUndefined()
    expect(await store.listStrings()).toEqual([])
  })

  it('lists matches newest first and filters by load', async () => {
    const load = await store.createLoad(base)
    await store.createMatch({ name: 'Spring', startsOn: '2026-04-01', loadId: load.id })
    await store.createMatch({ name: 'Autumn', startsOn: '2026-10-01' })
    expect((await store.listMatches()).map((m) => m.name)).toEqual(['Autumn', 'Spring'])
    expect((await store.listMatches(load.id)).map((m) => m.name)).toEqual(['Spring'])
  })

  it('updates and deletes a match, removing cleared fields', async () => {
    const match = await store.createMatch({ name: 'Spring', startsOn: '2026-04-01', result: '70/100' })
    await store.updateMatch(match.id, { name: 'Spring PRS', startsOn: '2026-04-02' })
    const saved = await store.getMatch(match.id)
    expect(saved).toMatchObject({ name: 'Spring PRS', startsOn: '2026-04-02' })
    expect(saved && 'result' in saved).toBe(false)
    await store.deleteMatch(match.id)
    expect(await store.listMatches()).toEqual([])
  })

  it('keeps a match and its load label after the load is deleted', async () => {
    const load = await store.createLoad(base)
    await store.createMatch({ name: 'Spring', startsOn: '2026-04-01', loadId: load.id })
    await store.deleteLoad(load.id)
    expect(await store.listMatches()).toHaveLength(1)
    expect(await store.listLoads()).toEqual([])
    expect((await store.listLoads(true)).map((l) => l.id)).toEqual([load.id])
  })

  it('updates and deletes a string', async () => {
    const load = await store.createLoad(base)
    const result = await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    if (result.outcome !== 'imported') throw new Error('expected import')
    await store.updateString(result.string.id, { groupSizeIn: 0.42, distanceYd: 100 })
    expect((await store.listStrings(load.id))[0]).toMatchObject({ groupSizeIn: 0.42, distanceYd: 100 })
    await store.deleteString(result.string.id)
    expect(await store.listStrings(load.id)).toEqual([])
  })
})
