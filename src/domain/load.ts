import type { Entity, Load } from './types.ts'

export type LoadDraft = Omit<Load, keyof Entity>

export function bulletLabel(load: Pick<Load, 'bullet' | 'bulletWeightGr'>): string {
  return `${load.bulletWeightGr} gr ${load.bullet}`.trim()
}

export function loadTitle(load: Pick<Load, 'name' | 'chargeGr' | 'powder'>): string {
  return load.name || [`${load.chargeGr} gr`, load.powder ?? ''].filter(Boolean).join(' ')
}

/**
 * Starting values for a new load. The owner's process rarely changes between
 * batches, so everything but the per-batch fields carries over from `from`.
 */
export function newLoadDraft(from: Load | undefined, today: string): LoadDraft {
  return {
    chargeGr: from?.chargeGr ?? 0,
    bullet: from?.bullet ?? '',
    bulletWeightGr: from?.bulletWeightGr ?? 0,
    powder: from?.powder,
    rifle: from?.rifle,
    brass: from?.brass,
    primer: from?.primer,
    cbtoIn: from?.cbtoIn,
    loadedOn: today,
  }
}

export interface LoadGroup {
  key: string
  heading: string
  loads: Load[]
}

const norm = (text: string | undefined) => (text ?? '').trim().toLowerCase()

/**
 * Group loads that share rifle, bullet and powder, so loads differing only in
 * charge sit together for comparison. Within a group loads run by charge;
 * groups run most recently touched first.
 */
export function groupLoads(loads: Load[]): LoadGroup[] {
  const groups = new Map<string, LoadGroup>()
  for (const load of loads) {
    const key = [norm(load.rifle), load.bulletWeightGr, norm(load.bullet), norm(load.powder)].join('|')
    let group = groups.get(key)
    if (!group) {
      const heading = [load.rifle?.trim(), bulletLabel(load), load.powder?.trim()].filter(Boolean).join(' · ')
      group = { key, heading, loads: [] }
      groups.set(key, group)
    }
    group.loads.push(load)
  }
  const newest = (g: LoadGroup) => g.loads.reduce((max, l) => (l.createdAt > max ? l.createdAt : max), '')
  const result = [...groups.values()]
  for (const group of result) {
    group.loads.sort((a, b) => a.chargeGr - b.chargeGr || a.createdAt.localeCompare(b.createdAt))
  }
  return result.sort((a, b) => newest(b).localeCompare(newest(a)))
}
