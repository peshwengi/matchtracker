import { useLoads, useMatches } from '../data/hooks.ts'
import { loadSummary } from '../domain/load.ts'
import { fmtDate } from './format.ts'
import type { Navigate } from './nav.ts'
import { TabBar } from './TabBar.tsx'

export function MatchesScreen({ navigate }: { navigate: Navigate }) {
  const matches = useMatches()
  const loads = useLoads(true)
  if (!matches || !loads) return null
  const loadById = new Map(loads.map((l) => [l.id, l]))

  return (
    <main className="with-tabs">
      <header className="bar">
        <h1>Matches</h1>
        <button className="primary" onClick={() => navigate({ screen: 'match-form' })}>
          New match
        </button>
      </header>

      {matches.length === 0 && <p className="empty">No matches yet. Add one to record which load you shot.</p>}

      {matches.map((match) => {
        const load = match.loadId ? loadById.get(match.loadId) : undefined
        return (
          <button key={match.id} className="card match" onClick={() => navigate({ screen: 'match-form', id: match.id })}>
            <strong>{match.name}</strong>
            <span className="muted">{[fmtDate(match.startsOn), match.location].filter(Boolean).join(' · ')}</span>
            <span>{load ? loadSummary(load) : 'No load recorded'}</span>
            {match.result && <span>{match.result}</span>}
          </button>
        )
      })}
      <TabBar current="matches" navigate={navigate} />
    </main>
  )
}
