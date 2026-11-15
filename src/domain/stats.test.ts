import { describe, expect, it } from 'vitest'
import { pooledVelocityStats, velocityStats } from './stats.ts'

describe('velocityStats', () => {
  it('returns undefined for an empty string', () => {
    expect(velocityStats([])).toBeUndefined()
  })

  it('computes average, sample SD and ES', () => {
    const stats = velocityStats([2800, 2810, 2790, 2805, 2795])!
    expect(stats.count).toBe(5)
    expect(stats.averageFps).toBe(2800)
    expect(stats.sdFps).toBeCloseTo(7.906, 3)
    expect(stats.esFps).toBe(20)
  })

  it('reports zero SD for a single shot', () => {
    expect(velocityStats([2800])).toMatchObject({ sdFps: 0, esFps: 0 })
  })
})

describe('pooledVelocityStats', () => {
  it('returns undefined when there are no shots', () => {
    expect(pooledVelocityStats([])).toBeUndefined()
    expect(pooledVelocityStats([[], []])).toBeUndefined()
  })

  it('matches velocityStats for a single string', () => {
    const shots = [2800, 2810, 2790, 2805, 2795]
    const pooled = pooledVelocityStats([shots])!
    expect(pooled.sdFps).toBeCloseTo(velocityStats(shots)!.sdFps, 10)
    expect(pooled).toMatchObject({ count: 5, stringCount: 1, averageFps: 2800 })
  })

  it('ignores a shift in average between strings', () => {
    const cool = [2800, 2810, 2790, 2805, 2795]
    const warm = cool.map((v) => v + 30)
    const pooled = pooledVelocityStats([cool, warm])!
    expect(pooled.sdFps).toBeCloseTo(7.906, 3)
    expect(pooled).toMatchObject({ count: 10, stringCount: 2, averageFps: 2815 })
    // Lumping the shots together would report the shift as inconsistency.
    expect(velocityStats([...cool, ...warm])!.sdFps).toBeGreaterThan(17)
  })

  it('weights strings by degrees of freedom', () => {
    const pooled = pooledVelocityStats([[2800, 2810], [2800, 2804, 2808], [2790]])!
    // (50 + 32 + 0) / (1 + 2 + 0)
    expect(pooled.sdFps).toBeCloseTo(Math.sqrt(82 / 3), 10)
    expect(pooled.count).toBe(6)
  })

  it('has no SD when every string is a single shot', () => {
    expect(pooledVelocityStats([[2800], [2810]])!.sdFps).toBeUndefined()
  })
})
