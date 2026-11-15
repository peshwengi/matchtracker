export type Route =
  | { screen: 'loads' }
  | { screen: 'load'; id: string }
  /** `id` edits a load; `fromId` starts a new one from an existing load. */
  | { screen: 'load-form'; id?: string; fromId?: string }
  | { screen: 'matches' }
  /**
   * `id` edits a match. `loadId` means the form was opened from that load's
   * screen: Cancel, Save and Delete return there, and a new match starts with
   * that load selected.
   */
  | { screen: 'match-form'; id?: string; loadId?: string }
  | { screen: 'backup' }

export type Navigate = (route: Route) => void
