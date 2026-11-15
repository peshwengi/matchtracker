import { useLoads, useStrings } from '../data/hooks.ts'
import { groupLoads, loadTitle } from '../domain/load.ts'
import { pooledVelocityStats } from '../domain/stats.ts'
import type { Load, RangeString } from '../domain/types.ts'
import { fmt, fmtDate, mean } from './format.ts'
import type { Navigate } from './nav.ts'

export function LoadsScreen({ navigate }: { navigate: Navigate }) {
  const loads = useLoads()
  const strings = useStrings()
  if (!loads || !strings) return null

  const byLoad = new Map<string, RangeString[]>()
  for (const s of strings) byLoad.set(s.loadId, [...(byLoad.get(s.loadId) ?? []), s])

  return (
    <main>
      <header className="bar">
        <h1>Loads</h1>
        <button className="primary" onClick={() => navigate({ screen: 'load-form' })}>
          New load
        </button>
      </header>

      {loads.length === 0 && (
        <p className="empty">
          No loads yet. Add one with a charge weight and bullet, then import a chronograph session to it.
        </p>
      )}

      {groupLoads(loads).map((group) => (
        <section key={group.key} className="card">
          <h2>{group.heading}</h2>
          <div className="compare" role="table">
            <div className="compare-row compare-head" role="row">
              <span role="columnheader">Charge</span>
              <span role="columnheader">Avg</span>
              <span role="columnheader">SD</span>
              <span role="columnheader">Shots</span>
              <span role="columnheader">Group</span>
            </div>
            {group.loads.map((load) => (
              <LoadRow key={load.id} load={load} strings={byLoad.get(load.id) ?? []} navigate={navigate} />
            ))}
          </div>
          <p className="units">Charge in grains, velocity in fps, group in inches.</p>
        </section>
      ))}
    </main>
  )
}

function LoadRow({ load, strings, navigate }: { load: Load; strings: RangeString[]; navigate: Navigate }) {
  const stats = pooledVelocityStats(strings.map((s) => s.velocitiesFps))
  const group = mean(strings.flatMap((s) => (s.groupSizeIn === undefined ? [] : [s.groupSizeIn])))
  const detail = [load.name ? loadTitle(load) : '', load.loadedOn ? `loaded ${fmtDate(load.loadedOn)}` : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <button className="compare-row" role="row" onClick={() => navigate({ screen: 'load', id: load.id })}>
      <span role="cell" className="charge">
        {load.chargeGr}
      </span>
      <span role="cell">{fmt(stats?.averageFps)}</span>
      <span role="cell">{fmt(stats?.sdFps, 1)}</span>
      <span role="cell">{stats?.count ?? 0}</span>
      <span role="cell">{fmt(group, 2)}</span>
      {detail && <span className="row-detail">{detail}</span>}
    </button>
  )
}
