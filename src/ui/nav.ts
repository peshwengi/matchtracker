export type Route =
  | { screen: 'loads' }
  | { screen: 'load'; id: string }
  /** `id` edits a load; `fromId` starts a new one from an existing load. */
  | { screen: 'load-form'; id?: string; fromId?: string }
  | { screen: 'matches' }
  /** `id` edits a match; `loadId` starts a new one for that load and returns to it. */
  | { screen: 'match-form'; id?: string; loadId?: string }

export type Navigate = (route: Route) => void
