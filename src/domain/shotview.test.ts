import { describe, expect, it } from 'vitest'
import fixture from './fixtures/shotview-session.csv?raw'
import { parseShotViewCsv, ShotViewParseError } from './shotview.ts'
import { velocityStats } from './stats.ts'

describe('parseShotViewCsv', () => {
  const session = parseShotViewCsv(fixture)

  it('reads the title, date and projectile weight', () => {
    expect(session.title).toBe('Rifle session started at 07:23')
    expect(session.rawDate).toBe('June 15, 2024 at 07:23')
    expect(session.startedAt).toBe('2024-06-15T07:23')
    expect(session.projectileWeightGr).toBe(108)
    expect(session.sessionNote).toBeUndefined()
  })

  it('reads every shot', () => {
    expect(session.shots.map((s) => s.velocityFps)).toEqual([2747.7, 2778.2, 2798.8, 2783.3, 2797.1])
    expect(session.shots[0]).toEqual({
      number: 1,
      velocityFps: 2747.7,
      time: '07:30:23',
      cleanBore: false,
      coldBore: false,
      note: undefined,
    })
  })

  it('reads the statistics Garmin reported', () => {
    expect(session.reported).toEqual({ averageFps: 2781, sdFps: 18.4, esFps: 51.1 })
  })

  it('agrees with our own average and spread, but not SD (Garmin divides by n)', () => {
    const stats = velocityStats(session.shots.map((s) => s.velocityFps))!
    expect(stats.averageFps).toBeCloseTo(2781.0, 1)
    expect(stats.esFps).toBeCloseTo(51.1, 1)
    expect(stats.sdFps).toBeCloseTo(20.6, 1)
    expect(stats.sdFps * Math.sqrt(4 / 5)).toBeCloseTo(session.reported.sdFps!, 1)
  })

  it('converts metric speeds to fps', () => {
    const metric = parseShotViewCsv('"t"\n#,SPEED (M/S),TIME\n1, 850.0, 07:00:00\n')
    expect(metric.shots[0].velocityFps).toBeCloseTo(2788.7, 1)
  })

  it('handles 12-hour dates and quoted notes containing commas', () => {
    const s = parseShotViewCsv(
      '"t"\n#,SPEED (FPS),TIME,CLEAN BORE,COLD BORE,SHOT NOTES\n1, 2800.0, 07:00:00, , , "flier, pulled"\n' +
        'DATE, "June 5, 2024 at 1:05 PM",,\n',
    )
    expect(s.shots[0].note).toBe('flier, pulled')
    expect(s.startedAt).toBe('2024-06-05T13:05')
  })

  it('rejects a file with no shot table', () => {
    expect(() => parseShotViewCsv('name,value\na,1\n')).toThrow(ShotViewParseError)
  })
})
