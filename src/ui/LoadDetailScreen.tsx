import { useState, type ChangeEvent } from 'react'
import { useLoad, useStrings } from '../data/hooks.ts'
import { store } from '../data/store.ts'
import { bulletLabel, loadTitle } from '../domain/load.ts'
import { parseShotViewCsv, ShotViewParseError } from '../domain/shotview.ts'
import { pooledVelocityStats } from '../domain/stats.ts'
import { fmt, fmtDate } from './format.ts'
import type { Navigate } from './nav.ts'
import { StringCard } from './StringCard.tsx'

export function LoadDetailScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const load = useLoad(id)
  const strings = useStrings(id)
  const [messages, setMessages] = useState<string[]>([])

  if (load === undefined || !strings) return null
  if (load === null) {
    return (
      <main>
        <header className="bar">
          <button className="link" onClick={() => navigate({ screen: 'loads' })}>
            ‹ Loads
          </button>
        </header>
        <p className="empty">This load no longer exists.</p>
      </main>
    )
  }

  const stats = pooledVelocityStats(strings.map((s) => s.velocitiesFps))
  const recipe: [string, string | undefined][] = [
    ['Charge', `${load.chargeGr} gr`],
    ['Powder', load.powder],
    ['Bullet', bulletLabel(load) || undefined],
    ['Rifle', load.rifle],
    ['Brass', load.brass],
    ['Primer', load.primer],
    ['CBTO', load.cbtoIn === undefined ? undefined : `${load.cbtoIn} in`],
    ['Loaded', fmtDate(load.loadedOn) || undefined],
    ['Notes', load.notes],
  ]

  async function importFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    const results: string[] = []
    for (const file of files) {
      try {
        const result = await store.importShotViewSession(id, parseShotViewCsv(await file.text()))
        if (result.outcome === 'duplicate') results.push(`${file.name}: already imported.`)
        else if (result.outcome === 'empty') results.push(`${file.name}: no shots in this file.`)
        else {
          const n = result.string.velocitiesFps.length
          const warning =
            result.bulletWeightMismatchGr === undefined
              ? ''
              : ` The file says ${result.bulletWeightMismatchGr} gr bullets; this load says ${load?.bulletWeightGr} gr.`
          results.push(`Imported ${n} shots from ${fmtDate(result.string.firedOn)}.${warning}`)
        }
      } catch (err) {
        const reason = err instanceof ShotViewParseError ? err.message : 'could not be read'
        results.push(`${file.name}: ${reason}.`)
      }
    }
    setMessages(results)
  }

  async function remove() {
    if (!window.confirm('Delete this load and its range data?')) return
    await store.deleteLoad(id)
    navigate({ screen: 'loads' })
  }

  return (
    <main>
      <header className="bar">
        <button className="link" onClick={() => navigate({ screen: 'loads' })}>
          ‹ Loads
        </button>
        <button className="link" onClick={() => navigate({ screen: 'load-form', id })}>
          Edit
        </button>
      </header>
      <h1>{loadTitle(load)}</h1>

      <section className="card">
        <dl className="recipe">
          {recipe.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      </section>

      <section className="card">
        <h2>Velocity</h2>
        {stats ? (
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
                <strong>{stats.count}</strong>
                <span>{stats.count === 1 ? 'shot' : 'shots'}</span>
              </div>
            </div>
            {stats.stringCount > 1 && (
              <p className="hint">
                SD combines {stats.stringCount} sessions, each measured around its own average.
              </p>
            )}
            {stats.count < 10 && <p className="hint">Under 10 shots, treat the SD as a rough guide.</p>}
          </>
        ) : (
          <p className="hint">No chronograph data yet.</p>
        )}
        <label className="primary wide file">
          Import ShotView CSV
          <input type="file" accept=".csv,text/csv,text/comma-separated-values" multiple onChange={importFiles} />
        </label>
        {messages.map((m) => (
          <p key={m} className="notice" role="status">
            {m}
          </p>
        ))}
      </section>

      {[...strings].reverse().map((s) => (
        <StringCard key={s.id} string={s} />
      ))}

      <div className="actions">
        <button onClick={() => navigate({ screen: 'load-form', fromId: id })}>New load from this one</button>
        <button className="danger" onClick={remove}>
          Delete load
        </button>
      </div>
    </main>
  )
}
