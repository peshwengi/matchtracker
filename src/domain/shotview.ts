// Parser for the session CSV exported by Garmin's ShotView app (Xero chronographs).
//
// The file is not a regular table. It has a quoted title line, a shot table,
// a block of "LABEL,value" summary rows, and a date row, separated by "-" rows.
// See fixtures/shotview-session.csv for a real export.

const FPS_PER_MPS = 3.28084
const GRAINS_PER_GRAM = 15.4324

export interface ShotViewShot {
  number: number
  velocityFps: number
  /** Time of day as exported, e.g. "07:30:23". */
  time?: string
  cleanBore: boolean
  coldBore: boolean
  note?: string
}

export interface ShotViewSession {
  title: string
  /** Local date and time, "YYYY-MM-DDTHH:mm". The export carries no time zone. */
  startedAt?: string
  /** The date exactly as exported, kept in case startedAt could not be parsed. */
  rawDate?: string
  shots: ShotViewShot[]
  /**
   * Statistics as Garmin calculated them. Garmin's STD DEV is the population
   * SD (divides by n), so it is smaller than velocityStats().sdFps.
   */
  reported: {
    averageFps?: number
    sdFps?: number
    esFps?: number
  }
  projectileWeightGr?: number
  sessionNote?: string
}

export class ShotViewParseError extends Error {}

/** Split one CSV line. Tolerates spaces before an opening quote, which ShotView emits. */
function splitLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell.trim() === '') {
      cell = ''
      quoted = true
    } else if (ch === ',') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell.trim())
  return cells
}

function toNumber(text: string | undefined): number | undefined {
  if (text === undefined || text === '') return undefined
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/** Parse "June 15, 2024 at 07:23" (optionally with AM/PM) to "2024-06-15T07:23". */
function parseDate(raw: string): string | undefined {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec(raw.trim())
  if (!m) return undefined
  const month = MONTHS.indexOf(m[1].toLowerCase())
  if (month < 0) return undefined
  let hour = Number(m[4])
  const meridiem = m[6]?.toUpperCase()
  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${m[3]}-${pad(month + 1)}-${pad(Number(m[2]))}T${pad(hour)}:${m[5]}`
}

/** Factor that converts a column's values to fps, read from a header like "SPEED (FPS)". */
function speedFactor(header: string): number {
  const unit = /\(([^)]*)\)/.exec(header)?.[1].toUpperCase().replace(/\s/g, '')
  if (unit === 'FPS' || unit === 'FT/S') return 1
  if (unit === 'MPS' || unit === 'M/S') return FPS_PER_MPS
  throw new ShotViewParseError(`Unrecognised speed unit in column "${header}"`)
}

export function parseShotViewCsv(text: string): ShotViewSession {
  const lines = text
    .replace(/﻿/g, '')
    .split(/\r?\n/)
    .map(splitLine)
    .filter((cells) => cells.some((c) => c !== ''))

  const headerIndex = lines.findIndex((cells) => cells[0] === '#')
  if (headerIndex < 0) {
    throw new ShotViewParseError('Not a ShotView session export: no shot table found')
  }
  const header = lines[headerIndex].map((h) => h.toUpperCase())
  const column = (prefix: string) => header.findIndex((h) => h.startsWith(prefix))
  const speedCol = column('SPEED')
  if (speedCol < 0) throw new ShotViewParseError('Shot table has no SPEED column')
  const toFps = speedFactor(header[speedCol])
  const timeCol = column('TIME')
  const cleanCol = column('CLEAN BORE')
  const coldCol = column('COLD BORE')
  const noteCol = column('SHOT NOTES')

  const session: ShotViewSession = {
    title: headerIndex > 0 ? lines[0][0] : '',
    shots: [],
    reported: {},
  }

  let i = headerIndex + 1
  for (; i < lines.length && /^\d+$/.test(lines[i][0]); i++) {
    const cells = lines[i]
    const speed = toNumber(cells[speedCol])
    if (speed === undefined) {
      throw new ShotViewParseError(`Shot ${cells[0]} has no readable speed`)
    }
    session.shots.push({
      number: Number(cells[0]),
      velocityFps: speed * toFps,
      time: cells[timeCol] || undefined,
      cleanBore: Boolean(cells[cleanCol]),
      coldBore: Boolean(cells[coldCol]),
      note: cells[noteCol] || undefined,
    })
  }

  for (; i < lines.length; i++) {
    const [label, value] = lines[i]
    const key = label.toUpperCase()
    if (key === 'AVERAGE SPEED') session.reported.averageFps = scale(toNumber(value), toFps)
    else if (key === 'STD DEV') session.reported.sdFps = scale(toNumber(value), toFps)
    else if (key === 'SPREAD') session.reported.esFps = scale(toNumber(value), toFps)
    else if (key.startsWith('PROJECTILE WEIGHT')) {
      const grams = /\(GRAMS?\)/.test(key)
      session.projectileWeightGr = scale(toNumber(value), grams ? GRAINS_PER_GRAM : 1)
    } else if (key === 'SESSION NOTE') session.sessionNote = value || undefined
    else if (key === 'DATE' && value) {
      session.rawDate = value
      session.startedAt = parseDate(value)
    }
  }

  return session
}

function scale(value: number | undefined, factor: number): number | undefined {
  return value === undefined ? undefined : value * factor
}
