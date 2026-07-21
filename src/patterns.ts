import { dateKey, addDays, kr } from './store'
import { defaultHabits } from './data'
import { xpDays } from './xp'
import type { Expense, Habit, PlanTask } from './types'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export interface Pattern {
  icon: string
  text: string
  strength: number
}

const WEEKDAYS = [
  'söndagar', 'måndagar', 'tisdagar', 'onsdagar', 'torsdagar', 'fredagar', 'lördagar',
]

/** Veckodag ur 'YYYY-MM-DD' utan UTC-fällan i new Date(str). */
function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx
    const b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return 0
  return num / Math.sqrt(dx * dy)
}

const svNum = (n: number, decimals = 1) =>
  n.toFixed(decimals).replace('.', ',')

/** Utgifter: vilken veckodag sticker ut? (senaste 90 dagarna) */
function spendingWeekday(expenses: Expense[]): Pattern | null {
  const cutoff = dateKey(addDays(new Date(), -90))
  const recent = expenses.filter((e) => e.date >= cutoff)
  if (recent.length < 10) return null
  const weeks = new Set(recent.map((e) => e.date.slice(0, 8)))
  if (weeks.size < 3) return null

  const totals = Array(7).fill(0) as number[]
  for (const e of recent) totals[weekdayOf(e.date)] += e.amount
  const maxIdx = totals.indexOf(Math.max(...totals))
  const othersAvg = (totals.reduce((a, b) => a + b, 0) - totals[maxIdx]) / 6
  if (othersAvg <= 0) return null
  const ratio = totals[maxIdx] / othersAvg
  if (ratio < 1.8) return null
  return {
    icon: '💸',
    text: `Du spenderar klart mest på ${WEEKDAYS[maxIdx]} — ${kr(totals[maxIdx])} senaste 90 dagarna, ${svNum(ratio)}× snittet för övriga dagar.`,
    strength: ratio,
  }
}

/** Kategoritrend: senaste 30 dagarna mot de 30 innan. */
function categoryTrend(expenses: Expense[]): Pattern | null {
  const d30 = dateKey(addDays(new Date(), -30))
  const d60 = dateKey(addDays(new Date(), -60))
  const byCat = new Map<string, { now: number; before: number }>()
  for (const e of expenses) {
    if (e.date < d60) continue
    const entry = byCat.get(e.category) ?? { now: 0, before: 0 }
    if (e.date >= d30) entry.now += e.amount
    else entry.before += e.amount
    byCat.set(e.category, entry)
  }
  let best: Pattern | null = null
  for (const [cat, { now, before }] of byCat) {
    if (before < 200 || now < 200) continue
    const change = (now - before) / before
    if (Math.abs(change) < 0.4) continue
    const strength = 1 + Math.abs(change)
    if (best && strength <= best.strength) continue
    best = {
      icon: change > 0 ? '📈' : '📉',
      text:
        change > 0
          ? `${cat}-utgifterna ökar: +${Math.round(change * 100)} % senaste 30 dagarna (${kr(now)} mot ${kr(before)}).`
          : `${cat}-utgifterna minskar: −${Math.round(-change * 100)} % senaste 30 dagarna. Snyggt!`,
      strength,
    }
  }
  return best
}

/** Vanor: finns en veckodag där en vana konsekvent faller? (senaste 8 veckorna) */
function habitWeakday(
  habits: Habit[],
  done: Record<string, string[]>,
  frozen: Record<string, string[]>,
): Pattern | null {
  const cutoff = dateKey(addDays(new Date(), -56))
  let best: Pattern | null = null
  for (const h of habits) {
    const dates = [...(done[h.id] ?? []), ...(frozen[h.id] ?? [])].filter(
      (d) => d >= cutoff,
    )
    if (dates.length < 10) continue
    const perDay = Array(7).fill(0) as number[]
    for (const d of dates) perDay[weekdayOf(d)]++
    const opportunities = 8 // åtta av varje veckodag i ett 56-dagarsfönster
    const rates = perDay.map((c) => c / opportunities)
    const worst = rates.indexOf(Math.min(...rates))
    const bestDay = Math.max(...rates)
    if (bestDay - rates[worst] < 0.4) continue
    const strength = 1 + (bestDay - rates[worst])
    if (best && strength <= best.strength) continue
    best = {
      icon: '📊',
      text: `"${h.name}" faller oftast på ${WEEKDAYS[worst]} — ${perDay[worst]} av ${opportunities} senaste veckorna. Planera in den tidigare de dagarna.`,
      strength,
    }
  }
  return best
}

