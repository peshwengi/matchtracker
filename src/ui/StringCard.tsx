import { useState, type FormEvent } from 'react'
import { store } from '../data/store.ts'
import { velocityStats } from '../domain/stats.ts'
import type { RangeString } from '../domain/types.ts'
import { fmt, fmtDate } from './format.ts'

const optionalNumber = (value: string) => {
  const n = Number(value.trim().replace(',', '.'))
  return value.trim() !== '' && Number.isFinite(n) ? n : undefined
}

export function StringCard({ string }: { string: RangeString }) {
  const [editing, setEditing] = useState(false)
  const [group, setGroup] = useState(String(string.groupSizeIn ?? ''))
  const [distance, setDistance] = useState(String(string.distanceYd ?? ''))
  const [notes, setNotes] = useState(string.notes ?? '')
  const stats = velocityStats(string.velocitiesFps)

  async function save(e: FormEvent) {
    e.preventDefault()
    await store.updateString(string.id, {
      groupSizeIn: optionalNumber(group),
      distanceYd: optionalNumber(distance),
      notes: notes.trim() || undefined,
    })
    setEditing(false)
  }

  async function remove() {
    if (!window.confirm('Delete this session?')) return
    await store.deleteString(string.id)
  }

  const target = [
    string.groupSizeIn === undefined ? '' : `${string.groupSizeIn} in group`,
    string.distanceYd === undefined ? '' : `at ${string.distanceYd} yd`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="card">
      <div className="bar">
        <h2>{fmtDate(string.firedOn)}</h2>
        {!editing && (
          <button className="link" onClick={() => setEditing(true)}>
            {target || string.notes ? 'Edit' : 'Add group or note'}
          </button>
        )}
      </div>
      {stats && (
        <>
          <div className="stats">
            <div>
              <strong>{fmt(stats.averageFps)}</strong>
              <span>avg fps</span>
            </div>
            <div>
              <strong>{fmt(stats.sdFps, 1)}</strong>
              <span>SD fps</span>
            </div>
            <div>
              <strong>{fmt(stats.esFps, 1)}</strong>
              <span>spread fps</span>
            </div>
            <div>
              <strong>{stats.count}</strong>
              <span>{stats.count === 1 ? 'shot' : 'shots'}</span>
            </div>
          </div>
          <p className="shots">{string.velocitiesFps.map((v) => fmt(v)).join('  ')}</p>
          {string.garminSdFps !== undefined && (
            <p className="hint">ShotView shows SD {fmt(string.garminSdFps, 1)}; it uses a different formula.</p>
          )}
        </>
      )}

      {editing ? (
        <form className="form" onSubmit={save}>
          <div className="pair">
            <label>
              Group size (in)
              <input inputMode="decimal" value={group} onChange={(e) => setGroup(e.target.value)} />
            </label>
            <label>
              Distance (yd)
              <input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </label>
          </div>
          <label>
            Notes
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="pair">
            <button className="primary" type="submit">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          <button type="button" className="danger" onClick={remove}>
            Delete session
          </button>
        </form>
      ) : (
        <>
          {target && <p>{target}</p>}
          {string.notes && <p className="notes">{string.notes}</p>}
        </>
      )}
    </section>
  )
}
