import { useEffect, useState, type FormEvent } from 'react'
import { localDate, store } from '../data/store.ts'
import { newLoadDraft, type LoadDraft } from '../domain/load.ts'
import type { Navigate } from './nav.ts'

type Fields = Record<
  'chargeGr' | 'powder' | 'bullet' | 'bulletWeightGr' | 'rifle' | 'brass' | 'primer' | 'cbtoIn' | 'loadedOn' | 'name' | 'notes',
  string
>

const text = (value: string | number | undefined) => (value === undefined || value === 0 ? '' : String(value))

function toFields(draft: LoadDraft): Fields {
  return {
    chargeGr: text(draft.chargeGr),
    powder: text(draft.powder),
    bullet: text(draft.bullet),
    bulletWeightGr: text(draft.bulletWeightGr),
    rifle: text(draft.rifle),
    brass: text(draft.brass),
    primer: text(draft.primer),
    cbtoIn: text(draft.cbtoIn),
    loadedOn: text(draft.loadedOn),
    name: text(draft.name),
    notes: text(draft.notes),
  }
}

const optionalText = (value: string) => value.trim() || undefined
const optionalNumber = (value: string) => {
  const n = Number(value.trim().replace(',', '.'))
  return value.trim() !== '' && Number.isFinite(n) ? n : undefined
}

export function LoadFormScreen({ id, fromId, navigate }: { id?: string; fromId?: string; navigate: Navigate }) {
  const [fields, setFields] = useState<Fields>()
  const [error, setError] = useState('')
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const existing = id ? await store.getLoad(id) : undefined
      const source = fromId ? await store.getLoad(fromId) : await store.latestLoad()
      if (cancelled) return
      setFields(toFields(existing ?? newLoadDraft(source, localDate())))
      setPrefilled(!existing && Boolean(source))
    })()
    return () => {
      cancelled = true
    }
  }, [id, fromId])

  if (!fields) return null
  const set = (name: keyof Fields) => (e: { target: { value: string } }) => {
    setFields({ ...fields, [name]: e.target.value })
    if (name === 'chargeGr') setError('')
  }
  const back = () => navigate(id ? { screen: 'load', id } : fromId ? { screen: 'load', id: fromId } : { screen: 'loads' })

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!fields) return
    const chargeGr = optionalNumber(fields.chargeGr)
    if (chargeGr === undefined || chargeGr <= 0) {
      setError('Enter a charge weight in grains.')
      return
    }
    const draft: LoadDraft = { chargeGr }
    const optional: Partial<LoadDraft> = {
      powder: optionalText(fields.powder),
      bullet: optionalText(fields.bullet),
      bulletWeightGr: optionalNumber(fields.bulletWeightGr),
      rifle: optionalText(fields.rifle),
      brass: optionalText(fields.brass),
      primer: optionalText(fields.primer),
      cbtoIn: optionalNumber(fields.cbtoIn),
      loadedOn: optionalText(fields.loadedOn),
      name: optionalText(fields.name),
      notes: optionalText(fields.notes),
    }
    for (const [key, value] of Object.entries(optional)) {
      if (value !== undefined) Object.assign(draft, { [key]: value })
    }
    if (id) {
      await store.updateLoad(id, draft)
      navigate({ screen: 'load', id })
    } else {
      const load = await store.createLoad(draft)
      navigate({ screen: 'load', id: load.id })
    }
  }

  const moreOpen = Boolean(fields.brass || fields.primer || fields.cbtoIn || fields.name || fields.notes)

  return (
    <main>
      <header className="bar">
        <button className="link" onClick={back}>
          ‹ Cancel
        </button>
        <h1>{id ? 'Edit load' : 'New load'}</h1>
      </header>

      <form className="card form" onSubmit={save} noValidate>
        {prefilled && (
          <p className="hint">
            {fromId ? 'Copied from the load you were viewing.' : 'Filled in from your last load.'} Change only what
            differs.
          </p>
        )}
        <label>
          Charge weight (gr)
          <input inputMode="decimal" value={fields.chargeGr} onChange={set('chargeGr')} autoFocus={!id} />
        </label>
        {error && <p className="error">{error}</p>}
        <label>
          Powder
          <input value={fields.powder} onChange={set('powder')} autoCapitalize="words" />
        </label>
        <div className="pair">
          <label>
            Bullet weight (gr)
            <input inputMode="decimal" value={fields.bulletWeightGr} onChange={set('bulletWeightGr')} />
          </label>
          <label>
            Bullet
            <input value={fields.bullet} onChange={set('bullet')} />
          </label>
        </div>
        <label>
          Rifle or cartridge
          <input value={fields.rifle} onChange={set('rifle')} />
        </label>
        <label>
          Loaded on
          <input type="date" value={fields.loadedOn} onChange={set('loadedOn')} />
        </label>

        <details open={moreOpen}>
          <summary>More (all optional)</summary>
          <label>
            Brass
            <input value={fields.brass} onChange={set('brass')} />
          </label>
          <label>
            Primer
            <input value={fields.primer} onChange={set('primer')} />
          </label>
          <label>
            Seating depth, CBTO (in)
            <input inputMode="decimal" value={fields.cbtoIn} onChange={set('cbtoIn')} />
          </label>
          <label>
            Name
            <input value={fields.name} onChange={set('name')} />
          </label>
          <label>
            Notes
            <textarea rows={3} value={fields.notes} onChange={set('notes')} />
          </label>
        </details>

        <button className="primary wide" type="submit">
          Save
        </button>
      </form>
    </main>
  )
}
