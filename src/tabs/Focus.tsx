import { useEffect, useRef, useState } from 'react'
import { pad, uid, useStored } from '../store'
import { focusMethods } from '../data'

const WORK = 25 * 60
const BREAK = 5 * 60
const LONG_BREAK = 15 * 60
const ROUNDS_BEFORE_LONG = 4

type Phase = 'work' | 'break' | 'longbreak'

const phaseLabel: Record<Phase, string> = {
  work: 'Fokus',
  break: 'Paus',
  longbreak: 'Lång paus',
}

const phaseLength: Record<Phase, number> = {
  work: WORK,
  break: BREAK,
  longbreak: LONG_BREAK,
}

interface NotToDo {
  id: string
  text: string
}

export default function Focus() {
  const [phase, setPhase] = useState<Phase>('work')
  const [left, setLeft] = useState(WORK)
  const [running, setRunning] = useState(false)
  const [rounds, setRounds] = useStored(
    'pm.pomo.rounds.' + new Date().toDateString(),
    0,
  )
  const [notToDo, setNotToDo] = useStored<NotToDo[]>('pm.nottodo', [])
  const [draft, setDraft] = useState('')
  // klockbaserad deadline i stället för att räkna intervall — driftar inte
  // när fliken ligger i bakgrunden
  const endAt = useRef(0)

  useEffect(() => {
    if (!running) return
    endAt.current = Date.now() + left * 1000
    const t = setInterval(() => {
      setLeft(Math.max(0, Math.round((endAt.current - Date.now()) / 1000)))
    }, 250)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => {
    if (!running || left > 0) return
    if (phase === 'work') {
      const nextRounds = rounds + 1
      setRounds(nextRounds)
      const next: Phase =
        nextRounds % ROUNDS_BEFORE_LONG === 0 ? 'longbreak' : 'break'
      setPhase(next)
      setLeft(phaseLength[next])
    } else {
      setPhase('work')
      setLeft(WORK)
    }
    setRunning(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, running])

  const timeStr = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`

  useEffect(() => {
    document.title = running
      ? `${timeStr} · ${phaseLabel[phase]} — Planera Mera`
      : 'Planera Mera'
    return () => {
      document.title = 'Planera Mera'
    }
  }, [timeStr, running, phase])

  const reset = () => {
    setRunning(false)
    setLeft(phaseLength[phase])
  }

  const skip = () => {
    setRunning(false)
    if (phase === 'work') {
      setPhase('break')
      setLeft(BREAK)
    } else {
      setPhase('work')
      setLeft(WORK)
    }
  }

  const addNotToDo = () => {
    const text = draft.trim()
    if (!text) return
    setNotToDo([...notToDo, { id: uid(), text }])
    setDraft('')
  }

  return (
    <>
      <div className="card pomo">
        <div className="pomo-phase">{phaseLabel[phase]}</div>
        <div className="pomo-time">{timeStr}</div>
        <div className="pomo-rounds">🍅 {rounds} rundor idag</div>
        <div className="pomo-controls">
          <button className="btn" onClick={() => setRunning(!running)}>
            {running ? 'Pausa' : 'Starta'}
          </button>
          <button className="btn-ghost" onClick={reset}>
            Nollställ
          </button>
          <button className="btn-ghost" onClick={skip}>
            Hoppa över
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Din fokusritual</div>
        <div className="card-sub">
          Gör samma sak varje gång innan du startar — hjärnan kopplar ritualen till
          djupt fokus.
        </div>
        <div className="check-row">
          <span className="check-label">1. Ta ett djupt andetag 🫁</span>
        </div>
        <div className="check-row">
          <span className="check-label">2. Säg en kort fras: "Fokus. Nu kör vi."</span>
        </div>
        <div className="check-row">
          <span className="check-label">3. En uppgift. Inget multitaskande.</span>
        </div>
        <div className="check-row">
          <span className="check-label">4. Starta timern och räkna 5-4-3-2-1 🚀</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Min "inte göra"-lista</div>
        <div className="card-sub">
          Det du INTE gör skyddar din energi. Scrolla under fokuspass? Kolla mejl
          var femte minut? Skriv upp det här.
        </div>
        {notToDo.map((n) => (
          <div className="check-row" key={n.id}>
            <span className="check-label">🚫 {n.text}</span>
            <button
              className="row-del"
              onClick={() => setNotToDo(notToDo.filter((x) => x.id !== n.id))}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="add-row">
          <input
            value={draft}
            placeholder="T.ex. Sociala medier före lunch…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNotToDo()}
          />
          <button className="btn" onClick={addNotToDo}>
            +
          </button>
        </div>
      </div>

      {focusMethods.map((m) => (
        <div className="card principle" key={m.title}>
          <div className="p-icon">{m.icon}</div>
          <div>
            <h3>{m.title}</h3>
            <div className="p-sub">{m.subtitle}</div>
            <ul>
              {m.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </>
  )
}
