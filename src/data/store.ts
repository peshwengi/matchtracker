import type { LoadDraft } from '../domain/load.ts'
import type { ShotViewSession } from '../domain/shotview.ts'
import type { Entity, Load, RangeString } from '../domain/types.ts'
import { db as defaultDb, type MatchTrackerDb } from './db.ts'
import { newEntity, touch } from './entity.ts'

export type RangeStringDraft = Omit<RangeString, keyof Entity>

const live = <T extends Entity>(records: T[]) => records.filter((r) => !r.deletedAt)

export function localDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** All reads and writes go through a Store so screens never touch Dexie. */
export class Store {
  private db: MatchTrackerDb

  constructor(db: MatchTrackerDb = defaultDb) {
    this.db = db
  }

  async listLoads(): Promise<Load[]> {
    return live(await this.db.loads.toArray())
  }

  async getLoad(id: string): Promise<Load | undefined> {
    const load = await this.db.loads.get(id)
    return load && !load.deletedAt ? load : undefined
  }

  /** The load created most recently, used to prefill the next one. */
  async latestLoad(): Promise<Load | undefined> {
    const loads = await this.listLoads()
    return loads.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  }

  async createLoad(draft: LoadDraft): Promise<Load> {
    const load = newEntity<Load>(draft)
    await this.db.loads.add(load)
    return load
  }

  async updateLoad(id: string, draft: LoadDraft): Promise<void> {
    const load = await this.getLoad(id)
    if (!load) throw new Error('Load not found')
    // Spread the draft over a bare entity so cleared fields are really removed.
    const { createdAt, deletedAt } = load
    await this.db.loads.put({ ...draft, id, createdAt, deletedAt, updatedAt: new Date().toISOString() })
  }

  /** Soft-delete a load and its strings. */
  async deleteLoad(id: string): Promise<void> {
    const deletedAt = new Date().toISOString()
    await this.db.transaction('rw', this.db.loads, this.db.rangeStrings, async () => {
      await this.db.loads.update(id, { deletedAt, updatedAt: deletedAt })
      await this.db.rangeStrings.where('loadId').equals(id).modify({ deletedAt, updatedAt: deletedAt })
    })
  }

  async listStrings(loadId?: string): Promise<RangeString[]> {
    const strings = loadId
      ? await this.db.rangeStrings.where('loadId').equals(loadId).toArray()
      : await this.db.rangeStrings.toArray()
    return live(strings).sort((a, b) => a.firedOn.localeCompare(b.firedOn))
  }

  async updateString(id: string, changes: Partial<RangeStringDraft>): Promise<void> {
    const string = await this.db.rangeStrings.get(id)
    if (!string) throw new Error('String not found')
    await this.db.rangeStrings.put(touch(string, changes))
  }

  async deleteString(id: string): Promise<void> {
    const deletedAt = new Date().toISOString()
    await this.db.rangeStrings.update(id, { deletedAt, updatedAt: deletedAt })
  }

  /**
   * Attach an imported ShotView session to a load. Importing the same session
   * twice is a no-op. Fills in the load's bullet weight if it has none.
   */
  async importShotViewSession(loadId: string, session: ShotViewSession): Promise<ImportResult> {
    const load = await this.getLoad(loadId)
    if (!load) throw new Error('Load not found')
    if (session.shots.length === 0) return { outcome: 'empty' }

    const firedOn = session.startedAt ?? localDate()
    const velocitiesFps = session.shots.map((s) => s.velocityFps)
    const existing = await this.listStrings(loadId)
    const same = (s: RangeString) =>
      s.firedOn === firedOn &&
      s.velocitiesFps.length === velocitiesFps.length &&
      s.velocitiesFps.every((v, i) => v === velocitiesFps[i])
    if (existing.some(same)) return { outcome: 'duplicate' }

    const shotNotes = session.shots.filter((s) => s.note).map((s) => `Shot ${s.number}: ${s.note}`)
    const notes = [session.sessionNote, ...shotNotes].filter(Boolean).join('\n') || undefined
    const string = newEntity<RangeString>({
      loadId,
      firedOn,
      velocitiesFps,
      notes,
      garminSdFps: session.reported.sdFps,
    })
    await this.db.rangeStrings.add(string)

    const weight = session.projectileWeightGr
    if (weight !== undefined && load.bulletWeightGr === undefined) {
      await this.db.loads.put(touch(load, { bulletWeightGr: weight }))
    }
    const mismatch = weight !== undefined && load.bulletWeightGr !== undefined && weight !== load.bulletWeightGr
    return { outcome: 'imported', string, bulletWeightMismatchGr: mismatch ? weight : undefined }
  }
}

export type ImportResult =
  | { outcome: 'empty' }
  | { outcome: 'duplicate' }
  | { outcome: 'imported'; string: RangeString; bulletWeightMismatchGr?: number }

export const store = new Store()