/** Sömn × humör: Pearson-korrelation över dagar där båda finns. */
function sleepMood(
  health: Record<string, { sleep?: number; mood?: number }>,
): Pattern | null {
  const xs: number[] = []
  const ys: number[] = []
  for (const day of Object.values(health)) {
    if ((day.sleep ?? 0) > 0 && (day.mood ?? 0) > 0) {
      xs.push(day.sleep!)
      ys.push(day.mood!)
    }
  }
  if (xs.length < 7) return null
  const r = pearson(xs, ys)
  if (Math.abs(r) < 0.5) return null
  return {
    icon: '😴',
    text:
      r > 0
        ? `Ditt humör följer din sömn — starkt samband (r = ${svNum(r, 2)}) över ${xs.length} dagar. Sömnen är din humörspak.`
        : `Oväntat: ditt humör är lägre dagar du sovit mer (r = ${svNum(r, 2)}). Värt att titta närmare på.`,
    strength: 1 + Math.abs(r),
  }
}

/** Sömn × vanor: klarar du fler vanor dagar du sovit 7 h+? */
function sleepHabits(
  health: Record<string, { sleep?: number }>,
  done: Record<string, string[]>,
): Pattern | null {
  const perDate = new Map<string, number>()
  for (const dates of Object.values(done)) {
    for (const d of dates) perDate.set(d, (perDate.get(d) ?? 0) + 1)
  }
  const rested: number[] = []
  const tired: number[] = []
  for (const [date, day] of Object.entries(health)) {
    const sleep = day.sleep ?? 0
    if (sleep <= 0) continue
    ;(sleep >= 7 ? rested : tired).push(perDate.get(date) ?? 0)
  }
  if (rested.length < 4 || tired.length < 4) return null
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
  const ar = avg(rested)
  const at = avg(tired)
  if (at <= 0 || ar / at < 1.4) return null
  return {
    icon: '🛌',
    text: `Dagar du sover 7 h+ klarar du ${svNum(ar / at)}× fler vanor (${svNum(ar)} mot ${svNum(at)} per dag). Sömnen gör jobbet åt dig.`,
    strength: ar / at,
  }
}

/** XP: vilken veckodag är du som starkast? (senaste 8 veckorna) */
function xpWeekday(): Pattern | null {
  const days = xpDays()
  const cutoff = dateKey(addDays(new Date(), -56))
  const totals = Array(7).fill(0) as number[]
  let activeDays = 0
  for (const [date, v] of Object.entries(days)) {
    if (date < cutoff || v <= 0) continue
    totals[weekdayOf(date)] += v
    activeDays++
  }
  if (activeDays < 12) return null
  const maxIdx = totals.indexOf(Math.max(...totals))
  const othersAvg = (totals.reduce((a, b) => a + b, 0) - totals[maxIdx]) / 6
  if (othersAvg <= 0) return null
  const ratio = totals[maxIdx] / othersAvg
  if (ratio < 1.6) return null
  return {
    icon: '⚡',
    text: `${WEEKDAYS[maxIdx][0].toUpperCase() + WEEKDAYS[maxIdx].slice(1)} är dina superdagar — ${svNum(ratio)}× mer XP än en vanlig dag. Lägg det viktigaste där.`,
    strength: ratio,
  }
}

/** Grodan × kvällsbetyg: betygsätter du dagen högre när den stora uppgiften blev klar? */
function frogStars(
  journal: Record<string, { stars: number }>,
  plans: Record<string, PlanTask[]>,
): Pattern | null {
  const withFrog: number[] = []
  const withoutFrog: number[] = []
  for (const [date, entry] of Object.entries(journal)) {
    if (!entry.stars) continue
    const major = (plans[date] ?? []).find((t) => t.tier === 'major')
    if (!major) continue
    ;(major.done ? withFrog : withoutFrog).push(entry.stars)
  }
  if (withFrog.length < 3 || withoutFrog.length < 3) return null
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
  const diff = avg(withFrog) - avg(withoutFrog)
  if (diff < 0.8) return null
  return {
    icon: '🐸',
    text: `Dagar du äter grodan betygsätter du ${svNum(diff)} stjärnor högre (${svNum(avg(withFrog))} mot ${svNum(avg(withoutFrog))}). Grodan är nyckeln till bra dagar.`,
    strength: 1 + diff,
  }
}

/** Kör alla mönsterletare mot användarens lokala data. Ingen server, ingen AI —
 *  bara ärlig statistik med minimikrav på datamängd innan något påstås. */
export function getPatterns(): Pattern[] {
  const expenses = read<Expense[]>('pm.expenses', [])
  const habits = read<Habit[]>('pm.habits.items', defaultHabits)
  const done = read<Record<string, string[]>>('pm.habits.done', {})
  const frozen = read<Record<string, string[]>>('pm.frozen', {})
  const health = read<Record<string, { sleep?: number; mood?: number }>>('pm.health', {})
  const journal = read<Record<string, { stars: number }>>('pm.journal', {})
  const plans = read<Record<string, PlanTask[]>>('pm.plan', {})

  const found = [
    spendingWeekday(expenses),
    categoryTrend(expenses),
    habitWeakday(habits, done, frozen),
    sleepMood(health),
    sleepHabits(health, done),
    xpWeekday(),
    frogStars(journal, plans),
  ].filter((p): p is Pattern => p !== null)

  return found.sort((a, b) => b.strength - a.strength)
}
