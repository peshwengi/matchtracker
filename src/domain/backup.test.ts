import { describe, expect, it } from 'vitest'
import { backupFileName, BackupParseError, parseBackup, type Backup } from './backup.ts'

const at = '2026-11-15T19:40:00.000Z'
const entity = { createdAt: at, updatedAt: at }
const backup: Backup = {
  app: 'matchtracker',
  formatVersion: 1,
  exportedAt: at,
  loads: [{ id: 'l', ...entity, chargeGr: 30.2, bullet: 'Hybrid', bulletWeightGr: 108 }],
  rangeStrings: [{ id: 's', ...entity, loadId: 'l', firedOn: '2026-11-01', velocitiesFps: [2800, 2810] }],
  matches: [{ id: 'm', ...entity, name: 'Club PRS', startsOn: '2026-11-07', loadId: 'l' }],
}

describe('parseBackup', () => {
  it('round-trips a backup', () => {
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  it('accepts empty lists', () => {
    const empty = { ...backup, loads: [], rangeStrings: [], matches: [] }
    expect(parseBackup(JSON.stringify(empty))).toEqual(empty)
  })

  it.each([
    ['not JSON', 'hello'],
    ['another app', JSON.stringify({ ...backup, app: 'other' })],
    ['a bare array', '[]'],
    ['a missing list', JSON.stringify({ ...backup, matches: undefined })],
    ['a load with no charge', JSON.stringify({ ...backup, loads: [{ id: 'l', ...entity, bullet: 'x', bulletWeightGr: 1 }] })],
    ['a record with no id', JSON.stringify({ ...backup, matches: [{ ...entity, name: 'x', startsOn: '2026-01-01' }] })],
    ['non-numeric velocities', JSON.stringify({ ...backup, rangeStrings: [{ ...backup.rangeStrings[0], velocitiesFps: ['a'] }] })],
  ])('rejects %s', (_, text) => {
    expect(() => parseBackup(text)).toThrow(BackupParseError)
  })

  it('rejects a backup from a newer version with an explanation', () => {
    expect(() => parseBackup(JSON.stringify({ ...backup, formatVersion: 2 }))).toThrow(/newer version/)
  })
})

describe('backupFileName', () => {
  it('is dated and safe for a file system', () => {
    expect(backupFileName(at)).toBe('matchtracker-backup-2026-11-15-19-40.json')
  })
})
