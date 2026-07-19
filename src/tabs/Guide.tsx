import { useRef, useState } from 'react'
import { principles, moneyHabits, memoryTips } from '../data'
import type { Principle } from '../data'

function Backup() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')

  const exportData = () => {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      if (key.startsWith('pm.')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key)!)
        } catch {
          // hoppa över trasiga poster
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `planeramera-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Record<string, unknown>
        const keys = Object.keys(data).filter((k) => k.startsWith('pm.'))
        if (!keys.length) throw new Error('inga pm.-nycklar')
        keys.forEach((k) => localStorage.setItem(k, JSON.stringify(data[k])))
        setStatus('✓ Importerad! Laddar om…')
        setTimeout(() => location.reload(), 800)
      } catch {
        setStatus('Kunde inte läsa filen — är det en Planera Mera-backup?')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="card">
      <div className="card-title">Säkerhetskopiera</div>
      <div className="card-sub">
        All data ligger lokalt i din webbläsare. Exportera en backupfil då och då —
        och importera den på en ny enhet.
      </div>
      <div className="pomo-controls" style={{ justifyContent: 'flex-start' }}>
        <button className="btn" onClick={exportData}>
          Exportera data
        </button>
        <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
          Importera
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importData(f)
            e.target.value = ''
          }}
        />
      </div>
      {status && (
        <div className="hint" style={{ marginTop: 10 }}>
          {status}
        </div>
      )}
    </div>
  )
}

function PrincipleCard({ p }: { p: Principle }) {
  return (
    <div className="card principle">
      <div className="p-icon">{p.icon}</div>
      <div>
        <h3>{p.title}</h3>
        <div className="p-sub">{p.subtitle}</div>
        <ul>
          {p.points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Guide() {
  return (
    <>
      <div className="card">
        <div className="card-title">Guiden</div>
        <div className="hint">
          Skärmdumpar fixar inte ditt liv — men rätt information gör det enklare.
          Här är principerna bakom appen, samlade på ett ställe.
        </div>
      </div>

      <div className="guide-section">8 japanska principer mot lathet</div>
      {principles.map((p) => (
        <PrincipleCard key={p.title} p={p} />
      ))}

      <div className="guide-section">Penningvanor som bygger frihet</div>
      {moneyHabits.map((p) => (
        <PrincipleCard key={p.title} p={p} />
      ))}

      <div className="guide-section">Sluta glömma allt</div>
      {memoryTips.map((p) => (
        <PrincipleCard key={p.title} p={p} />
      ))}

      <Backup />

      <div className="card">
        <div className="card-title">Kom ihåg</div>
        <div className="hint">
          Disciplin idag, frihet imorgon. Fokus · Planera · Genomför · Upprepa. ✨
        </div>
      </div>
    </>
  )
}
