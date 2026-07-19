import { dateKey, addDays, monthKey } from './store'
import { xpTotal, levelInfo } from './xp'
import { defaultHabits } from './data'
import type { Expense, Habit } from './types'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export interface Insight {
  icon: string
  text: string
}

/** Regelbaserad coach: skannar all data och plockar ut det viktigaste just nu. */
export function getInsights(): Insight[] {
  const found: (Insight & { prio: number })[] = []
  const today = dateKey()
  const hour = new Date().getHours()

  // streaks i fara
  const habits = read<Habit[]>('pm.habits.items', defaultHabits)
  const habitDone = read<Record<string, string[]>>('pm.habits.done', {})
  for (const h of habits) {
    const dates = new Set(habitDone[h.id] ?? [])
    if (dates.has(today)) continue
    let s = 0
    let cursor = addDays(new Date(), -1)
    while (dates.has(dateKey(cursor))) {
      s++
      cursor = addDays(cursor, -1)
    }
    if (s >= 3) {
      found.push({
        prio: 1,
        icon: '🔥',
        text: `${s} dagars streak på "${h.name}" ryker om du inte kör idag!`,
      })
    }
  }

  // nära nivå-upp
  const { level, into, need } = levelInfo(xpTotal())
  if (need - into <= 30) {
    found.push({
      prio: 2,
      icon: '⭐',
      text: `Bara ${need - into} XP kvar till nivå ${level + 1}.`,
    })
  }

  // budgetläge
  const budgets = read<Record<string, number>>('pm.budgets', {})
  const expenses = read<Expense[]>('pm.expenses', [])
  const month = monthKey()
  for (const [cat, budget] of Object.entries(budgets)) {
    const spent = expenses
      .filter((e) => e.date.startsWith(month) && e.category === cat)
      .reduce((s, e) => s + e.amount, 0)
    const pct = Math.round((spent / budget) * 100)
    if (pct >= 100) {
      found.push({ prio: 1, icon: '🚨', text: `${cat}-budgeten är sprängd (${pct} %).` })
    } else if (pct >= 80) {
      found.push({
        prio: 2,
        icon: '💸',
        text: `${cat}-budgeten är ${pct} % använd — håll i hatten.`,
      })
    }
  }

  // fokus
  let pomoToday = 0
  try {
    pomoToday = Number(
      JSON.parse(
        localStorage.getItem('pm.pomo.rounds.' + new Date().toDateString()) ?? '0',
      ),
    )
  } catch {
    // ignorera trasig post
  }
  if (pomoToday === 0 && hour >= 9 && hour < 21) {
    found.push({
      prio: 3,
      icon: '🍅',
      text: 'Inget fokuspass ännu idag — 25 minuter räcker för att komma igång.',
    })
  }

  // hälsa
  const health = read<Record<string, { sleep?: number; water?: number }>>(
    'pm.health',
    {},
  )
  const sleep = health[today]?.sleep ?? 0
  if (sleep > 0 && sleep < 6) {
    found.push({
      prio: 2,
      icon: '😴',
      text: `Bara ${String(sleep).replace('.', ',')} h sömn i natt — sänk ribban och var snäll mot dig själv idag.`,
    })
  }
  const water = health[today]?.water ?? 0
  if (hour >= 15 && water < 4) {
    found.push({
      prio: 4,
      icon: '💧',
      text: `${water} glas vatten hittills — dags att dricka.`,
    })
  }

  // utgiftsloggen
  if (hour >= 19 && !expenses.some((e) => e.date === today)) {
    found.push({
      prio: 4,
      icon: '✍️',
      text: 'Inga utgifter loggade idag — spenderade du verkligen 0 kr?',
    })
  }

  found.sort((a, b) => a.prio - b.prio)
  if (!found.length) {
    return [{ icon: '✅', text: 'Allt under kontroll — kör dagens plan!' }]
  }
  return found.slice(0, 4).map(({ icon, text }) => ({ icon, text }))
}
