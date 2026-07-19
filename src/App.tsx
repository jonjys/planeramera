import { useState } from 'react'
import { useStored } from './store'
import { decodePack, mergePack, packSummary } from './pack'
import type { Pack } from './pack'
import Today from './tabs/Today'
import Routines from './tabs/Routines'
import Habits from './tabs/Habits'
import Focus from './tabs/Focus'
import Health from './tabs/Health'
import Economy from './tabs/Economy'
import Meals from './tabs/Meals'
import Shopping from './tabs/Shopping'
import Discover from './tabs/Discover'
import Guide from './tabs/Guide'

const tabs = [
  { id: 'today', label: 'Idag', icon: '☀️' },
  { id: 'routines', label: 'Rutiner', icon: '🏠' },
  { id: 'habits', label: 'Vanor', icon: '📊' },
  { id: 'focus', label: 'Fokus', icon: '🍅' },
  { id: 'health', label: 'Hälsa', icon: '❤️' },
  { id: 'economy', label: 'Ekonomi', icon: '💰' },
  { id: 'meals', label: 'Mat', icon: '🍳' },
  { id: 'shopping', label: 'Inköp', icon: '🛒' },
  { id: 'discover', label: 'Utforska', icon: '🌍' },
  { id: 'guide', label: 'Guide', icon: '📖' },
] as const

type TabId = (typeof tabs)[number]['id']

function readPackFromUrl(): Pack | null {
  if (!location.hash.startsWith('#pack=')) return null
  return decodePack(location.hash.slice('#pack='.length))
}

export default function App() {
  const [tab, setTab] = useStored<TabId>('pm.tab', 'today')
  const [incoming, setIncoming] = useState<Pack | null>(readPackFromUrl)

  const clearHash = () =>
    history.replaceState(null, '', location.pathname + location.search)

  const acceptPack = () => {
    if (!incoming) return
    mergePack(incoming)
    clearHash()
    location.reload()
  }

  const dismissPack = () => {
    clearHash()
    setIncoming(null)
  }

  const todayStr = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <header className="app-header">
        <div className="app-title">
          Planera<span>Mera</span>
        </div>
        <div className="app-date">{todayStr}</div>
      </header>

      {incoming && (
        <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
          <div className="card-title">📦 Paket att följa</div>
          <div className="card-sub">
            <strong>{incoming.name}</strong> av {incoming.author} ·{' '}
            {packSummary(incoming)}
          </div>
          <div className="hint" style={{ marginBottom: 10 }}>
            Innehållet läggs till i dina listor — dubbletter hoppas över. Din
            egen data rörs inte.
          </div>
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={acceptPack}>
              + Följ {incoming.author}
            </button>
            <button className="btn-ghost" onClick={dismissPack}>
              Avvisa
            </button>
          </div>
        </div>
      )}

      {tab === 'today' && <Today goTo={setTab} />}
      {tab === 'routines' && <Routines />}
      {tab === 'habits' && <Habits />}
      {tab === 'focus' && <Focus />}
      {tab === 'health' && <Health />}
      {tab === 'economy' && <Economy />}
      {tab === 'meals' && <Meals />}
      {tab === 'shopping' && <Shopping />}
      {tab === 'discover' && <Discover />}
      {tab === 'guide' && <Guide />}

      <nav className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}

export type { TabId }
