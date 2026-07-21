export type ConnectionId =
  | 'health'
  | 'notify'
  | 'notes'
  | 'instagram'
  | 'gcal'
  | 'ical'
  | 'contacts'
  | 'bank'

export interface ConnState {
  connectedAt: number
  lastUsed?: number
  extra?: string
}

const KEY = 'pm.connections'

export function getConnections(): Partial<Record<ConnectionId, ConnState>> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw !== null ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function markConnected(id: ConnectionId, extra?: string) {
  const all = getConnections()
  const prev = all[id]
  all[id] = {
    connectedAt: prev?.connectedAt ?? Date.now(),
    lastUsed: Date.now(),
    extra: extra ?? prev?.extra,
  }
  localStorage.setItem(KEY, JSON.stringify(all))
  window.dispatchEvent(new Event('pm-data'))
}

export function disconnect(id: ConnectionId) {
  const all = getConnections()
  delete all[id]
  localStorage.setItem(KEY, JSON.stringify(all))
  window.dispatchEvent(new Event('pm-data'))
}

export const lastUsedText = (state?: ConnState): string | null => {
  if (!state?.lastUsed) return null
  const days = Math.floor((Date.now() - state.lastUsed) / 86400000)
  if (days === 0) return 'idag'
  if (days === 1) return 'igår'
  return `för ${days} dagar sedan`
}
