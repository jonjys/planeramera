import { useState } from 'react'
import { useStored, dateKey, weekDates, addDays, uid } from '../store'
import { defaultHabits } from '../data'
import type { Habit } from '../types'

const dayNames = ['M', 'T', 'O', 'T', 'F', 'L', 'S']

function streak(dates: string[]): number {
  const set = new Set(dates)
  let count = 0
  let cursor = new Date()
  // streaken lever så länge idag eller igår är avbockad
  if (!set.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1)
    if (!set.has(dateKey(cursor))) return 0
  }
  while (set.has(dateKey(cursor))) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export default function Habits() {
  const [habits, setHabits] = useStored<Habit[]>('pm.habits.items', defaultHabits)
  const [done, setDone] = useStored<Record<string, string[]>>('pm.habits.done', {})
  const [draft, setDraft] = useState('')

  const today = dateKey()
  const week = weekDates()

  const toggle = (habitId: string, day: string) => {
    if (day > today) return
    const dates = done[habitId] ?? []
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
        <div className="card-title">Veckans framsteg</div>
        <div className="card-sub">
          Motivation ensam förändrar inte beteende — synliga framsteg gör det. Små
          steg, stor förändring.
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
                return (
                  <tr key={h.id}>
                    <td className="habit-name">{h.name}</td>
                    {week.map((d, i) => {
                      const dk = dateKey(d)
                      const isFuture = dk > today
                      return (
                        <td key={i} className={dk === today ? 'today-col' : ''}>
                          <button
                            className={`day-dot ${dates.includes(dk) ? 'on' : ''} ${
                              isFuture ? 'future' : ''
                            }`}
                            onClick={() => toggle(h.id, dk)}
                            aria-label={dk}
                          >
                            ✓
                          </button>
                        </td>
                      )
                    })}
                    <td>
                      <span className="streak">🔥 {streak(dates)}</span>
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
