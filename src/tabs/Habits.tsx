import { useState } from 'react'
import { useStored, dateKey, weekDates, uid } from '../store'
import { defaultHabits } from '../data'
import type { Habit } from '../types'
import { awardXp, XP } from '../xp'
import { streakWith } from '../streaks'

const dayNames = ['M', 'T', 'O', 'T', 'F', 'L', 'S']

export default function Habits() {
  const [habits, setHabits] = useStored<Habit[]>('pm.habits.items', defaultHabits)
  const [done, setDone] = useStored<Record<string, string[]>>('pm.habits.done', {})
  const [frozen] = useStored<Record<string, string[]>>('pm.frozen', {})
  const [freezes] = useStored<number>('pm.freezes', 0)
  const [draft, setDraft] = useState('')

  const today = dateKey()
  const week = weekDates()

  const toggle = (habitId: string, day: string) => {
    if (day > today) return
    const dates = done[habitId] ?? []
    if (!dates.includes(day)) awardXp(`habit:${habitId}:${day}`, XP.habit)
    setDone({
      ...done,
      [habitId]: dates.includes(day)
        ? dates.filter((d) => d !== day)
        : [...dates, day],
    })
  }

  const add = () => {
    const name = draft.trim()
    if (!name) return
    setHabits([...habits, { id: uid(), name }])
    setDraft('')
  }

  const remove = (id: string) => {
    setHabits(habits.filter((h) => h.id !== id))
    const next = { ...done }
    delete next[id]
    setDone(next)
  }

  return (
    <>
      <div className="card">
        <div className="goal-head">
          <div className="card-title">Veckans framsteg</div>
          <span className="streak">🧊 {freezes} frysningar</span>
        </div>
        <div className="card-sub">
          Motivation ensam förändrar inte beteende — synliga framsteg gör det.
          Frysningar räddar streaks automatiskt när du missar en dag (du får en
          per nivå-upp).
        </div>

        {habits.length === 0 && <div className="empty">Lägg till din första vana nedan.</div>}

        {habits.length > 0 && (
          <table className="habit-grid">
            <thead>
              <tr>
                <th />
                {week.map((d, i) => (
                  <th
                    key={i}
                    className={dateKey(d) === today ? 'today-col' : ''}
                  >
                    {dayNames[i]}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const dates = done[h.id] ?? []
                const ice = frozen[h.id] ?? []
                return (
                  <tr key={h.id}>
                    <td className="habit-name">{h.name}</td>
                    {week.map((d, i) => {
                      const dk = dateKey(d)
                      const isFuture = dk > today
                      const isFrozen = ice.includes(dk) && !dates.includes(dk)
                      return (
                        <td key={i} className={dk === today ? 'today-col' : ''}>
                          <button
                            className={`day-dot ${dates.includes(dk) ? 'on' : ''} ${
                              isFrozen ? 'frozen' : ''
                            } ${isFuture ? 'future' : ''}`}
                            onClick={() => toggle(h.id, dk)}
                            aria-label={dk}
                          >
                            {isFrozen ? '❄' : '✓'}
                          </button>
                        </td>
                      )
                    })}
                    <td>
                      <span className="streak">🔥 {streakWith(dates, ice)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="add-row">
          <input
            value={draft}
            placeholder="Ny vana, t.ex. Meditation…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn" onClick={add}>
            +
          </button>
        </div>
      </div>

      {habits.length > 0 && (
        <div className="card">
          <div className="card-title">Hantera vanor</div>
          {habits.map((h) => (
            <div className="check-row" key={h.id}>
              <span className="check-label">{h.name}</span>
              <span className="streak">
                {(done[h.id] ?? []).length} dagar totalt
              </span>
              <button className="row-del" onClick={() => remove(h.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
