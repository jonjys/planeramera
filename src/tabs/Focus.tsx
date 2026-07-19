import { useEffect, useRef, useState } from 'react'
import { pad, useStored } from '../store'
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

export default function Focus() {
  const [phase, setPhase] = useState<Phase>('work')
  const [left, setLeft] = useState(WORK)
  const [running, setRunning] = useState(false)
  const [rounds, setRounds] = useStored('pm.pomo.rounds.' + new Date().toDateString(), 0)
  const interval = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!running) return
    interval.current = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(interval.current)
  }, [running])

  useEffect(() => {
    if (left > 0) return
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
  }, [left]) // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <>
      <div className="card pomo">
        <div className="pomo-phase">{phaseLabel[phase]}</div>
        <div className="pomo-time">
          {pad(Math.floor(left / 60))}:{pad(left % 60)}
        </div>
        <div className="pomo-rounds">
          🍅 {rounds} rundor idag
          {rounds > 0 && rounds % ROUNDS_BEFORE_LONG === 0 && phase !== 'work'
            ? ' — dags för lång paus!'
            : ''}
        </div>
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
