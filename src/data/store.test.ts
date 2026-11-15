import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import fixture from '../domain/fixtures/shotview-session.csv?raw'
import { parseShotViewCsv } from '../domain/shotview.ts'
import { MatchTrackerDb } from './db.ts'
import { Store } from './store.ts'

describe('Store', () => {
  let store: Store

  beforeEach(async () => {
    const db = new MatchTrackerDb(`test-${crypto.randomUUID()}`)
    await db.open()
    store = new Store(db)
  })

  it('creates a load from a charge weight alone', async () => {
    const load = await store.createLoad({ chargeGr: 30.2 })
    expect(await store.getLoad(load.id)).toMatchObject({ chargeGr: 30.2 })
    expect((await store.latestLoad())?.id).toBe(load.id)
  })

  it('removes cleared fields on update', async () => {
    const load = await store.createLoad({ chargeGr: 30.2, powder: 'Varget' })
    await store.updateLoad(load.id, { chargeGr: 30.4 })
    const saved = await store.getLoad(load.id)
    expect(saved?.chargeGr).toBe(30.4)
    expect(saved && 'powder' in saved).toBe(false)
    expect(saved?.createdAt).toBe(load.createdAt)
  })

  it('imports a ShotView session and fills in bullet weight', async () => {
    const load = await store.createLoad({ chargeGr: 30.2 })
    const result = await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    expect(result.outcome).toBe('imported')
    const [string] = await store.listStrings(load.id)
    expect(string).toMatchObject({ firedOn: '2024-06-15T07:23', garminSdFps: 18.4 })
    expect(string.velocitiesFps).toHaveLength(5)
    expect((await store.getLoad(load.id))?.bulletWeightGr).toBe(108)
  })

  it('does not import the same session twice', async () => {
    const load = await store.createLoad({ chargeGr: 30.2 })
    const session = parseShotViewCsv(fixture)
    await store.importShotViewSession(load.id, session)
    expect(await store.importShotViewSession(load.id, session)).toEqual({ outcome: 'duplicate' })
    expect(await store.listStrings(load.id)).toHaveLength(1)
  })

  it('flags a bullet weight that disagrees with the load', async () => {
    const load = await store.createLoad({ chargeGr: 30.2, bulletWeightGr: 105 })
    const result = await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    expect(result).toMatchObject({ outcome: 'imported', bulletWeightMismatchGr: 108 })
    expect((await store.getLoad(load.id))?.bulletWeightGr).toBe(105)
  })

  it('soft-deletes a load together with its strings', async () => {
    const load = await store.createLoad({ chargeGr: 30.2 })
    await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    await store.deleteLoad(load.id)
    expect(await store.listLoads()).toEqual([])
    expect(await store.getLoad(load.id)).toBeUndefined()
    expect(await store.listStrings()).toEqual([])
  })

  it('updates and deletes a string', async () => {
    const load = await store.createLoad({ chargeGr: 30.2 })
    const result = await store.importShotViewSession(load.id, parseShotViewCsv(fixture))
    if (result.outcome !== 'imported') throw new Error('expected import')
    await store.updateString(result.string.id, { groupSizeIn: 0.42, distanceYd: 100 })
    expect((await store.listStrings(load.id))[0]).toMatchObject({ groupSizeIn: 0.42, distanceYd: 100 })
    await store.deleteString(result.string.id)
    expect(await store.listStrings(load.id)).toEqual([])
  })
})
