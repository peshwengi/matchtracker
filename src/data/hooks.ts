import { useLiveQuery } from 'dexie-react-hooks'
import type { Load, RangeString } from '../domain/types.ts'
import { store } from './store.ts'

// Live queries: components re-render when the underlying records change.
// `undefined` means still loading.

export function useLoads(): Load[] | undefined {
  return useLiveQuery(() => store.listLoads(), [])
}

/** `null` means the load does not exist. */
export function useLoad(id: string): Load | null | undefined {
  return useLiveQuery(async () => (await store.getLoad(id)) ?? null, [id])
}

export function useStrings(loadId?: string): RangeString[] | undefined {
  return useLiveQuery(() => store.listStrings(loadId), [loadId])
}
