import type { Load, Match, RangeString } from './types.ts'

// A backup is one JSON file holding every record, including soft-deleted ones.
// Bump BACKUP_FORMAT_VERSION only for a change older code could not read, and
// keep parseBackup able to read every earlier version.

export const BACKUP_FORMAT_VERSION = 1

export interface Backup {
  app: 'matchtracker'
  formatVersion: number
  exportedAt: string
  loads: Load[]
  rangeStrings: RangeString[]
  matches: Match[]
}

export class BackupParseError extends Error {}

export function backupFileName(exportedAt: string): string {
  return `matchtracker-backup-${exportedAt.slice(0, 16).replace(/[:T]/g, '-')}.json`
}

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string' && value !== ''
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function records(file: Json, key: string, valid: (record: Json) => boolean): Json[] {
  const list = file[key]
  if (!Array.isArray(list)) throw new BackupParseError(`The backup has no ${key} list`)
  for (const record of list) {
    const ok =
      isObject(record) && isString(record.id) && isString(record.createdAt) && isString(record.updatedAt) && valid(record)
    if (!ok) throw new BackupParseError(`The backup contains a damaged record in ${key}`)
  }
  return list as Json[]
}

export function parseBackup(text: string): Backup {
  let file: unknown
  try {
    file = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    throw new BackupParseError('This is not a MatchTracker backup file')
  }
  if (!isObject(file) || file.app !== 'matchtracker' || !isNumber(file.formatVersion)) {
    throw new BackupParseError('This is not a MatchTracker backup file')
  }
  if (file.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupParseError('This backup was made by a newer version of MatchTracker. Update the app and try again')
  }
  return {
    app: 'matchtracker',
    formatVersion: file.formatVersion,
    exportedAt: isString(file.exportedAt) ? file.exportedAt : '',
    loads: records(file, 'loads', (r) => isNumber(r.chargeGr) && isNumber(r.bulletWeightGr) && typeof r.bullet === 'string') as unknown as Load[],
    rangeStrings: records(
      file,
      'rangeStrings',
      (r) => isString(r.loadId) && isString(r.firedOn) && Array.isArray(r.velocitiesFps) && r.velocitiesFps.every(isNumber),
    ) as unknown as RangeString[],
    matches: records(file, 'matches', (r) => isString(r.name) && isString(r.startsOn)) as unknown as Match[],
  }
}
