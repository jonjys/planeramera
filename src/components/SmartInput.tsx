import { useMemo, useState } from 'react'
import { parseSmart } from '../smartInput'

export default function SmartInput({ onDone }: { onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const actions = useMemo(() => parseSmart(text), [text])

  const pick = (i: number) => {
    const action = actions[i]
    if (!action) return
    action.apply()
    onDone(action.done)
    setText('')
    setOpen(false)
  }

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} aria-label="Smart inmatning">
        ✨
      </button>

      {open && (
        <div className="palette-backdrop" onClick={() => setOpen(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={text}
              placeholder='Skriv som du tänker: "kaffe 45", "köp mjölk", "vatten 3"…'
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') pick(0)
                if (e.key === 'Escape') setOpen(false)
              }}
            />
            {actions.map((a, i) => (
              <button className="palette-opt" key={i} onClick={() => pick(i)}>
                <span className="palette-ico">{a.icon}</span>
                <span>{a.label}</span>
                {i === 0 && <span className="palette-enter">⏎</span>}
              </button>
            ))}
            {!text && (
              <div className="hint" style={{ marginTop: 12 }}>
                Appen förstår: utgifter ("lunch 120"), inköp ("köp mjölk, ägg"),
                hälsa ("vatten 3", "7,5 h sömn", "8500 steg"), uppgifter ("stor
                skriv rapporten"), vanor ("vana meditation") och rutiner. Allt
                tolkas lokalt på din enhet. ✨
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
