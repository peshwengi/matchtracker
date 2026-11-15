import { BACKUP_FORMAT_VERSION, type Backup } from '../domain/backup.ts'
import type { LoadDraft } from '../domain/load.ts'
import type { ShotViewSession } from '../domain/shotview.ts'
import type { Entity, Load, Match, RangeString } from '../domain/types.ts'
import type { EntityTable } from 'dexie'
import { db as defaultDb, type MatchTrackerDb } from './db.ts'
import { newEntity, touch } from './entity.ts'

export type RangeStringDraft = Omit<RangeString, keyof Entity>
export type MatchDraft = Omit<Match, keyof Entity>

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

  /** `includeDeleted` is for labelling old matches whose load has since been deleted. */
  async listLoads(includeDeleted = false): Promise<Load[]> {
    const loads = await this.db.loads.toArray()
    return includeDeleted ? loads : live(loads)
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

  /** Soft-delete a load and its strings. Matches keep pointing at it as history. */
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

  /** Newest first. */
  async listMatches(loadId?: string): Promise<Match[]> {
    const matches = loadId
      ? await this.db.matches.where('loadId').equals(loadId).toArray()
      : await this.db.matches.toArray()
    return live(matches).sort((a, b) => b.startsOn.localeCompare(a.startsOn) || b.createdAt.localeCompare(a.createdAt))
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const match = await this.db.matches.get(id)
    return match && !match.deletedAt ? match : undefined
  }

  async createMatch(draft: MatchDraft): Promise<Match> {
    const match = newEntity<Match>(draft)
    await this.db.matches.add(match)
    return match
  }

  async updateMatch(id: string, draft: MatchDraft): Promise<void> {
    const match = await this.getMatch(id)
    if (!match) throw new Error('Match not found')
    const { createdAt, deletedAt } = match
    await this.db.matches.put({ ...draft, id, createdAt, deletedAt, updatedAt: new Date().toISOString() })
  }

  async deleteMatch(id: string): Promise<void> {
    const deletedAt = new Date().toISOString()
    await this.db.matches.update(id, { deletedAt, updatedAt: deletedAt })
  }

  /** Everything on this device, including soft-deleted records. */
  async exportBackup(): Promise<Backup> {
    const [loads, rangeStrings, matches] = await Promise.all([
      this.db.loads.toArray(),
      this.db.rangeStrings.toArray(),
      this.db.matches.toArray(),
    ])
    return {
      app: 'matchtracker',
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      loads,
      rangeStrings,
      matches,
    }
  }

  /**
   * Merge a backup into this device. Nothing is removed: a record missing here
   * is added, and one present in both keeps whichever copy was updated last.
   */
  async restoreBackup(backup: Backup): Promise<RestoreResult> {
    const result: RestoreResult = { added: 0, updated: 0, unchanged: 0 }
    const merge = async <T extends Entity>(table: EntityTable<T, 'id'>, incoming: T[]) => {
      const existing = new Map((await table.toArray()).map((r) => [r.id, r]))
      const toWrite: T[] = []
      for (const record of incoming) {
        const current = existing.get(record.id)
        if (!current) result.added++
        else if (record.updatedAt > current.updatedAt) result.updated++
        else {
          result.unchanged++
          continue
        }
        toWrite.push(record)
      }
      await table.bulkPut(toWrite)
    }
    await this.db.transaction('rw', this.db.loads, this.db.rangeStrings, this.db.matches, async () => {
      await merge(this.db.loads, backup.loads)
      await merge(this.db.rangeStrings, backup.rangeStrings)
      await merge(this.db.matches, backup.matches)
    })
    return result
  }

  /** Record that `backup` was saved, so later changes can be counted against it. */
  async markBackedUp(backup: Backup): Promise<void> {
    await this.db.meta.put({ key: 'lastBackupAt', value: backup.exportedAt })
  }

  async backupStatus(): Promise<BackupStatus> {
    const lastBackupAt = (await this.db.meta.get('lastBackupAt'))?.value
    const all: Entity[] = [
      ...(await this.db.loads.toArray()),
      ...(await this.db.rangeStrings.toArray()),
      ...(await this.db.matches.toArray()),
    ]
    const changed = lastBackupAt ? all.filter((r) => r.updatedAt > lastBackupAt).length : all.length
    return { lastBackupAt, total: all.length, changed }
  }

  /**
   * Attach an imported ShotView session to a load. Importing the same session
   * twice is a no-op. Reports a bullet weight that disagrees with the load.
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
    const mismatch = weight !== undefined && weight !== load.bulletWeightGr
    return { outcome: 'imported', string, bulletWeightMismatchGr: mismatch ? weight : undefined }
  }
}

export interface BackupStatus {
  /** When the last backup was taken on this device, if ever. */
  lastBackupAt?: string
  /** Records that exist, including deleted ones. */
  total: number
  /** Records added, changed or deleted since the last backup. */
  changed: number
}

export interface RestoreResult {
  added: number
  updated: number
  unchanged: number
}

export type ImportResult =
  | { outcome: 'empty' }
  | { outcome: 'duplicate' }
  | { outcome: 'imported'; string: RangeString; bulletWeightMismatchGr?: number }

export const store = new Store()
