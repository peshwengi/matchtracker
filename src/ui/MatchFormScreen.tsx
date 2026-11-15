import { useEffect, useState, type FormEvent } from 'react'
import { useLoads } from '../data/hooks.ts'
import { localDate, store, type MatchDraft } from '../data/store.ts'
import { loadSummary } from '../domain/load.ts'
import type { Navigate } from './nav.ts'

type Fields = Record<'name' | 'startsOn' | 'loadId' | 'location' | 'result' | 'notes', string>

export function MatchFormScreen({ id, loadId, navigate }: { id?: string; loadId?: string; navigate: Navigate }) {
  const [fields, setFields] = useState<Fields>()
  const [error, setError] = useState('')
  const loads = useLoads(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const existing = id ? await store.getMatch(id) : undefined
      // A new match defaults to the load shot at the previous one.
      const previous = existing || loadId ? undefined : (await store.listMatches())[0]
      if (cancelled) return
      setFields({
        name: existing?.name ?? '',
        startsOn: existing?.startsOn ?? localDate(),
        loadId: existing ? (existing.loadId ?? '') : (loadId ?? previous?.loadId ?? ''),
        location: existing?.location ?? '',
        result: existing?.result ?? '',
        notes: existing?.notes ?? '',
      })
    })()
    return () => {
      cancelled = true
    }
  }, [id, loadId])

  if (!fields || !loads) return null
  const set = (name: keyof Fields) => (e: { target: { value: string } }) => {
    setFields({ ...fields, [name]: e.target.value })
    if (name === 'name') setError('')
  }
  const back = () => navigate(loadId ? { screen: 'load', id: loadId } : { screen: 'matches' })
  // Deleted loads are offered only if this match already uses one.
  const choices = loads
    .filter((l) => !l.deletedAt || l.id === fields.loadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!fields) return
    const name = fields.name.trim()
    if (!name) {
      setError('Enter a name for the match.')
      return
    }
    const draft: MatchDraft = { name, startsOn: fields.startsOn || localDate() }
    for (const key of ['loadId', 'location', 'result', 'notes'] as const) {
      const value = fields[key].trim()
      if (value) draft[key] = value
    }
    if (id) await store.updateMatch(id, draft)
    else await store.createMatch(draft)
    back()
  }

  async function remove() {
    if (!id || !window.confirm('Delete this match?')) return
    await store.deleteMatch(id)
    back()
  }

  return (
    <main>
      <header className="bar">
        <button className="link" onClick={back}>
          ‹ Cancel
        </button>
        <h1>{id ? 'Edit match' : 'New match'}</h1>
      </header>

      <form className="card form" onSubmit={save} noValidate>
        <label>
          Match name
          <input value={fields.name} onChange={set('name')} autoFocus={!id} autoCapitalize="words" />
        </label>
        {error && <p className="error">{error}</p>}
        <label>
          Date
          <input type="date" value={fields.startsOn} onChange={set('startsOn')} />
        </label>
        <label>
          Load
          <select value={fields.loadId} onChange={set('loadId')}>
            <option value="">No load recorded</option>
            {choices.map((l) => (
              <option key={l.id} value={l.id}>
                {loadSummary(l)}
                {l.deletedAt ? ' (deleted)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location (optional)
          <input value={fields.location} onChange={set('location')} autoCapitalize="words" />
        </label>
        <label>
          Result (optional)
          <input value={fields.result} onChange={set('result')} placeholder="e.g. 78/100, 12th" />
        </label>
        <label>
          Notes (optional)
          <textarea rows={4} value={fields.notes} onChange={set('notes')} placeholder="Conditions, how the load ran" />
        </label>
        <button className="primary wide" type="submit">
          Save
        </button>
        {id && (
          <button type="button" className="danger" onClick={remove}>
            Delete match
          </button>
        )}
      </form>
    </main>
  )
}
