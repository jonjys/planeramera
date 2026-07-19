import { useStored } from './store'
import Today from './tabs/Today'
import Routines from './tabs/Routines'
import Habits from './tabs/Habits'
import Focus from './tabs/Focus'
import Economy from './tabs/Economy'
import Meals from './tabs/Meals'
import Shopping from './tabs/Shopping'
import Guide from './tabs/Guide'

const tabs = [
  { id: 'today', label: 'Idag', icon: '☀️' },
  { id: 'routines', label: 'Rutiner', icon: '🏠' },
  { id: 'habits', label: 'Vanor', icon: '📊' },
  { id: 'focus', label: 'Fokus', icon: '🍅' },
  { id: 'economy', label: 'Ekonomi', icon: '💰' },
  { id: 'meals', label: 'Mat', icon: '🍳' },
  { id: 'shopping', label: 'Inköp', icon: '🛒' },
  { id: 'guide', label: 'Guide', icon: '📖' },
] as const

type TabId = (typeof tabs)[number]['id']

export default function App() {
  const [tab, setTab] = useStored<TabId>('pm.tab', 'today')

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

      {tab === 'today' && <Today goTo={setTab} />}
      {tab === 'routines' && <Routines />}
      {tab === 'habits' && <Habits />}
      {tab === 'focus' && <Focus />}
      {tab === 'economy' && <Economy />}
      {tab === 'meals' && <Meals />}
      {tab === 'shopping' && <Shopping />}
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
