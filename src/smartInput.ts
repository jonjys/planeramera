import { dateKey, uid, kr } from './store'
import { defaultHabits, defaultRoutines } from './data'
import type { Habit, PlanTask, ShopItem, Tier, Expense } from './types'
import type { RoutinePeriod, RoutineItem } from './data'

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

const categoryHints: [RegExp, string][] = [
  [/kaffe|latte|espresso|cappuccino|fika/i, 'Kaffe'],
  [/lunch|middag|frukost|mat|ica|willys|coop|lidl|hemköp|pizza|kebab|sushi|restaurang/i, 'Mat'],
  [/foodora|wolt|uber\s*eats|leverans/i, 'Leverans'],
  [/uber|taxi|buss|tåg|sl\b|bensin|parkering|tunnelbana/i, 'Transport'],
  [/netflix|spotify|hbo|disney|viaplay|youtube|prenumeration/i, 'Streaming'],
  [/bio|konsert|krog|bar|spel|nöje/i, 'Nöje'],
]

export interface SmartAction {
  icon: string
  label: string
  done: string
  apply: () => void
}

const addShopping = (items: string[]) => {
  const list = read<ShopItem[]>('pm.shopping', [])
  const existing = new Set(list.map((i) => i.text.toLowerCase()))
  for (const raw of items) {
    const text = raw.trim()
    if (text && !existing.has(text.toLowerCase())) {
      list.push({ id: uid(), text, checked: false })
      existing.add(text.toLowerCase())
    }
  }
  write('pm.shopping', list)
}

const addTask = (text: string, tier: Tier) => {
  const plans = read<Record<string, PlanTask[]>>('pm.plan', {})
  const today = dateKey()
  plans[today] = [...(plans[today] ?? []), { id: uid(), text, tier, done: false }]
  write('pm.plan', plans)
}

const setHealth = (patch: Record<string, number>, add = false) => {
  const all = read<Record<string, Record<string, number>>>('pm.health', {})
  const today = dateKey()
  const day = { ...all[today] }
  for (const [k, v] of Object.entries(patch)) {
    day[k] = add ? (day[k] ?? 0) + v : v
  }
  all[today] = day
  write('pm.health', all)
}

const num = (s: string) => Number(s.replace(',', '.'))

/** Tolkar fri svensk text till appåtgärder — helt lokalt, ingen server. */
export function parseSmart(raw: string): SmartAction[] {
  const text = raw.trim()
  if (!text) return []
  const out: SmartAction[] = []
  let m: RegExpMatchArray | null

  if ((m = text.match(/^(?:köp|handla)\s+(.+)/i))) {
    const items = m[1].split(/,| och /i).map((s) => s.trim()).filter(Boolean)
    out.push({
      icon: '🛒',
      label: `Inköpslistan: ${items.join(', ')}`,
      done: '🛒 Tillagt på inköpslistan',
      apply: () => addShopping(items),
    })
  }

  if ((m = text.match(/^vatten(?:\s+(\d+))?$/i)) || (m = text.match(/^(\d+)\s*glas(?:\s+vatten)?$/i))) {
    const n = Number(m[1] ?? 1)
    out.push({
      icon: '💧',
      label: `Logga ${n} glas vatten`,
      done: `💧 +${n} glas vatten`,
      apply: () => setHealth({ water: n }, true),
    })
  }

  if (
    (m = text.match(/^sömn\s+(\d+(?:[.,]\d+)?)$/i)) ||
    (m = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:h|tim(?:mar)?)(?:\s+sömn)?$/i))
  ) {
    const h = num(m[1])
    if (h > 0 && h <= 24) {
      out.push({
        icon: '😴',
        label: `Logga ${m[1]} h sömn`,
        done: '😴 Sömn loggad',
        apply: () => setHealth({ sleep: h }),
      })
    }
  }

  if ((m = text.match(/^steg\s+(\d+)$/i)) || (m = text.match(/^(\d{3,6})\s*steg$/i))) {
    const s = Number(m[1])
    out.push({
      icon: '👟',
      label: `Logga ${s.toLocaleString('sv-SE')} steg`,
      done: '👟 Steg loggade',
      apply: () => setHealth({ steps: s }),
    })
  }

  if ((m = text.match(/^vikt\s+(\d+(?:[.,]\d+)?)$/i))) {
    const w = num(m[1])
    out.push({
      icon: '⚖️',
      label: `Logga vikt ${m[1]} kg`,
      done: '⚖️ Vikt loggad',
      apply: () => setHealth({ weight: w }),
    })
  }

  if ((m = text.match(/^vana\s+(.+)/i))) {
    const name = m[1].trim()
    out.push({
      icon: '📊',
      label: `Ny vana: "${name}"`,
      done: '📊 Vana tillagd',
      apply: () => {
        const habits = read<Habit[]>('pm.habits.items', defaultHabits)
        if (!habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
          write('pm.habits.items', [...habits, { id: uid(), name }])
        }
      },
    })
  }

  if ((m = text.match(/^rutin\s+(.+)/i))) {
    const name = m[1].trim()
    out.push({
      icon: '🏠',
      label: `Ny daglig rutin: "${name}"`,
      done: '🏠 Rutin tillagd',
      apply: () => {
        const items = read<Record<RoutinePeriod, RoutineItem[]>>(
          'pm.routines.items',
          defaultRoutines,
        )
        items.daily = [...items.daily, { id: uid(), text: name }]
        write('pm.routines.items', items)
      },
    })
  }

  if ((m = text.match(/^(stor|viktig)\s+(.+)/i))) {
    const t = m[2].trim()
    out.push({
      icon: '🐸',
      label: `Stor uppgift (grodan): "${t}"`,
      done: '🐸 Grodan planerad',
      apply: () => addTask(t, 'major'),
    })
  }

  if ((m = text.match(/^(?:gör|uppgift|todo)\s+(.+)/i))) {
    const t = m[1].trim()
    out.push({
      icon: '✅',
      label: `Uppgift: "${t}"`,
      done: '✅ Uppgift tillagd',
      apply: () => addTask(t, 'small'),
    })
  }

  if ((m = text.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:kr|:-)?$/i)) && num(m[2]) > 0 && num(m[2]) < 1000000) {
    const note = m[1].trim()
    const amount = num(m[2])
    if (!/^(vatten|sömn|steg|vikt|köp|handla|vana|rutin)$/i.test(note)) {
      const category =
        categoryHints.find(([re]) => re.test(note))?.[1] ?? 'Övrigt'
      out.push({
        icon: '💸',
        label: `Utgift: ${kr(amount)} · ${category} ("${note}")`,
        done: `💸 ${kr(amount)} loggad`,
        apply: () => {
          const expenses = read<Expense[]>('pm.expenses', [])
          write('pm.expenses', [
            { id: uid(), date: dateKey(), amount, category, note },
            ...expenses,
          ])
        },
      })
    }
  }

  if (!out.length) {
    out.push(
      {
        icon: '✅',
        label: `Uppgift: "${text}"`,
        done: '✅ Uppgift tillagd',
        apply: () => addTask(text, 'small'),
      },
      {
        icon: '🛒',
        label: `Inköpslistan: "${text}"`,
        done: '🛒 Tillagt på inköpslistan',
        apply: () => addShopping([text]),
      },
    )
  }

  return out.slice(0, 3)
}
