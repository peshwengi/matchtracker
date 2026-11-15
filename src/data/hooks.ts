import { useLiveQuery } from 'dexie-react-hooks'
import type { Load, Match, RangeString } from '../domain/types.ts'
import type { Backup } from '../domain/backup.ts'
import { store, type BackupStatus } from './store.ts'

// Live queries: components re-render when the underlying records change.
// `undefined` means still loading.

export function useLoads(includeDeleted = false): Load[] | undefined {
  return useLiveQuery(() => store.listLoads(includeDeleted), [includeDeleted])
}

/** `null` means the load does not exist. */
export function useLoad(id: string): Load | null | undefined {
  return useLiveQuery(async () => (await store.getLoad(id)) ?? null, [id])
}

export function useStrings(loadId?: string): RangeString[] | undefined {
  return useLiveQuery(() => store.listStrings(loadId), [loadId])
}

export function useMatches(loadId?: string): Match[] | undefined {
  return useLiveQuery(() => store.listMatches(loadId), [loadId])
}

export function useBackupStatus(): BackupStatus | undefined {
  return useLiveQuery(() => store.backupStatus(), [])
}

/** A current snapshot kept ready, so sharing it can start inside the tap that asks for it. */
export function useBackupSnapshot(): Backup | undefined {
  return useLiveQuery(() => store.exportBackup(), [])
}
