import { dateKey, uid } from './store'
import { defaultHabits } from './data'
import type { Habit, ShopItem, Expense, PlanTask, Tier } from './types'

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
  window.dispatchEvent(new Event('pm-data'))
}

export type AiAction =
  | { type: 'add_task'; text: string; tier: Tier }
  | { type: 'log_expense'; amount: number; category: string; note: string }
  | { type: 'add_shopping_items'; items: string[] }
  | { type: 'log_health'; steps?: number; sleep?: number; water?: number; weight?: number }
  | { type: 'add_habit'; name: string }
  | { type: 'toggle_habit_today'; habitName: string }
  | { type: 'add_not_to_do'; text: string }

/** Utför en agent-föreslagen åtgärd lokalt och returnerar en kort bekräftelsetext. */
export function applyAiAction(action: AiAction): string {
  const today = dateKey()

  switch (action.type) {
    case 'add_task': {
      const plans = read<Record<string, PlanTask[]>>('pm.plan', {})
      plans[today] = [
        ...(plans[today] ?? []),
        { id: uid(), text: action.text, tier: action.tier, done: false },
      ]
      write('pm.plan', plans)
      return `✅ Lade till "${action.text}" i dagens plan`
    }

    case 'log_expense': {
      const expenses = read<Expense[]>('pm.expenses', [])
      write('pm.expenses', [
        { id: uid(), date: today, amount: action.amount, category: action.category, note: action.note },
        ...expenses,
      ])
      return `💸 Loggade ${action.amount} kr (${action.category})`
    }

    case 'add_shopping_items': {
      const list = read<ShopItem[]>('pm.shopping', [])
      const existing = new Set(list.map((i) => i.text.toLowerCase()))
      const next = action.items
        .filter((t) => !existing.has(t.toLowerCase()))
        .map((text) => ({ id: uid(), text, checked: false }))
      write('pm.shopping', [...list, ...next])
      return `🛒 La till ${action.items.join(', ')} på inköpslistan`
    }

    case 'log_health': {
      const all = read<Record<string, Record<string, number>>>('pm.health', {})
      const day = { ...all[today] }
      if (action.steps !== undefined) day.steps = action.steps
      if (action.sleep !== undefined) day.sleep = action.sleep
      if (action.water !== undefined) day.water = action.water
      if (action.weight !== undefined) day.weight = action.weight
      all[today] = day
      write('pm.health', all)
      return `❤️ Hälsodata uppdaterad`
    }

    case 'add_habit': {
      const habits = read<Habit[]>('pm.habits.items', defaultHabits)
      if (!habits.some((h) => h.name.toLowerCase() === action.name.toLowerCase())) {
        write('pm.habits.items', [...habits, { id: uid(), name: action.name }])
      }
      return `📊 Ny vana: "${action.name}"`
    }

    case 'toggle_habit_today': {
      const habits = read<Habit[]>('pm.habits.items', defaultHabits)
      const match = habits.find(
        (h) => h.name.toLowerCase() === action.habitName.toLowerCase(),
      )
      if (!match) return `Hittade ingen vana som heter "${action.habitName}"`
      const done = read<Record<string, string[]>>('pm.habits.done', {})
      const dates = done[match.id] ?? []
      write('pm.habits.done', {
        ...done,
        [match.id]: dates.includes(today)
          ? dates.filter((d) => d !== today)
          : [...dates, today],
      })
      return `📊 Bockade av "${match.name}" för idag`
    }

    case 'add_not_to_do': {
      const list = read<{ id: string; text: string }[]>('pm.nottodo', [])
      write('pm.nottodo', [...list, { id: uid(), text: action.text }])
      return `🚫 La till "${action.text}" på inte-göra-listan`
    }
  }
}
