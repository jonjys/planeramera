import { useState } from 'react'
import { useStored, dateKey, addDays } from '../store'

interface DayHealth {
  steps?: number
  water?: number
  sleep?: number
  weight?: number
  mood?: number
}

function ShortcutGuide() {
  const [copied, setCopied] = useState(false)
  const template = `${location.origin}/#health=steps:STEG,sleep:TIMMAR`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(template)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // urklipp blockerat — texten går att markera manuellt
    }
  }

  return (
    <div className="card">
      <div className="card-title">🔗 Koppla Apple Hälsa</div>
      <div className="card-sub">
        Med appen Genvägar på iPhone kan Hälsa-datan hoppa in hit automatiskt —
        ett tryck (eller en automation varje kväll):
      </div>
      <div className="check-row">
        <span className="check-label">1. Öppna Genvägar → ny genväg</span>
      </div>
      <div className="check-row">
        <span className="check-label">
          2. Lägg till "Hitta hälsoexempel" för Steg (idag) och Sömn
        </span>
      </div>
      <div className="check-row">
        <span className="check-label">
          3. Lägg till "Öppna URL" och klistra in mallen nedan — byt STEG och
          TIMMAR mot variablerna från steg 2
        </span>
      </div>
      <input
        readOnly
        value={template}
        style={{ width: '100%', marginTop: 10, fontSize: 13 }}
        onFocus={(e) => e.target.select()}
      />
      <div className="add-row">
        <button className="btn-ghost" style={{ flex: 1 }} onClick={copy}>
          {copied ? '✓ Kopierad' : 'Kopiera URL-mallen'}
        </button>
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        När genvägen körs öppnas appen och datan importeras automatiskt. Lägg den
        i en automation kl 21 så sköter den sig själv.
      </div>
    </div>
  )
}

const moods = ['😞', '😐', '🙂', '😄', '🤩']
const dayLetter = ['S', 'M', 'T', 'O', 'T', 'F', 'L']

const WATER_GOAL = 8
const STEP_GOAL = 8000
const SLEEP_GOAL = 8

function Spark({
  data,
  goal,
}: {
  data: { day: string; value: number }[]
  goal: number
}) {
  const max = Math.max(goal, ...data.map((d) => d.value), 1)
  return (
    <div>
      <div className="spark">
        {data.map((d, i) => (
          <div key={i} className="spark-col">
            <div
              className={d.value >= goal ? 'bar goal-met' : 'bar'}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="spark-labels">
        {data.map((d, i) => (
          <span key={i}>{d.day}</span>
        ))}
      </div>
    </div>
  )
}

export default function Health() {
  const [health, setHealth] = useStored<Record<string, DayHealth>>('pm.health', {})
  const today = dateKey()
  const day = health[today] ?? {}

  const set = (patch: Partial<DayHealth>) =>
    setHealth({ ...health, [today]: { ...day, ...patch } })

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6)
    return { key: dateKey(d), day: dayLetter[d.getDay()] }
  })

  const series = (field: keyof DayHealth) =>
    last7.map((d) => ({ day: d.day, value: health[d.key]?.[field] ?? 0 }))

  return (
    <>
      <div className="card">
        <div className="card-title">Hälsa · idag</div>
        <div className="card-sub">
          Apple Hälsa har inget webb-API — men att logga själv tar tio sekunder och
          bygger samma medvetenhet. Det du mäter blir bättre.
        </div>

        <div className="tier-head">
          <span className="tier-name">💧 Vatten</span>
          <span className="tier-count">
            {day.water ?? 0} / {WATER_GOAL} glas
          </span>
        </div>
        <div className="pomo-controls" style={{ justifyContent: 'flex-start' }}>
          <button
            className="btn-ghost"
            onClick={() => set({ water: Math.max(0, (day.water ?? 0) - 1) })}
          >
            −
          </button>
          <button className="btn" onClick={() => set({ water: (day.water ?? 0) + 1 })}>
            + Ett glas
          </button>
        </div>

        <div className="tier-head">
          <span className="tier-name">👟 Steg</span>
          <span className="tier-count">mål {STEP_GOAL.toLocaleString('sv-SE')}</span>
        </div>
        <input
          inputMode="numeric"
          placeholder="Dagens steg (kolla mobilen)…"
          value={day.steps ?? ''}
          onChange={(e) => set({ steps: Number(e.target.value) || 0 })}
          style={{ width: '100%' }}
        />

        <div className="tier-head">
          <span className="tier-name">😴 Sömn</span>
          <span className="tier-count">mål {SLEEP_GOAL} h</span>
        </div>
        <input
          inputMode="decimal"
          placeholder="Timmar i natt…"
          value={day.sleep ?? ''}
          onChange={(e) =>
            set({ sleep: Number(e.target.value.replace(',', '.')) || 0 })
          }
          style={{ width: '100%' }}
        />

        <div className="tier-head">
          <span className="tier-name">⚖️ Vikt</span>
          <span className="tier-count">valfritt</span>
        </div>
        <input
          inputMode="decimal"
          placeholder="Kg…"
          value={day.weight ?? ''}
          onChange={(e) =>
            set({ weight: Number(e.target.value.replace(',', '.')) || 0 })
          }
          style={{ width: '100%' }}
        />

        <div className="tier-head">
          <span className="tier-name">Humör</span>
        </div>
        <div className="mood-row">
          {moods.map((m, i) => (
            <button
              key={i}
              className={`mood ${day.mood === i + 1 ? 'on' : ''}`}
              onClick={() => set({ mood: day.mood === i + 1 ? undefined : i + 1 })}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Senaste 7 dagarna</div>
        <div className="tier-head">
          <span className="tier-name">👟 Steg</span>
        </div>
        <Spark data={series('steps')} goal={STEP_GOAL} />
        <div className="tier-head">
          <span className="tier-name">💧 Vatten (glas)</span>
        </div>
        <Spark data={series('water')} goal={WATER_GOAL} />
        <div className="tier-head">
          <span className="tier-name">😴 Sömn (timmar)</span>
        </div>
        <Spark data={series('sleep')} goal={SLEEP_GOAL} />
      </div>

      <ShortcutGuide />

      <div className="card">
        <div className="card-title">Hara Hachi Bu</div>
        <div className="hint">
          Sluta äta vid 80 % mätt. Dålig sömn och för mycket stimulans skadar både
          minne och fokus — kroppen är systemet allt annat körs på. 🍚
        </div>
      </div>
    </>
  )
}
