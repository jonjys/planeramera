import { useState } from 'react'
import { useStored, dateKey, weekKey, monthKey, uid } from '../store'
import { defaultRoutines } from '../data'
import type { RoutinePeriod, RoutineItem } from '../data'

const periodMeta: Record<RoutinePeriod, { label: string; reset: string }> = {
  daily: { label: 'Dagligt', reset: 'Nollställs varje dag' },
  weekly: { label: 'Veckovis', reset: 'Nollställs varje måndag' },
  monthly: { label: 'Månadsvis', reset: 'Nollställs den 1:a varje månad' },
}

export default function Routines() {
  const [period, setPeriod] = useState<RoutinePeriod>('daily')
  const [items, setItems] = useStored<Record<RoutinePeriod, RoutineItem[]>>(
    'pm.routines.items',
    defaultRoutines,
  )
  const [done, setDone] = useStored<Record<string, string[]>>('pm.routines.done', {})
  const [draft, setDraft] = useState('')

  const periodKeys: Record<RoutinePeriod, string> = {
    daily: dateKey(),
    weekly: weekKey(),
    monthly: monthKey(),
  }
  const key = periodKeys[period]
  const doneIds = done[key] ?? []
  const list = items[period]

  const toggle = (id: string) =>
    setDone({
      ...done,
      [key]: doneIds.includes(id)
        ? doneIds.filter((d) => d !== id)
        : [...doneIds, id],
    })

  const add = () => {
    const text = draft.trim()
    if (!text) return
    setItems({ ...items, [period]: [...list, { id: uid(), text }] })
    setDraft('')
  }

  const remove = (id: string) =>
    setItems({ ...items, [period]: list.filter((i) => i.id !== id) })

  const doneCount = list.filter((i) => doneIds.includes(i.id)).length

  return (
    <>
      <div className="segments">
        {(Object.keys(periodMeta) as RoutinePeriod[]).map((p) => (
          <button
            key={p}
            className={period === p ? 'active' : ''}
            onClick={() => setPeriod(p)}
          >
            {periodMeta[p].label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Minsta hemrutin · {periodMeta[period].label}</div>
        <div className="card-sub">{periodMeta[period].reset}.</div>

        <div className="progress">
          <div
            style={{ width: `${list.length ? (doneCount / list.length) * 100 : 0}%` }}
          />
        </div>
        <div className="progress-label">
          {doneCount} av {list.length} klara
        </div>

        {list.map((item) => (
          <div className="check-row" key={item.id}>
            <button
              className={`checkbox ${doneIds.includes(item.id) ? 'on' : ''}`}
              onClick={() => toggle(item.id)}
              aria-label="Klar"
            >
              ✓
            </button>
            <span
              className={`check-label ${doneIds.includes(item.id) ? 'done' : ''}`}
            >
              {item.text}
            </span>
            <button className="row-del" onClick={() => remove(item.id)}>
              ✕
            </button>
          </div>
        ))}

        <div className="add-row">
          <input
            value={draft}
            placeholder="Lägg till egen rutin…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn" onClick={add}>
            +
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Varför rutiner?</div>
        <div className="hint">
          En rörig miljö skapar mentalt brus. System fungerar bättre än motivation —
          ju färre beslut du behöver ta, desto mindre mental trötthet. 🗂️
        </div>
      </div>
    </>
  )
}
