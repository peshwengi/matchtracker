export type Route =
  | { screen: 'loads' }
  | { screen: 'load'; id: string }
  /** `id` edits a load; `fromId` starts a new one from an existing load. */
  | { screen: 'load-form'; id?: string; fromId?: string }

export type Navigate = (route: Route) => void
