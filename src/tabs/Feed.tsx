import { useState, type ReactNode } from 'react'
import { useStored, dateKey, weekKey, monthKey, uid, addDays, kr } from '../store'
import { defaultRoutines, defaultHabits, meals, dailyQuotes } from '../data'
import type { RoutinePeriod, RoutineItem } from '../data'
import type { PlanTask, Tier, Habit, Expense } from '../types'
import type { TabId } from '../App'
import { awardXp, XP, xpDays } from '../xp'
import { confetti } from '../confetti'
import { streakWith } from '../streaks'
import { getPatterns } from '../patterns'
import Rings from '../components/Rings'

interface JournalEntry {
  stars: number
  good: string
  grateful: string
}

const tierXp: Record<Tier, number> = {
  major: XP.taskMajor,
  medium: XP.taskMedium,
  small: XP.taskSmall,
}

const tierMeta: Record<Tier, { label: string; max: number }> = {
  major: { label: '1 stor uppgift', max: 1 },
  medium: { label: '3 mellanstora', max: 3 },
  small: { label: '5 små', max: 5 },
}

interface Card {
  priority: number
  key: string
  node: ReactNode
}

/**
 * Flödet ersätter en fast dashboard med en rankad ström: appen bestämmer
 * ordningen utifrån vad som faktiskt är brådskande just nu (streak som
 * riskerar brytas, budget som sprängs, grodan som väntar) istället för att
 * du ska komma ihåg att leta i elva flikar.
 */
