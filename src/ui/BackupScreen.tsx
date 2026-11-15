import { useState, type ChangeEvent } from 'react'
import { useBackupSnapshot, useBackupStatus } from '../data/hooks.ts'
import { localDate, store } from '../data/store.ts'
import { backupFileName, BackupParseError, parseBackup } from '../domain/backup.ts'
import { fmtDate } from './format.ts'
import type { Navigate } from './nav.ts'
import { TabBar } from './TabBar.tsx'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function BackupScreen({ navigate }: { navigate: Navigate }) {
  const status = useBackupStatus()
  const snapshot = useBackupSnapshot()
  const [message, setMessage] = useState('')
  if (!status || !snapshot) return null

  async function backUp() {
    if (!snapshot) return
    const name = backupFileName(snapshot.exportedAt)
    const file = new File([JSON.stringify(snapshot)], name, { type: 'application/json' })
    // On iPhone the share sheet is the way to reach Files and iCloud Drive.
    // Start it straight away: Safari only allows sharing from inside a tap.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
      } catch (err) {
        setMessage(
          err instanceof DOMException && err.name === 'AbortError'
            ? 'Backup cancelled. Nothing was saved.'
            : 'The backup could not be shared from this device.',
        )
        return
      }
      await store.markBackedUp(snapshot)
      setMessage('Backup shared. Check that it was saved where you expect.')
      return
    }
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
    await store.markBackedUp(snapshot)
    setMessage(`Saved ${name} to your downloads.`)
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = await store.restoreBackup(parseBackup(await file.text()))
      const changed = result.added + result.updated
      setMessage(
        changed === 0
          ? 'Everything in that backup is already on this device.'
          : `Restored ${plural(result.added, 'new record')} and updated ${result.updated}. ${result.unchanged} were already up to date.`,
      )
    } catch (err) {
      setMessage(err instanceof BackupParseError ? `${err.message}.` : 'That file could not be read.')
    }
  }

  const live = {
    loads: snapshot.loads.filter((r) => !r.deletedAt).length,
    sessions: snapshot.rangeStrings.filter((r) => !r.deletedAt).length,
    matches: snapshot.matches.filter((r) => !r.deletedAt).length,
  }
  const when = status.lastBackupAt ? fmtDate(localDate(new Date(status.lastBackupAt))) : undefined

  return (
    <main className="with-tabs">
      <header className="bar">
        <h1>Backup</h1>
      </header>

      <section className="card">
        <h2>On this device</h2>
        <p>
          {plural(live.loads, 'load')}, {plural(live.sessions, 'range session')}, {live.matches} {live.matches === 1 ? 'match' : 'matches'}
        </p>
        {status.total === 0 ? (
          <p className="hint">Nothing to back up yet.</p>
        ) : status.changed === 0 ? (
          <p className="hint">Everything is in your backup from {when}.</p>
        ) : when ? (
          <p className="warn">
            {plural(status.changed, 'change')} since your last backup on {when}.
          </p>
        ) : (
          <p className="warn">Never backed up. This data exists only on this device.</p>
        )}
        <button className="primary wide" onClick={backUp} disabled={status.total === 0}>
          Back up now
        </button>
        <p className="hint">
          Makes one file with everything in it. On iPhone choose Save to Files, then iCloud Drive.
        </p>
      </section>

      <section className="card">
        <h2>Restore</h2>
        <p className="hint">
          Adds what is in a backup file to this device. Nothing here is removed, and newer edits are kept.
        </p>
        <label className="wide file">
          Restore from a backup file
          <input type="file" accept=".json,application/json" onChange={restore} />
        </label>
      </section>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <TabBar current="backup" navigate={navigate} />
    </main>
  )
}
