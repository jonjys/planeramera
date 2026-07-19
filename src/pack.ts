import { uid } from './store'
import { defaultHabits, defaultRoutines } from './data'
import type { RoutinePeriod, RoutineItem } from './data'
import type { Habit, ShopItem } from './types'

export interface Pack {
  v: 1
  name: string
  author: string
  routines?: Partial<Record<RoutinePeriod, string[]>>
  habits?: string[]
  notToDo?: string[]
  shopping?: string[]
}

export interface Follow {
  name: string
  author: string
  at: number
}

export function encodePack(p: Pack): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(p))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodePack(s: string): Pack | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    const p = JSON.parse(json) as Pack
    if (p && p.v === 1 && typeof p.name === 'string') return p
    return null
  } catch {
    return null
  }
}

export function packLink(p: Pack): string {
  return `${location.origin}${location.pathname}#pack=${encodePack(p)}`
}

export function packSummary(p: Pack): string {
  const parts: string[] = []
  const routineCount = p.routines
    ? Object.values(p.routines).reduce((s, list) => s + (list?.length ?? 0), 0)
    : 0
  if (p.habits?.length) parts.push(`${p.habits.length} vanor`)
  if (routineCount) parts.push(`${routineCount} rutiner`)
  if (p.notToDo?.length) parts.push(`${p.notToDo.length} inte-göra`)
  if (p.shopping?.length) parts.push(`${p.shopping.length} inköpsvaror`)
  return parts.join(' · ') || 'tomt paket'
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

/** Slår ihop ett paket med användarens data i localStorage.
 *  Anroparen laddar om sidan efteråt så att alla flikar läser om sitt state. */
export function mergePack(pack: Pack) {
  if (pack.habits?.length) {
    const habits = read<Habit[]>('pm.habits.items', defaultHabits)
    const names = new Set(habits.map((h) => h.name.toLowerCase()))
    write('pm.habits.items', [
      ...habits,
      ...pack.habits
        .filter((n) => !names.has(n.toLowerCase()))
        .map((name) => ({ id: uid(), name })),
    ])
  }

  if (pack.routines) {
    const items = read<Record<RoutinePeriod, RoutineItem[]>>(
      'pm.routines.items',
      defaultRoutines,
    )
    for (const period of ['daily', 'weekly', 'monthly'] as RoutinePeriod[]) {
      const incoming = pack.routines[period]
      if (!incoming?.length) continue
      const existing = new Set(items[period].map((i) => i.text.toLowerCase()))
      items[period] = [
        ...items[period],
        ...incoming
          .filter((t) => !existing.has(t.toLowerCase()))
          .map((text) => ({ id: uid(), text })),
      ]
    }
    write('pm.routines.items', items)
  }

  if (pack.notToDo?.length) {
    const list = read<{ id: string; text: string }[]>('pm.nottodo', [])
    const existing = new Set(list.map((i) => i.text.toLowerCase()))
    write('pm.nottodo', [
      ...list,
      ...pack.notToDo
        .filter((t) => !existing.has(t.toLowerCase()))
        .map((text) => ({ id: uid(), text })),
    ])
  }

  if (pack.shopping?.length) {
    const list = read<ShopItem[]>('pm.shopping', [])
    const existing = new Set(list.map((i) => i.text.toLowerCase()))
    write('pm.shopping', [
      ...list,
      ...pack.shopping
        .filter((t) => !existing.has(t.toLowerCase()))
        .map((text) => ({ id: uid(), text, checked: false })),
    ])
  }

  const follows = read<Follow[]>('pm.follows', [])
  if (
    !follows.some((f) => f.name === pack.name && f.author === pack.author)
  ) {
    write('pm.follows', [
      ...follows,
      { name: pack.name, author: pack.author, at: Date.now() },
    ])
  }
}
