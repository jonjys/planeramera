import { useMemo, useRef, useState } from 'react'
import { parseSmart } from '../smartInput'

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function SmartInput({ onDone }: { onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const actions = useMemo(() => parseSmart(text), [text])

  const pick = (i: number) => {
    const action = actions[i]
    if (!action) return
    action.apply()
    onDone(action.done)
    setText('')
    setOpen(false)
  }

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const SR = getSpeechRecognition()
    if (!SR) {
      onDone('🎤 Röststyrning stöds inte i den här webbläsaren')
      return
    }
    const rec = new SR()
    rec.lang = 'sv-SE'
    rec.interimResults = true
    rec.onresult = (event) => {
      const transcript = Array.from(
        event.results as ArrayLike<ArrayLike<{ transcript: string }>>,
        (r) => r[0].transcript,
      )
        .join(' ')
        .trim()
      setText(transcript)
    }
    rec.onend = () => {
      setListening(false)
      // tillbaka till textfältet så Enter bekräftar första tolkningen
      inputRef.current?.focus()
    }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} aria-label="Smart inmatning">
        ✨
      </button>

      {open && (
        <div className="palette-backdrop" onClick={() => setOpen(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <div className="palette-row">
              <input
                ref={inputRef}
                autoFocus
                value={text}
                placeholder={
                  listening
                    ? 'Lyssnar… prata på!'
                    : 'Skriv eller prata: "kaffe 45", "köp mjölk"…'
                }
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') pick(0)
                  if (e.key === 'Escape') setOpen(false)
                }}
              />
              <button
                className={`mic ${listening ? 'on' : ''}`}
                onClick={toggleVoice}
                aria-label="Röststyrning"
              >
                🎤
              </button>
            </div>
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
                skriv rapporten"), vanor ("vana meditation") och rutiner. Tryck på
                🎤 och säg det istället — allt tolkas lokalt på din enhet. ✨
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
