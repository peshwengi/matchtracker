import { describe, expect, it } from 'vitest'
import { velocityStats } from './stats.ts'

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
