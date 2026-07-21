import { useState } from 'react'
import { useStored } from '../store'
import { buildAiContext } from '../aiContext'
import { applyAiAction } from '../aiActions'
import type { AiAction } from '../aiActions'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export default function AiCoach() {
  const [history, setHistory] = useStored<ChatMsg[]>('pm.ai.chat', [])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [speak, setSpeak] = useStored('pm.ai.speak', false)

  const sayIt = (text: string) => {
    if (!speak || !('speechSynthesis' in window)) return
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'sv-SE'
      speechSynthesis.cancel()
      speechSynthesis.speak(utterance)
    } catch {
      // talsyntes blockerad — inte kritiskt
    }
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || loading) return
    const nextHistory = [...history, { role: 'user' as const, content: text }]
    setHistory(nextHistory)
    setDraft('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.slice(-16),
          context: buildAiContext(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Något gick fel med AI-Coachen.')
        setLoading(false)
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
      const reply =
        data.reply + (confirmations.length ? '\n\n' + confirmations.join('\n') : '')
      setHistory([...nextHistory, { role: 'assistant', content: reply }])
      sayIt(data.reply)
    } catch {
      setError(
        'Kunde inte nå AI-Coachen. Fungerar bara när appen är deployad på Vercel med ANTHROPIC_API_KEY satt.',
      )
    }
    setLoading(false)
  }

  return (
    <>
      <div className="card">
        <div className="card-title">🤖 AI-Coach</div>
        <div className="card-sub">
          Fråga vad som helst om din dag, ekonomi, vanor eller hälsa — Coachen ser
          din data och kan agera åt dig (logga en utgift, lägga till en uppgift,
          handla in, mm).
        </div>
        <div className="hint">
          Kräver att <code>ANTHROPIC_API_KEY</code> är satt i Vercel-projektets
          miljövariabler (Settings → Environment Variables).
        </div>
        <div className="add-row">
          <button
            className="btn-ghost"
            style={{ flex: 1 }}
            onClick={() => {
              if (speak) speechSynthesis?.cancel()
              setSpeak(!speak)
            }}
          >
            {speak ? '🔊 Uppläsning: På' : '🔇 Uppläsning: Av'}
          </button>
        </div>
      </div>

      <div className="card">
        {history.length === 0 && (
          <div className="empty">
            Testa: "Hur går det med min vecka?", "logga 89 kr på lunch", "lägg
            till mjölk och ägg på listan", "vad ska jag fokusera på idag?"
          </div>
        )}
        <div className="ai-chat">
          {history.map((m, i) => (
            <div key={i} className={`ai-bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
          {loading && <div className="ai-bubble assistant">Tänker …</div>}
        </div>
        {error && <div className="hint" style={{ color: 'var(--red)' }}>{error}</div>}
        <div className="add-row">
          <input
            value={draft}
            placeholder="Skriv till Coachen…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button className="btn" onClick={send} disabled={loading}>
            Skicka
          </button>
        </div>
        {history.length > 0 && (
          <div className="add-row">
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setHistory([])}>
              Rensa konversation
            </button>
          </div>
        )}
      </div>
    </>
  )
}
