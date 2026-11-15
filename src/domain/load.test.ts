import { describe, expect, it } from 'vitest'
import { groupLoads, loadSummary, loadTitle, newLoadDraft } from './load.ts'
import type { Load } from './types.ts'

let n = 0
function load(fields: Partial<Load> & { chargeGr: number }): Load {
  n++
  const at = `2026-01-${String(n).padStart(2, '0')}T00:00:00.000Z`
  return { id: `id-${n}`, createdAt: at, updatedAt: at, bullet: 'Hybrid', bulletWeightGr: 108, ...fields }
}

describe('loadTitle', () => {
  it('uses charge and powder unless the load is named', () => {
    expect(loadTitle({ chargeGr: 30.2, powder: 'Varget' })).toBe('30.2 gr Varget')
    expect(loadTitle({ chargeGr: 30.2 })).toBe('30.2 gr')
    expect(loadTitle({ chargeGr: 30.2, powder: 'Varget', name: 'Match load' })).toBe('Match load')
  })
})

describe('loadSummary', () => {
  it('describes charge and bullet, with the name first when there is one', () => {
    expect(loadSummary(load({ chargeGr: 30.2, powder: 'Varget' }))).toBe('30.2 gr Varget · 108 gr Hybrid')
    expect(loadSummary(load({ chargeGr: 30.2, name: 'Match load' }))).toBe('Match load · 30.2 gr · 108 gr Hybrid')
  })
})

describe('newLoadDraft', () => {
  it('carries the recipe over but not the name or notes', () => {
    const previous = load({ chargeGr: 30.2, powder: 'Varget', bulletWeightGr: 108, name: 'A', notes: 'n', loadedOn: '2026-01-01' })
    expect(newLoadDraft(previous, '2026-02-02')).toEqual({
      chargeGr: 30.2,
      bullet: 'Hybrid',
      bulletWeightGr: 108,
      powder: 'Varget',
      rifle: undefined,
      brass: undefined,
      primer: undefined,
      cbtoIn: undefined,
      loadedOn: '2026-02-02',
    })
  })

  it('starts empty with no previous load', () => {
    expect(newLoadDraft(undefined, '2026-02-02')).toMatchObject({ chargeGr: 0, bullet: '', bulletWeightGr: 0, loadedOn: '2026-02-02' })
  })
})

describe('groupLoads', () => {
  it('groups by rifle, bullet and powder, ignoring case, sorted by charge', () => {
    const groups = groupLoads([
      load({ chargeGr: 30.4, powder: 'Varget', bulletWeightGr: 108, rifle: '6 Dasher' }),
      load({ chargeGr: 30.0, powder: 'varget ', bulletWeightGr: 108, rifle: '6 dasher' }),
      load({ chargeGr: 41.5, powder: 'H4350', bulletWeightGr: 140, bullet: 'ELD-M' }),
      load({ chargeGr: 30.2, powder: 'Varget', bulletWeightGr: 105, rifle: '6 Dasher' }),
    ])
    expect(groups.map((g) => g.heading)).toEqual([
      '6 Dasher · 105 gr Hybrid · Varget',
      '140 gr ELD-M · H4350',
      '6 Dasher · 108 gr Hybrid · Varget',
    ])
    expect(groups[2].loads.map((l) => l.chargeGr)).toEqual([30.0, 30.4])
  })
})
