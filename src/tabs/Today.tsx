import { useState } from 'react'
import { useStored, dateKey, weekKey, monthKey, uid, addDays } from '../store'
import { defaultRoutines, defaultHabits } from '../data'
import type { RoutinePeriod, RoutineItem } from '../data'
import type { PlanTask, Tier, Habit } from '../types'
import type { TabId } from '../App'
import { awardXp, XP } from '../xp'
import { confetti } from '../confetti'
import { meals, dailyQuotes } from '../data'
import { getInsights } from '../insights'
import { xpDays } from '../xp'
import Rings from '../components/Rings'
import { weekDates, kr } from '../store'
import type { Expense } from '../types'

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

export default function Today({ goTo }: { goTo: (t: TabId) => void }) {
  const today = dateKey()
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
  const [drafts, setDrafts] = useState<Record<Tier, string>>({
    major: '',
    medium: '',
    small: '',
  })
  const [name] = useStored('pm.user.name', '')
  const [journal, setJournal] = useStored<Record<string, JournalEntry>>(
    'pm.journal',
    {},
  )
  const [carryDismissed, setCarryDismissed] = useStored<Record<string, boolean>>(
    'pm.carry.dismissed',
    {},
  )
  const [journalDraft, setJournalDraft] = useState<JournalEntry>(
    () => journal[dateKey()] ?? { stars: 0, good: '', grateful: '' },
  )
  const [journalSaved, setJournalSaved] = useState(() => !!journal[dateKey()])

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
  const routineStats = (period: RoutinePeriod) => {
    const items = routineItems[period]
    const done = routineDone[periodKeys[period]] ?? []
    return { done: items.filter((i) => done.includes(i.id)).length, total: items.length }
  }
  const daily = routineStats('daily')

  const habitDoneToday = (h: Habit) => (habitDone[h.id] ?? []).includes(today)
  const toggleHabit = (h: Habit) => {
    const dates = habitDone[h.id] ?? []
    if (!habitDoneToday(h)) awardXp(`habit:${h.id}:${today}`, XP.habit)
    setHabitDone({
      ...habitDone,
      [h.id]: habitDoneToday(h)
        ? dates.filter((d) => d !== today)
        : [...dates, today],
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

  const autopilot = () => {
    const queue = unfinished.map((t) => t.text)
    const majorText = queue.shift() ?? 'Dagens viktigaste sak — byt ut mig'
    const mediumDefaults = ['30 min träning', '15 min om pengar', 'Rensa inkorgen']
    const smallDefaults = [
      'Bädda sängen',
      'Drick 8 glas vatten',
      '5 min uppstädning',
      'Planera morgondagen',
      'Kvällsreflektion',
    ]
    const mediums = [...queue.splice(0, 3)]
    while (mediums.length < 3) mediums.push(mediumDefaults[mediums.length % 3])
    const smalls = [...queue.splice(0, 5)]
    for (const d of smallDefaults) {
      if (smalls.length >= 5) break
      if (!smalls.includes(d)) smalls.push(d)
    }
    const built: PlanTask[] = [
      { id: uid(), text: majorText, tier: 'major' as Tier, done: false },
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

  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'God natt' : hour < 10 ? 'God morgon' : hour < 18 ? 'Hej' : 'God kväll'

  const [mealPlan] = useStored<Record<number, string>>('pm.mealplan', {})
  const weekdayIndex = (new Date().getDay() + 6) % 7
  const todaysMeal = meals.find((m) => m.id === mealPlan[weekdayIndex])

  const insights = getInsights()

  const habitsDoneToday = habits.filter((h) => habitDoneToday(h)).length
  const rings = [
    {
      pct: tasks.length ? (doneCount / tasks.length) * 100 : 0,
      color: 'var(--gold)',
      label: 'Plan',
      icon: '☀️',
    },
    {
      pct: habits.length ? (habitsDoneToday / habits.length) * 100 : 0,
      color: 'var(--green)',
      label: 'Vanor',
      icon: '📊',
    },
    {
      pct: daily.total ? (daily.done / daily.total) * 100 : 0,
      color: 'var(--blue)',
      label: 'Rutiner',
      icon: '🏠',
    },
  ]

  // automatisk veckorapport för förra veckan
  const [reportDismissed, setReportDismissed] = useStored('pm.weekreport.dismissed', '')
  const [expenses] = useStored<Expense[]>('pm.expenses', [])
  const thisWeek = weekKey()
  const lastWeekDays = weekDates(addDays(new Date(), -7)).map((d) => dateKey(d))
  const days = xpDays()
  const lastWeekXp = lastWeekDays.reduce((s, d) => s + (days[d] ?? 0), 0)
  const lastWeekTasks = lastWeekDays.reduce(
    (s, d) => s + (plans[d]?.filter((t) => t.done).length ?? 0),
    0,
  )
  const lastWeekSpent = expenses
    .filter((e) => lastWeekDays.includes(e.date))
    .reduce((s, e) => s + e.amount, 0)
  const bestDayIndex = lastWeekDays.reduce(
    (best, d, i) => ((days[d] ?? 0) > (days[lastWeekDays[best]] ?? 0) ? i : best),
    0,
  )
  const weekdayLong = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag']
  const showReport = reportDismissed !== thisWeek && lastWeekXp > 0

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  )
  const quote = dailyQuotes[dayOfYear % dailyQuotes.length]

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

      <div className="card">
        <div className="card-title">🧭 Coachen</div>
        {insights.map((ins, i) => (
          <div className="insight" key={i}>
            <span className="insight-icon">{ins.icon}</span>
            <span>{ins.text}</span>
          </div>
        ))}
      </div>

      {showReport && (
        <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
          <div className="card-title">📊 Din veckorapport</div>
          <div className="card-sub">Förra veckan, automatiskt sammanställd.</div>
          <div className="result-line">
            <span>XP intjänade</span>
            <span className="value">{lastWeekXp}</span>
          </div>
          <div className="result-line">
            <span>Uppgifter avklarade</span>
            <span className="value">{lastWeekTasks}</span>
          </div>
          <div className="result-line">
            <span>Bästa dagen</span>
            <span className="value" style={{ textTransform: 'capitalize' }}>
              {weekdayLong[bestDayIndex]}
            </span>
          </div>
          <div className="result-line">
            <span>Utgifter</span>
            <span className="value">{kr(lastWeekSpent)}</span>
          </div>
          <div className="add-row">
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => setReportDismissed(thisWeek)}
            >
              Snyggt — ny vecka, nya mål 💪
            </button>
          </div>
        </div>
      )}

      {showCarry && (
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
      )}

      <div className="card">
        <div className="card-title">Dagens plan · 1-3-5</div>
        <div className="card-sub">
          1 stor, 3 mellanstora och 5 små uppgifter. Ät grodan 🐸 — börja med den
          stora.
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
            <div className="progress">
              <div style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
            </div>
            <div className="progress-label">
              {doneCount} av {tasks.length} klara
            </div>
            {doneCount === tasks.length && (
              <div className="celebrate">
                🎉 Allt klart! Disciplin idag, frihet imorgon.
              </div>
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
                <span className="tier-count">
                  {list.length}/{tierMeta[tier].max}
                </span>
              </div>
              {list.map((t) => (
                <div className="check-row" key={t.id}>
                  <button
                    className={`checkbox ${t.done ? 'on' : ''}`}
                    onClick={() => toggleTask(t.id)}
                    aria-label="Klar"
                  >
                    ✓
                  </button>
                  <span className={`check-label ${t.done ? 'done' : ''}`}>
                    {t.text}
                  </span>
                  <button className="row-del" onClick={() => removeTask(t.id)}>
                    ✕
                  </button>
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
                  <button className="btn" onClick={() => addTask(tier)}>
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card">
        <button className="link-row" onClick={() => goTo('routines')}>
          <div>
            <div className="card-title">Dagens rutiner</div>
            <div className="progress-label">
              {daily.done} av {daily.total} klara — tryck för att öppna
            </div>
          </div>
          <span style={{ color: 'var(--gold)', fontSize: 20 }}>›</span>
        </button>
        <div className="progress">
          <div
            style={{
              width: `${daily.total ? (daily.done / daily.total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Dagens vanor</div>
        <div className="card-sub">Bocka av direkt härifrån.</div>
        {habits.length === 0 && (
          <div className="empty">Inga vanor ännu — lägg till under Vanor.</div>
        )}
        {habits.map((h) => (
          <div className="check-row" key={h.id}>
            <button
              className={`checkbox ${habitDoneToday(h) ? 'on' : ''}`}
              onClick={() => toggleHabit(h)}
              aria-label="Klar"
            >
              ✓
            </button>
            <span className={`check-label ${habitDoneToday(h) ? 'done' : ''}`}>
              {h.name}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Planera framåt</div>
        <div className="card-sub">
          Lägg uppgifter på kommande dagar — de dyker upp i dagsplanen när dagen
          kommer.
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
                setPlans({
                  ...plans,
                  [selectedDate]: futureTasks.filter((x) => x.id !== t.id),
                })
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
          <button className="btn" onClick={addFuture}>
            +
          </button>
        </div>
      </div>

      {todaysMeal && (
        <div className="card">
          <button className="link-row" onClick={() => goTo('meals')}>
            <div>
              <div className="card-title">Dagens middag</div>
              <div className="progress-label">
                {todaysMeal.icon} {todaysMeal.name} — tryck för receptet
              </div>
            </div>
            <span style={{ color: 'var(--gold)', fontSize: 20 }}>›</span>
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-title">Kvällsreflektion</div>
        {journalSaved ? (
          <>
            <div className="card-sub">
              Dagens betyg:{' '}
              {'★'.repeat(journalDraft.stars) + '☆'.repeat(5 - journalDraft.stars)}
            </div>
            {journalDraft.good && (
              <div className="check-row">
                <span className="check-label">💪 {journalDraft.good}</span>
              </div>
            )}
            {journalDraft.grateful && (
              <div className="check-row">
                <span className="check-label">🙏 {journalDraft.grateful}</span>
              </div>
            )}
            <div className="add-row">
              <button className="btn-ghost" onClick={() => setJournalSaved(false)}>
                Ändra
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="card-sub">
              30 sekunder innan du lägger dig — det bygger självinsikt.
            </div>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  className={`star ${journalDraft.stars >= s ? 'on' : ''}`}
                  onClick={() => setJournalDraft({ ...journalDraft, stars: s })}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="add-row">
              <input
                value={journalDraft.good}
                placeholder="Vad gick bra idag?"
                onChange={(e) =>
                  setJournalDraft({ ...journalDraft, good: e.target.value })
                }
              />
            </div>
            <div className="add-row">
              <input
                value={journalDraft.grateful}
                placeholder="Vad är du tacksam för?"
                onChange={(e) =>
                  setJournalDraft({ ...journalDraft, grateful: e.target.value })
                }
              />
            </div>
            <div className="add-row">
              <button className="btn" style={{ flex: 1 }} onClick={saveJournal}>
                Spara reflektion (+{XP.journal} XP)
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">Dagens tanke</div>
        <div className="hint">{quote}</div>
      </div>
    </>
  )
}
