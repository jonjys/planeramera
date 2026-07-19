import { useState } from 'react'
import { useStored, dateKey, weekKey, monthKey, uid, addDays } from '../store'
import { defaultRoutines, defaultHabits } from '../data'
import type { RoutinePeriod, RoutineItem } from '../data'
import type { PlanTask, Tier, Habit } from '../types'
import type { TabId } from '../App'
import { awardXp, XP } from '../xp'

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
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
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

  const saveJournal = () => {
    if (!journalDraft.stars && !journalDraft.good && !journalDraft.grateful) return
    setJournal({ ...journal, [today]: journalDraft })
    awardXp(`journal:${today}`, XP.journal)
    setJournalSaved(true)
  }

  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'God natt' : hour < 10 ? 'God morgon' : hour < 18 ? 'Hej' : 'God kväll'

  return (
    <>
      {name && (
        <div className="greeting">
          {greeting}, <span>{name}</span>! 👋
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
        <div className="card-title">Dagens påminnelse</div>
        <div className="hint">
          Klart är bättre än perfekt. Börja med något så litet att hjärnan inte kan
          vägra — en minut räcker. 🌱
        </div>
      </div>
    </>
  )
}
