import { dateKey, monthKey, weekDates } from './store'
import { defaultHabits, defaultRoutines } from './data'
import type { RoutinePeriod, RoutineItem } from './data'
import type { Expense, Goal, Habit } from './types'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const weekdayLong = [
  'söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag',
]

/** Skickas till agenten som kontext — inget mer än vad den behöver för att svara relevant. */
export function buildAiContext() {
  const today = dateKey()
  const name = read('pm.user.name', '')

  interface PlanTaskLite {
    text: string
    tier: string
    done: boolean
  }
  const plans = read<Record<string, PlanTaskLite[]>>('pm.plan', {})
  const todayTasks = (plans[today] ?? []).map((t) => ({
    text: t.text,
    tier: t.tier,
    done: t.done,
  }))

  const habits = read<Habit[]>('pm.habits.items', defaultHabits)
  const habitDone = read<Record<string, string[]>>('pm.habits.done', {})
  const habitsToday = habits.map((h) => ({
    name: h.name,
    doneToday: (habitDone[h.id] ?? []).includes(today),
  }))

  const routineItems = read<Record<RoutinePeriod, RoutineItem[]>>(
    'pm.routines.items',
    defaultRoutines,
  )
  const routineDone = read<Record<string, string[]>>('pm.routines.done', {})
  const dailyDone = routineDone[today] ?? []

  const health = read<Record<string, { steps?: number; sleep?: number; water?: number; weight?: number; mood?: number }>>(
    'pm.health',
    {},
  )[today]

  const expenses = read<Expense[]>('pm.expenses', [])
  const month = monthKey()
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month))
  const monthSpent = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const budgets = read<Record<string, number>>('pm.budgets', {})

  const goals = read<Goal[]>('pm.goals', [])

  const mealPlan = read<Record<number, string>>('pm.mealplan', {})
  const weekdayIndex = (new Date().getDay() + 6) % 7

  const level = (() => {
    try {
      return Number(localStorage.getItem('pm.lastLevel') ?? '1')
    } catch {
      return 1
    }
  })()

  return {
    datum: today,
    veckodag: weekdayLong[new Date().getDay()],
    namn: name || null,
    niva: level,
    dagensPlan: todayTasks,
    vanor: habitsToday,
    dagligaRutiner: { klara: dailyDone.length, totalt: routineItems.daily.length },
    halsaIdag: health ?? null,
    ekonomi: {
      spenderatDennaManad: monthSpent,
      budgetarPerKategori: budgets,
      sparmal: goals.map((g) => ({ namn: g.name, sparat: g.saved, mal: g.target })),
    },
    veckansMiddagIdag: mealPlan[weekdayIndex] ?? null,
    kommandeVeckodagar: weekDates().map((d) => dateKey(d)),
  }
}
