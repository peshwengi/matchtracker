import type { Entity } from '../domain/types.ts'

type Draft<T extends Entity> = Omit<T, keyof Entity>

/** Stamp a new record with an id and timestamps. */
export function newEntity<T extends Entity>(draft: Draft<T>): T {
  const now = new Date().toISOString()
  return { ...draft, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as T
}

/** Apply changes to an existing record and bump updatedAt. */
export function touch<T extends Entity>(entity: T, changes: Partial<Draft<T>>): T {
  return { ...entity, ...changes, updatedAt: new Date().toISOString() }
}
