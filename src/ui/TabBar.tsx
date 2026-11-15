import { useBackupStatus } from '../data/hooks.ts'
import type { Navigate } from './nav.ts'

type Tab = 'loads' | 'matches' | 'backup'

export function TabBar({ current, navigate }: { current: Tab; navigate: Navigate }) {
  const status = useBackupStatus()
  const unsaved = Boolean(status && status.changed > 0)
  const tab = (id: Tab, label: string, flagged = false) => (
    <button aria-current={current === id ? 'page' : undefined} onClick={() => navigate({ screen: id })}>
      {label}
      {flagged && (
        <span className="dot" role="img" aria-label="changes not backed up" />
      )}
    </button>
  )
  return (
    <nav className="tabs" aria-label="Sections">
      {tab('loads', 'Loads')}
      {tab('matches', 'Matches')}
      {tab('backup', 'Backup', unsaved)}
    </nav>
  )
}
