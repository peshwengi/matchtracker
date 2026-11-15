import type { Navigate } from './nav.ts'

export function TabBar({ current, navigate }: { current: 'loads' | 'matches'; navigate: Navigate }) {
  return (
    <nav className="tabs" aria-label="Sections">
      <button aria-current={current === 'loads' ? 'page' : undefined} onClick={() => navigate({ screen: 'loads' })}>
        Loads
      </button>
      <button aria-current={current === 'matches' ? 'page' : undefined} onClick={() => navigate({ screen: 'matches' })}>
        Matches
      </button>
    </nav>
  )
}
