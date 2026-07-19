import { useState } from 'react'
import { useStored } from '../store'
import { creatorPacks, defaultHabits, defaultRoutines } from '../data'
import type { RoutinePeriod, RoutineItem } from '../data'
import { mergePack, packLink, packSummary } from '../pack'
import type { Follow, Pack } from '../pack'
import type { Habit, ShopItem } from '../types'

export default function Discover() {
  const [follows] = useStored<Follow[]>('pm.follows', [])
  const [habits] = useStored<Habit[]>('pm.habits.items', defaultHabits)
  const [routines] = useStored<Record<RoutinePeriod, RoutineItem[]>>(
    'pm.routines.items',
    defaultRoutines,
  )
  const [notToDo] = useStored<{ id: string; text: string }[]>('pm.nottodo', [])
  const [shopping] = useStored<ShopItem[]>('pm.shopping', [])

  const [packName, setPackName] = useState('')
  const [author, setAuthor] = useState('')
  const [incHabits, setIncHabits] = useState(true)
  const [incRoutines, setIncRoutines] = useState(true)
  const [incNotToDo, setIncNotToDo] = useState(false)
  const [incShopping, setIncShopping] = useState(false)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  const follow = (pack: Pack) => {
    mergePack(pack)
    location.reload()
  }

  const isFollowing = (pack: Pack) =>
    follows.some((f) => f.name === pack.name && f.author === pack.author)

  const createLink = () => {
    if (!packName.trim()) return
    const pack: Pack = {
      v: 1,
      name: packName.trim(),
      author: author.trim() || 'Anonym',
    }
    if (incHabits && habits.length) pack.habits = habits.map((h) => h.name)
    if (incRoutines) {
      pack.routines = {}
      for (const p of ['daily', 'weekly', 'monthly'] as RoutinePeriod[]) {
        if (routines[p].length) pack.routines[p] = routines[p].map((i) => i.text)
      }
    }
    if (incNotToDo && notToDo.length) pack.notToDo = notToDo.map((n) => n.text)
    if (incShopping && shopping.length)
      pack.shopping = shopping.map((i) => i.text)
    setLink(packLink(pack))
    setCopied(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // urklipp blockerat — länken går att markera manuellt
    }
  }

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ url: link })
      else await copy()
    } catch {
      // användaren avbröt
    }
  }

  const checkbox = (
    label: string,
    value: boolean,
    set: (v: boolean) => void,
    count: number,
  ) => (
    <div className="check-row">
      <button
        className={`checkbox ${value ? 'on' : ''}`}
        onClick={() => set(!value)}
        aria-label={label}
      >
        ✓
      </button>
      <span className="check-label">{label}</span>
      <span className="tier-count">{count} st</span>
    </div>
  )

  return (
    <>
      {follows.length > 0 && (
        <div className="card">
          <div className="card-title">Du följer</div>
          {follows.map((f, i) => (
            <div className="check-row" key={i}>
              <span className="check-label">
                ✅ {f.name}{' '}
                <span style={{ color: 'var(--muted)' }}>av {f.author}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">Utforska paket</div>
        <div className="card-sub">
          Följ ett upplägg — vanorna, rutinerna och listorna läggs till hos dig
          direkt. Dubbletter hoppas över automatiskt.
        </div>
      </div>

      {creatorPacks.map((cp) => (
        <div className="card principle" key={cp.pack.name}>
          <div className="p-icon">{cp.emoji}</div>
          <div style={{ flex: 1 }}>
            <h3>{cp.pack.name}</h3>
            <div className="p-sub">
              av {cp.pack.author} · {packSummary(cp.pack)}
            </div>
            <ul>
              <li>{cp.desc}</li>
            </ul>
            <div className="add-row">
              <button
                className={isFollowing(cp.pack) ? 'btn-ghost' : 'btn'}
                style={{ flex: 1 }}
                onClick={() => !isFollowing(cp.pack) && follow(cp.pack)}
              >
                {isFollowing(cp.pack) ? '✓ Följer' : '+ Följ'}
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="card-title">Skapa ditt eget paket</div>
        <div className="card-sub">
          Paketera dina listor och dela länken — den som öppnar den kan följa ditt
          upplägg. Funkar utan konto, helt privat: allt ligger i själva länken.
        </div>
        <div className="two-col">
          <input
            value={packName}
            placeholder="Paketets namn…"
            onChange={(e) => setPackName(e.target.value)}
          />
          <input
            value={author}
            placeholder="Ditt namn…"
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          {checkbox('Mina vanor', incHabits, setIncHabits, habits.length)}
          {checkbox(
            'Mina rutiner',
            incRoutines,
            setIncRoutines,
            routines.daily.length + routines.weekly.length + routines.monthly.length,
          )}
          {checkbox('Min "inte göra"-lista', incNotToDo, setIncNotToDo, notToDo.length)}
          {checkbox('Min inköpslista', incShopping, setIncShopping, shopping.length)}
        </div>
        <div className="add-row">
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={createLink}
            disabled={!packName.trim()}
          >
            Skapa delningslänk
          </button>
        </div>
        {link && (
          <>
            <input
              readOnly
              value={link}
              style={{ width: '100%', marginTop: 10 }}
              onFocus={(e) => e.target.select()}
            />
            <div className="add-row">
              <button className="btn-ghost" style={{ flex: 1 }} onClick={copy}>
                {copied ? '✓ Kopierad' : 'Kopiera'}
              </button>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={share}>
                📤 Dela
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">Hur funkar det?</div>
        <div className="hint">
          Hela paketet kodas in i länken — ingen server, inget konto, ingen som ser
          din data. Skicka länken via SMS, bio-länk eller var du vill. Riktiga
          konton med realtidsuppdateringar kräver en backend — formatet är byggt
          för att kunna växla till det senare.
        </div>
      </div>
    </>
  )
}