export default function Feed({ goTo }: { goTo: (t: TabId) => void }) {
  const today = dateKey()
  const hour = new Date().getHours()

  const [plans, setPlans] = useStored<Record<string, PlanTask[]>>('pm.plan', {})
  const [routineItems] = useStored<Record<RoutinePeriod, RoutineItem[]>>(
    'pm.routines.items',
    defaultRoutines,
  )
  const [routineDone] = useStored<Record<string, string[]>>('pm.routines.done', {})
  const [habits] = useStored<Habit[]>('pm.habits.items', defaultHabits)
  const [habitDone, setHabitDone] = useStored<Record<string, string[]>>(
    'pm.habits.done',
    {},
  )
  const [frozen] = useStored<Record<string, string[]>>('pm.frozen', {})
  const [drafts, setDrafts] = useState<Record<Tier, string>>({
    major: '',
    medium: '',
    small: '',
  })
  const [name] = useStored('pm.user.name', '')
  const [journal, setJournal] = useStored<Record<string, JournalEntry>>('pm.journal', {})
  const [carryDismissed, setCarryDismissed] = useStored<Record<string, boolean>>(
    'pm.carry.dismissed',
    {},
  )
  const [journalDraft, setJournalDraft] = useState<JournalEntry>(
    () => journal[today] ?? { stars: 0, good: '', grateful: '' },
  )
  const [journalSaved, setJournalSaved] = useState(() => !!journal[today])
  const [health, setHealth] = useStored<Record<string, Record<string, number>>>(
    'pm.health',
    {},
  )
  const [budgets] = useStored<Record<string, number>>('pm.budgets', {})
  const [expenses] = useStored<Expense[]>('pm.expenses', [])
  const [mealPlan] = useStored<Record<number, string>>('pm.mealplan', {})
  const [reportDismissed, setReportDismissed] = useStored('pm.weekreport.dismissed', '')

  const tasks = plans[today] ?? []
  const setTasks = (next: PlanTask[]) => setPlans({ ...plans, [today]: next })

  const addTask = (tier: Tier) => {
    const text = drafts[tier].trim()
    if (!text) return
    if (tasks.filter((t) => t.tier === tier).length >= tierMeta[tier].max) return
    setTasks([...tasks, { id: uid(), text, tier, done: false }])
    setDrafts({ ...drafts, [tier]: '' })
  }

  const toggleTask = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (task && !task.done) awardXp(`task:${task.tier}:${id}`, tierXp[task.tier])
    const next = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    if (next.length > 0 && next.every((t) => t.done)) confetti()
    setTasks(next)
  }

  const removeTask = (id: string) => setTasks(tasks.filter((t) => t.id !== id))
  const doneCount = tasks.filter((t) => t.done).length

  const periodKeys: Record<RoutinePeriod, string> = {
    daily: today,
    weekly: weekKey(),
    monthly: monthKey(),
  }
  const dailyRoutine = {
    done: (routineDone[periodKeys.daily] ?? []).filter((id) =>
      routineItems.daily.some((i) => i.id === id),
    ).length,
    total: routineItems.daily.length,
  }

  const habitDoneToday = (h: Habit) => (habitDone[h.id] ?? []).includes(today)
  const toggleHabit = (h: Habit) => {
    const dates = habitDone[h.id] ?? []
    if (!habitDoneToday(h)) awardXp(`habit:${h.id}:${today}`, XP.habit)
    setHabitDone({
      ...habitDone,
      [h.id]: habitDoneToday(h) ? dates.filter((d) => d !== today) : [...dates, today],
    })
  }

  const yesterday = dateKey(addDays(new Date(), -1))
  const unfinished = (plans[yesterday] ?? []).filter((t) => !t.done)
  const showCarry = unfinished.length > 0 && !carryDismissed[today]

  const carryOver = () => {
    setPlans({
      ...plans,
      [today]: [...tasks, ...unfinished.map((t) => ({ ...t, id: uid() }))],
      [yesterday]: (plans[yesterday] ?? []).filter((t) => t.done),
    })
    setCarryDismissed({ ...carryDismissed, [today]: true })
  }

  const autopilot = () => {
    const queue = unfinished.map((t) => t.text)
    const majorText = queue.shift() ?? 'Dagens viktigaste sak — byt ut mig'
    const mediumDefaults = ['30 min träning', '15 min om pengar', 'Rensa inkorgen']
    const smallDefaults = [
      'Bädda sängen', 'Drick 8 glas vatten', '5 min uppstädning',
      'Planera morgondagen', 'Kvällsreflektion',
    ]
    const mediums = [...queue.splice(0, 3)]
    while (mediums.length < 3) mediums.push(mediumDefaults[mediums.length % 3])
    const smalls = [...queue.splice(0, 5)]
    for (const d of smallDefaults) {
      if (smalls.length >= 5) break
      if (!smalls.includes(d)) smalls.push(d)
    }
    const built: PlanTask[] = [
      { id: uid(), text: majorText, tier: 'major', done: false },
      ...mediums.map((text) => ({ id: uid(), text, tier: 'medium' as Tier, done: false })),
      ...smalls.map((text) => ({ id: uid(), text, tier: 'small' as Tier, done: false })),
    ]
    setPlans({
      ...plans,
      [today]: built,
      [yesterday]: (plans[yesterday] ?? []).filter((t) => t.done),
    })
    setCarryDismissed({ ...carryDismissed, [today]: true })
  }

  const saveJournal = () => {
    if (!journalDraft.stars && !journalDraft.good && !journalDraft.grateful) return
    setJournal({ ...journal, [today]: journalDraft })
    awardXp(`journal:${today}`, XP.journal)
    setJournalSaved(true)
  }

  const [planOffset, setPlanOffset] = useState(1)
  const [futureDraft, setFutureDraft] = useState('')
  const upcoming = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1))
  const dayShort = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör']
  const selectedDate = dateKey(addDays(new Date(), planOffset))
  const futureTasks = plans[selectedDate] ?? []

  const addFuture = () => {
    const text = futureDraft.trim()
    if (!text) return
    setPlans({
      ...plans,
      [selectedDate]: [...futureTasks, { id: uid(), text, tier: 'small', done: false }],
    })
    setFutureDraft('')
  }

  const addWater = () => {
    const day = { ...health[today] }
    day.water = (day.water ?? 0) + 1
    setHealth({ ...health, [today]: day })
  }

  const greeting =
    hour < 5 ? 'God natt' : hour < 10 ? 'God morgon' : hour < 18 ? 'Hej' : 'God kväll'

  const weekdayIndex = (new Date().getDay() + 6) % 7
  const todaysMeal = meals.find((m) => m.id === mealPlan[weekdayIndex])

  const habitsDoneToday = habits.filter((h) => habitDoneToday(h)).length
  const rings = [
    { pct: tasks.length ? (doneCount / tasks.length) * 100 : 0, color: 'var(--gold)', label: 'Plan', icon: '☀️' },
    { pct: habits.length ? (habitsDoneToday / habits.length) * 100 : 0, color: 'var(--green)', label: 'Vanor', icon: '📊' },
    { pct: dailyRoutine.total ? (dailyRoutine.done / dailyRoutine.total) * 100 : 0, color: 'var(--blue)', label: 'Rutiner', icon: '🏠' },
  ]

  // -- veckorapport --
  const thisWeekKey = weekKey()
  const lastWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), -7)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i)
    return dateKey(d)
  })
  const xpByDay = xpDays()
  const lastWeekXp = lastWeekDays.reduce((s, d) => s + (xpByDay[d] ?? 0), 0)
  const lastWeekTasks = lastWeekDays.reduce(
    (s, d) => s + (plans[d]?.filter((t) => t.done).length ?? 0), 0,
  )
  const lastWeekSpent = expenses
    .filter((e) => lastWeekDays.includes(e.date))
    .reduce((s, e) => s + e.amount, 0)
  const bestDayIndex = lastWeekDays.reduce(
    (best, d, i) => ((xpByDay[d] ?? 0) > (xpByDay[lastWeekDays[best]] ?? 0) ? i : best), 0,
  )
  const weekdayLong = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag']
  const showReport = reportDismissed !== thisWeekKey && lastWeekXp > 0

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  )
  const quote = dailyQuotes[dayOfYear % dailyQuotes.length]

  let pomoToday = 0
  try {
    pomoToday = Number(
      JSON.parse(localStorage.getItem('pm.pomo.rounds.' + new Date().toDateString()) ?? '0'),
    )
  } catch {
    // trasig lagring — behandla som 0 pass
  }

  // ---------- bygg den rankade kortlistan ----------
  const cards: Card[] = []

  if (showCarry) {
    cards.push({
      priority: 95,
      key: 'carry',
      node: (
        <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
          <div className="card-title">Från igår</div>
          <div className="card-sub">
            Du har {unfinished.length}{' '}
            {unfinished.length === 1 ? 'ouppklarad uppgift' : 'ouppklarade uppgifter'}{' '}
            från igår. Klart är bättre än perfekt — ta med dem?
          </div>
          {unfinished.map((t) => (
            <div className="check-row" key={t.id}>
              <span className="check-label">{t.text}</span>
            </div>
          ))}
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={carryOver}>
              Flytta till idag
            </button>
            <button
              className="btn-ghost"
              onClick={() => setCarryDismissed({ ...carryDismissed, [today]: true })}
            >
              Släpp dem
            </button>
          </div>
        </div>
      ),
    })
  }

  if (showReport) {
    cards.push({
      priority: 90,
      key: 'report',
      node: (
        <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
          <div className="card-title">📊 Din veckorapport</div>
          <div className="card-sub">Förra veckan, automatiskt sammanställd.</div>
          <div className="result-line"><span>XP intjänade</span><span className="value">{lastWeekXp}</span></div>
          <div className="result-line"><span>Uppgifter avklarade</span><span className="value">{lastWeekTasks}</span></div>
          <div className="result-line">
            <span>Bästa dagen</span>
            <span className="value" style={{ textTransform: 'capitalize' }}>{weekdayLong[bestDayIndex]}</span>
          </div>
          <div className="result-line"><span>Utgifter</span><span className="value">{kr(lastWeekSpent)}</span></div>
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={() => setReportDismissed(thisWeekKey)}>
              Snyggt — ny vecka, nya mål 💪
            </button>
          </div>
        </div>
      ),
    })
  }

  // streaks i fara — täckta av frys räknas inte som i fara
  for (const h of habits) {
    if (habitDoneToday(h)) continue
    const streak = streakWith(habitDone[h.id] ?? [], frozen[h.id] ?? [])
    if (streak < 3) continue
    cards.push({
      priority: 85,
      key: 'streak-' + h.id,
      node: (
        <div className="card" style={{ borderColor: 'var(--red)' }} key={'streak-' + h.id}>
          <div className="card-title">🔥 Streak i fara</div>
          <div className="card-sub">
            {streak} dagars streak på "{h.name}" ryker om du inte kör idag.
          </div>
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={() => toggleHabit(h)}>
              ✅ Klar idag — rädda streaken
            </button>
          </div>
        </div>
      ),
    })
  }

  // budget
  const month = monthKey()
  for (const [cat, budget] of Object.entries(budgets)) {
    const spent = expenses
      .filter((e) => e.date.startsWith(month) && e.category === cat)
      .reduce((s, e) => s + e.amount, 0)
    const pct = Math.round((spent / budget) * 100)
    if (pct >= 100) {
      cards.push({
        priority: 80,
        key: 'budget-' + cat,
        node: (
          <div className="card" style={{ borderColor: 'var(--red)' }} key={'budget-' + cat}>
            <div className="card-title">🚨 Budget sprängd</div>
            <div className="card-sub">
              {cat}-budgeten är {pct} % använd ({kr(spent)} / {kr(budget)}).
            </div>
            <div className="add-row">
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => goTo('economy')}>
                Öppna Ekonomi
              </button>
            </div>
          </div>
        ),
      })
    } else if (pct >= 80) {
      cards.push({
        priority: 65,
        key: 'budget-' + cat,
        node: (
          <div className="card" key={'budget-' + cat}>
            <div className="card-title">💸 Budget nästan slut</div>
            <div className="card-sub">
              {cat}-budgeten är {pct} % använd — håll i hatten.
            </div>
          </div>
        ),
      })
    }
  }

  cards.push({
    priority: 75,
    key: 'plan',
    node: (
      <div className="card" key="plan">
        <div className="card-title">Dagens plan · 1-3-5</div>
        <div className="card-sub">
          1 stor, 3 mellanstora och 5 små uppgifter. Ät grodan 🐸 — börja med den stora.
        </div>
        {tasks.length === 0 && (
          <div className="add-row" style={{ marginTop: 0 }}>
            <button className="btn" style={{ flex: 1 }} onClick={autopilot}>
              🤖 Autopilot — fyll min dag
            </button>
          </div>
        )}
        {tasks.length > 0 && (
          <>
            <div className="progress"><div style={{ width: `${(doneCount / tasks.length) * 100}%` }} /></div>
            <div className="progress-label">{doneCount} av {tasks.length} klara</div>
            {doneCount === tasks.length && (
              <div className="celebrate">🎉 Allt klart! Disciplin idag, frihet imorgon.</div>
            )}
          </>
        )}
        {(Object.keys(tierMeta) as Tier[]).map((tier) => {
          const list = tasks.filter((t) => t.tier === tier)
          const full = list.length >= tierMeta[tier].max
          return (
            <div key={tier}>
              <div className="tier-head">
                <span className="tier-name">
                  {tierMeta[tier].label}
                  {tier === 'major' && <span className="frog"> · grodan 🐸</span>}
                </span>
                <span className="tier-count">{list.length}/{tierMeta[tier].max}</span>
              </div>
              {list.map((t) => (
                <div className="check-row" key={t.id}>
                  <button className={`checkbox ${t.done ? 'on' : ''}`} onClick={() => toggleTask(t.id)} aria-label="Klar">✓</button>
                  <span className={`check-label ${t.done ? 'done' : ''}`}>{t.text}</span>
                  <button className="row-del" onClick={() => removeTask(t.id)}>✕</button>
                </div>
              ))}
              {!full && (
                <div className="add-row">
                  <input
                    value={drafts[tier]}
                    placeholder="Lägg till uppgift…"
                    onChange={(e) => setDrafts({ ...drafts, [tier]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addTask(tier)}
                  />
                  <button className="btn" onClick={() => addTask(tier)}>+</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    ),
  })

  const patterns = getPatterns()
  if (patterns.length > 0) {
    cards.push({
      priority: 60,
      key: 'patterns',
      node: (
        <div className="card" key="patterns">
          <div className="card-title">🧬 Dina mönster</div>
          <div className="card-sub">
            Upptäckta i din egen data med riktig statistik — helt lokalt, ingen
            server ser något.
          </div>
          {patterns.slice(0, 3).map((p, i) => (
            <div className="insight" key={i}>
              <span className="insight-icon">{p.icon}</span>
              <span>{p.text}</span>
            </div>
          ))}
        </div>
      ),
    })
  }

  cards.push({
    priority: 55,
    key: 'routines',
    node: (
      <div className="card" key="routines">
        <button className="link-row" onClick={() => goTo('routines')}>
          <div>
            <div className="card-title">Dagens rutiner</div>
            <div className="progress-label">{dailyRoutine.done} av {dailyRoutine.total} klara — tryck för att öppna</div>
          </div>
          <span style={{ color: 'var(--gold)', fontSize: 20 }}>›</span>
        </button>
        <div className="progress">
          <div style={{ width: `${dailyRoutine.total ? (dailyRoutine.done / dailyRoutine.total) * 100 : 0}%` }} />
        </div>
      </div>
    ),
  })

  cards.push({
    priority: 50,
    key: 'habits',
    node: (
      <div className="card" key="habits">
        <div className="card-title">Dagens vanor</div>
        <div className="card-sub">Bocka av direkt härifrån.</div>
        {habits.length === 0 && <div className="empty">Inga vanor ännu — lägg till under Vanor.</div>}
        {habits.map((h) => (
          <div className="check-row" key={h.id}>
            <button className={`checkbox ${habitDoneToday(h) ? 'on' : ''}`} onClick={() => toggleHabit(h)} aria-label="Klar">✓</button>
            <span className={`check-label ${habitDoneToday(h) ? 'done' : ''}`}>{h.name}</span>
          </div>
        ))}
      </div>
    ),
  })

  if (pomoToday === 0 && hour >= 9 && hour < 21) {
    cards.push({
      priority: 45,
      key: 'focus-nudge',
      node: (
        <div className="card" key="focus-nudge">
          <div className="card-title">🍅 Inget fokuspass ännu</div>
          <div className="card-sub">25 minuter räcker för att komma igång.</div>
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={() => goTo('focus')}>
              Öppna Fokus
            </button>
          </div>
        </div>
      ),
    })
  }

  if (todaysMeal) {
    cards.push({
      priority: 40,
      key: 'meal',
      node: (
        <div className="card" key="meal">
          <button className="link-row" onClick={() => goTo('meals')}>
            <div>
              <div className="card-title">Dagens middag</div>
              <div className="progress-label">{todaysMeal.icon} {todaysMeal.name} — tryck för receptet</div>
            </div>
            <span style={{ color: 'var(--gold)', fontSize: 20 }}>›</span>
          </button>
        </div>
      ),
    })
  }

  const waterToday = health[today]?.water ?? 0
  if (hour >= 14 && waterToday < 4) {
    cards.push({
      priority: 38,
      key: 'water',
      node: (
        <div className="card" key="water">
          <div className="card-title">💧 Dags att dricka</div>
          <div className="card-sub">{waterToday} glas hittills idag.</div>
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={addWater}>+ Ett glas</button>
          </div>
        </div>
      ),
    })
  }

  const sleepToday = health[today]?.sleep ?? 0
  if (sleepToday > 0 && sleepToday < 6) {
    cards.push({
      priority: 36,
      key: 'sleep',
      node: (
        <div className="card" key="sleep">
          <div className="card-title">😴 Kort natt</div>
          <div className="card-sub">
            Bara {String(sleepToday).replace('.', ',')} h sömn — sänk ribban och var
            snäll mot dig själv idag.
          </div>
        </div>
      ),
    })
  }

  cards.push({
    priority: 30,
    key: 'journal',
    node: (
      <div className="card" key="journal">
        <div className="card-title">Kvällsreflektion</div>
        {journalSaved ? (
          <>
            <div className="card-sub">
              Dagens betyg: {'★'.repeat(journalDraft.stars) + '☆'.repeat(5 - journalDraft.stars)}
            </div>
            {journalDraft.good && <div className="check-row"><span className="check-label">💪 {journalDraft.good}</span></div>}
            {journalDraft.grateful && <div className="check-row"><span className="check-label">🙏 {journalDraft.grateful}</span></div>}
            <div className="add-row"><button className="btn-ghost" onClick={() => setJournalSaved(false)}>Ändra</button></div>
          </>
        ) : (
          <>
            <div className="card-sub">30 sekunder innan du lägger dig — det bygger självinsikt.</div>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} className={`star ${journalDraft.stars >= s ? 'on' : ''}`} onClick={() => setJournalDraft({ ...journalDraft, stars: s })}>★</button>
              ))}
            </div>
            <div className="add-row">
              <input value={journalDraft.good} placeholder="Vad gick bra idag?" onChange={(e) => setJournalDraft({ ...journalDraft, good: e.target.value })} />
            </div>
            <div className="add-row">
              <input value={journalDraft.grateful} placeholder="Vad är du tacksam för?" onChange={(e) => setJournalDraft({ ...journalDraft, grateful: e.target.value })} />
            </div>
            <div className="add-row">
              <button className="btn" style={{ flex: 1 }} onClick={saveJournal}>Spara reflektion (+{XP.journal} XP)</button>
            </div>
          </>
        )}
      </div>
    ),
  })

  cards.push({
    priority: 15,
    key: 'plan-ahead',
    node: (
      <div className="card" key="plan-ahead">
        <div className="card-title">Planera framåt</div>
        <div className="card-sub">
          Lägg uppgifter på kommande dagar — de dyker upp i dagsplanen när dagen kommer.
        </div>
        <div className="chips">
          {upcoming.map((d, i) => {
            const dk = dateKey(d)
            const count = (plans[dk] ?? []).length
            return (
              <button
                key={dk}
                className={`chip ${planOffset === i + 1 ? 'on' : ''}`}
                onClick={() => setPlanOffset(i + 1)}
              >
                {dayShort[d.getDay()]} {d.getDate()}
                {count > 0 && ` · ${count}`}
              </button>
            )
          })}
        </div>
        {futureTasks.map((t) => (
          <div className="check-row" key={t.id}>
            <span className="check-label">{t.text}</span>
            <button
              className="row-del"
              onClick={() =>
                setPlans({ ...plans, [selectedDate]: futureTasks.filter((x) => x.id !== t.id) })
              }
            >
              ✕
            </button>
          </div>
        ))}
        <div className="add-row">
          <input
            value={futureDraft}
            placeholder={`Uppgift ${dayShort[upcoming[planOffset - 1].getDay()].toLowerCase()}dag…`}
            onChange={(e) => setFutureDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFuture()}
          />
          <button className="btn" onClick={addFuture}>+</button>
        </div>
      </div>
    ),
  })

  cards.push({
    priority: 5,
    key: 'quote',
    node: (
      <div className="card" key="quote">
        <div className="card-title">Dagens tanke</div>
        <div className="hint">{quote}</div>
      </div>
    ),
  })

  // reflektionen ska hamna högre upp när kvällen kommer
  const journalCard = cards.find((c) => c.key === 'journal')
  if (journalCard && hour >= 19) journalCard.priority = 70

  cards.sort((a, b) => b.priority - a.priority)

  return (
    <>
      {name && (
        <div className="greeting">
          {greeting}, <span>{name}</span>! 👋
        </div>
      )}

      <div className="card rings-card">
        <div className="card-title">Dagens ringar</div>
        <div className="card-sub">Stäng alla tre — det är hela spelet.</div>
        <Rings rings={rings} />
      </div>

      {cards.map((c) => (
        <div key={c.key}>{c.node}</div>
      ))}
    </>
  )
}
