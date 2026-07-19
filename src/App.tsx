import { useEffect, useState } from 'react'
import { useStored } from './store'
import { decodePack, mergePack, packSummary } from './pack'
import type { Pack } from './pack'
import { xpTotal, levelInfo } from './xp'
import { confetti } from './confetti'
import Onboarding from './Onboarding'
import Today from './tabs/Today'
import Routines from './tabs/Routines'
import Habits from './tabs/Habits'
import Focus from './tabs/Focus'
import Health from './tabs/Health'
import Economy from './tabs/Economy'
import Meals from './tabs/Meals'
import Shopping from './tabs/Shopping'
import Discover from './tabs/Discover'
import Profile from './tabs/Profile'
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
  { id: 'profile', label: 'Profil', icon: '👤' },
  { id: 'guide', label: 'Guide', icon: '📖' },
] as const

type TabId = (typeof tabs)[number]['id']

const primaryIds: TabId[] = ['today', 'habits', 'focus', 'economy']
const primaryTabs = tabs.filter((t) => primaryIds.includes(t.id))
const moreTabs = tabs.filter((t) => !primaryIds.includes(t.id))

function readPackFromUrl(): Pack | null {
  if (!location.hash.startsWith('#pack=')) return null
  return decodePack(location.hash.slice('#pack='.length))
}

const healthKeys = ['steps', 'sleep', 'water', 'weight'] as const

function readHealthFromUrl(): Record<string, number> | null {
  if (!location.hash.startsWith('#health=')) return null
  const out: Record<string, number> = {}
  for (const pair of location.hash.slice('#health='.length).split(',')) {
    const [key, value] = pair.split(':')
    const num = Number((value ?? '').replace(',', '.'))
    if ((healthKeys as readonly string[]).includes(key) && isFinite(num) && num > 0) {
      out[key] = num
    }
  }
  return Object.keys(out).length ? out : null
}

function readSharedText(): string | null {
  const params = new URLSearchParams(location.search)
  const text = params.get('text') || params.get('title')
  return text?.trim() || null
}

export default function App() {
  const [tab, setTab] = useStored<TabId>('pm.tab', 'today')
  const [incoming, setIncoming] = useState<Pack | null>(readPackFromUrl)
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('pm.onboarded') === 'true',
  )
  const [xp, setXp] = useState(xpTotal)
  const [moreOpen, setMoreOpen] = useState(false)

  const go = (id: TabId) => {
    setTab(id)
    setMoreOpen(false)
  }

  const [toast, setToast] = useState('')
  const [shared, setShared] = useState<string | null>(readSharedText)

  useEffect(() => {
    const update = () => setXp(xpTotal())
    window.addEventListener('pm-xp', update)
    return () => window.removeEventListener('pm-xp', update)
  }, [])

  // autoimport av hälsodata från iOS-genväg: /#health=steps:8543,sleep:7.5
  useEffect(() => {
    const data = readHealthFromUrl()
    if (!data) return
    try {
      const key = 'pm.health'
      const all = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<
        string,
        Record<string, number>
      >
      const today = new Date()
      const dk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      all[dk] = { ...all[dk], ...data }
      localStorage.setItem(key, JSON.stringify(all))
      const labels: Record<string, (v: number) => string> = {
        steps: (v) => `${v.toLocaleString('sv-SE')} steg`,
        sleep: (v) => `${String(v).replace('.', ',')} h sömn`,
        water: (v) => `${v} glas vatten`,
        weight: (v) => `${String(v).replace('.', ',')} kg`,
      }
      const summary = Object.entries(data)
        .map(([k, v]) => labels[k](v))
        .join(' · ')
      setToast(`❤️ Hälsodata importerad: ${summary}`)
      setTimeout(() => setToast(''), 4500)
    } catch {
      // trasig lagring — hoppa över importen
    }
    history.replaceState(null, '', location.pathname + location.search)
  }, [])

  const acceptShared = () => {
    if (!shared) return
    try {
      const list = JSON.parse(localStorage.getItem('pm.shopping') ?? '[]') as {
        id: string
        text: string
        checked: boolean
      }[]
      if (!list.some((i) => i.text.toLowerCase() === shared.toLowerCase())) {
        list.push({
          id: Math.random().toString(36).slice(2, 10),
          text: shared,
          checked: false,
        })
        localStorage.setItem('pm.shopping', JSON.stringify(list))
      }
      setToast('🛒 Tillagd på inköpslistan!')
      setTimeout(() => setToast(''), 3000)
    } catch {
      // trasig lagring — hoppa över
    }
    history.replaceState(null, '', location.pathname)
    setShared(null)
  }

  const dismissShared = () => {
    history.replaceState(null, '', location.pathname)
    setShared(null)
  }

  const { level } = levelInfo(xp)

  useEffect(() => {
    const last = Number(localStorage.getItem('pm.lastLevel') ?? '1')
    if (level > last) {
      localStorage.setItem('pm.lastLevel', String(level))
      setToast(`⭐ Nivå ${level}! Snyggt jobbat!`)
      confetti()
      const t = setTimeout(() => setToast(''), 3500)
      return () => clearTimeout(t)
    }
    if (level < last) localStorage.setItem('pm.lastLevel', String(level))
  }, [level])

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

  if (!onboarded) {
    return <Onboarding onDone={() => setOnboarded(true)} />
  }

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      <header className="app-header">
        <div className="app-title">
          Planera<span>Mera</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="lvl-badge" onClick={() => setTab('profile')}>
            ⭐ {level}
          </button>
          <div className="app-date">{todayStr}</div>
        </div>
      </header>

      {shared && (
        <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
          <div className="card-title">📥 Delat till Planera Mera</div>
          <div className="card-sub">
            "<strong>{shared}</strong>" — lägga till på inköpslistan?
          </div>
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={acceptShared}>
              🛒 Lägg till
            </button>
            <button className="btn-ghost" onClick={dismissShared}>
              Avvisa
            </button>
          </div>
        </div>
      )}

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
      {tab === 'profile' && <Profile />}
      {tab === 'guide' && <Guide />}

      {moreOpen && (
        <div className="sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grid">
              {moreTabs.map((t) => (
                <button
                  key={t.id}
                  className={`sheet-item ${tab === t.id ? 'active' : ''}`}
                  onClick={() => go(t.id)}
                >
                  <span className="ico">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="tabbar">
        {primaryTabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id && !moreOpen ? 'active' : ''}
            onClick={() => go(t.id)}
          >
            <span className="ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          className={
            moreOpen || !primaryIds.includes(tab) ? 'active' : ''
          }
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <span className="ico">☰</span>
          Mer
        </button>
      </nav>
    </>
  )
}

export type { TabId }
