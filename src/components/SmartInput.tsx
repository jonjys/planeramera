import { useMemo, useRef, useState } from 'react'
import { parseSmart } from '../smartInput'
import { buildAiContext } from '../aiContext'
import { applyAiAction } from '../aiActions'
import type { AiAction } from '../aiActions'

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
  const [scanning, setScanning] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

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

  const scanImage = async (file: File) => {
    setScanning(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('read_failed'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, context: buildAiContext() }),
      })
      const data = await res.json()
      if (!res.ok) {
        onDone('📷 ' + (data.message || 'Kunde inte läsa bilden.'))
        setScanning(false)
        return
      }
      const confirmations: string[] = []
      for (const action of (data.actions ?? []) as AiAction[]) {
        try {
          confirmations.push(applyAiAction(action))
        } catch {
          // ogiltig åtgärd från modellen — hoppa över
        }
      }
      onDone('📷 ' + (confirmations.length ? confirmations.join(' · ') : data.reply))
      setOpen(false)
    } catch {
      onDone(
        '📷 Kunde inte läsa bilden — kräver att appen är deployad på Vercel med ANTHROPIC_API_KEY.',
      )
    }
    setScanning(false)
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
                disabled={scanning}
              />
              <button
                className={`mic ${listening ? 'on' : ''}`}
                onClick={toggleVoice}
                aria-label="Röststyrning"
                disabled={scanning}
              >
                🎤
              </button>
              <button
                className="mic"
                onClick={() => fileRef.current?.click()}
                aria-label="Skanna kvitto eller bild"
                disabled={scanning}
              >
                📷
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void scanImage(f)
                  e.target.value = ''
                }}
              />
            </div>
            {scanning && (
              <div className="scan-loading">🔍 Läser bilden med AI …</div>
            )}
            {!scanning &&
              actions.map((a, i) => (
                <button className="palette-opt" key={i} onClick={() => pick(i)}>
                  <span className="palette-ico">{a.icon}</span>
                  <span>{a.label}</span>
                  {i === 0 && <span className="palette-enter">⏎</span>}
                </button>
              ))}
            {!text && !scanning && (
              <div className="hint" style={{ marginTop: 12 }}>
                Skriv, säg 🎤 eller fota 📷 ett kvitto — appen loggar det själv,
                ingen kategori att välja. Fungerar även på "lunch 120", "köp
                mjölk, ägg", "vatten 3", "7,5 h sömn". Text och tal tolkas
                lokalt; foton skickas till Claude för analys, allt annat stannar
                på din enhet. ✨
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
