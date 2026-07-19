import { dateKey } from './store'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const xpTotal = () => read('pm.xp.total', 0)
export const xpLog = () => read<Record<string, number>>('pm.xp.log', {})
export const xpDays = () => read<Record<string, number>>('pm.xp.days', {})

/** Ger XP en gång per unik nyckel — att bocka ur och i igen ger inget extra. */
export function awardXp(key: string, amount: number) {
  const log = xpLog()
  if (log[key]) return
  log[key] = amount
  localStorage.setItem('pm.xp.log', JSON.stringify(log))
  localStorage.setItem('pm.xp.total', JSON.stringify(xpTotal() + amount))
  const days = xpDays()
  const today = dateKey()
  days[today] = (days[today] ?? 0) + amount
  localStorage.setItem('pm.xp.days', JSON.stringify(days))
  window.dispatchEvent(new Event('pm-xp'))
}

export const XP = {
  taskSmall: 10,
  taskMedium: 15,
  taskMajor: 25,
  habit: 10,
  routine: 5,
  pomodoro: 20,
  journal: 15,
} as const

export function levelInfo(total: number) {
  let level = 1
  let rest = total
  for (;;) {
    const need = 100 + (level - 1) * 50
    if (rest < need) return { level, into: rest, need }
    rest -= need
    level++
  }
}
