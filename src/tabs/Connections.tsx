import { useState } from 'react'
import { useStored, dateKey, weekDates, pad } from '../store'
import { defaultHabits } from '../data'
import { meals } from '../data'
import { downloadIcs } from '../ics'
import { shareStatsImage } from '../storyImage'
import { xpDays, xpTotal, levelInfo } from '../xp'
import { streakWith } from '../streaks'
import {
  getConnections, markConnected, lastUsedText,
} from '../connections'
import type { ConnectionId } from '../connections'
import type { Expense, Habit, PlanTask } from '../types'
import type { TabId } from '../App'

interface ContactPickerNavigator {
  contacts?: {
    select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[] }[]>
  }
}

function Status({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className={`conn-status ${on ? 'on' : ''}`}>
      {on ? (label ?? 'Kopplad ✓') : 'Ej kopplad'}
    </span>
  )
}

export default function Connections({ goTo }: { goTo: (t: TabId) => void }) {
  const [, bump] = useState(0)
  const refresh = () => bump((v) => v + 1)
  const conns = getConnections()

  const [name] = useStored('pm.user.name', '')
  const [plans] = useStored<Record<string, PlanTask[]>>('pm.plan', {})
  const [journal] = useStored<Record<string, { stars: number; good: string; grateful: string }>>('pm.journal', {})
  const [habits] = useStored<Habit[]>('pm.habits.items', defaultHabits)
  const [habitDone] = useStored<Record<string, string[]>>('pm.habits.done', {})
  const [frozen] = useStored<Record<string, string[]>>('pm.frozen', {})
  const [expenses] = useStored<Expense[]>('pm.expenses', [])
  const [mealPlan] = useStored<Record<number, string>>('pm.mealplan', {})
  const [income] = useStored<string>('pm.income', '')
  const [partnerDraft, setPartnerDraft] = useState('')
  const [note, setNote] = useState<Partial<Record<ConnectionId, string>>>({})

  const today = dateKey()
  const setCardNote = (id: ConnectionId, text: string) => {
    setNote((n) => ({ ...n, [id]: text }))
    setTimeout(() => setNote((n) => ({ ...n, [id]: undefined })), 3000)
  }

  const done = (id: ConnectionId, extra?: string) => {
    markConnected(id, extra)
    refresh()
  }

  // ---- delningstexter ----
  const weekStats = () => {
    const week = weekDates().map((d) => dateKey(d))
    const days = xpDays()
    const weekXp = week.reduce((s, d) => s + (days[d] ?? 0), 0)
    const tasksDone = week.reduce(
      (s, d) => s + (plans[d]?.filter((t) => t.done).length ?? 0), 0,
    )
    const bestStreak = Math.max(
      0, ...habits.map((h) => streakWith(habitDone[h.id] ?? [], frozen[h.id] ?? [])),
    )
    return { weekXp, tasksDone, bestStreak, level: levelInfo(xpTotal()).level }
  }

  const dayText = () => {
    const tasks = plans[today] ?? []
    const entry = journal[today]
    const lines = [
      `Planera Mera — ${today}`,
      '',
      ...tasks.map((t) => `${t.done ? '✅' : '⬜️'} ${t.text}`),
    ]
    if (entry) {
      lines.push('', `Dagens betyg: ${'★'.repeat(entry.stars)}`)
      if (entry.good) lines.push(`Bäst idag: ${entry.good}`)
      if (entry.grateful) lines.push(`Tacksam för: ${entry.grateful}`)
    }
    return lines.join('\n')
  }

  const shareOrCopy = async (id: ConnectionId, text: string, okMsg: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text })
        done(id)
        return
      }
    } catch {
      return // användaren avbröt delningen — koppla inte
    }
    try {
      await navigator.clipboard.writeText(text)
      done(id)
      setCardNote(id, okMsg)
    } catch {
      setCardNote(id, 'Kunde inte dela i den här webbläsaren.')
    }
  }

  // ---- Google Kalender-länk (deep link, ingen backend) ----
  const gcalUrl = () => {
    const start = new Date()
    start.setDate(25)
    start.setHours(9, 0, 0, 0)
    if (start < new Date()) start.setMonth(start.getMonth() + 1)
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
    const end = new Date(start.getTime() + 15 * 60000)
    const amount = Number(income.replace(',', '.')) || 0
    const title = amount > 0
      ? `💰 Betala dig själv först — ${Math.round(amount * 0.1)} kr`
      : '💰 Betala dig själv först'
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${fmt(start)}/${fmt(end)}`,
      recur: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=25',
      details: 'Planera Mera — överför till sparande innan räkningarna.',
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  // ---- Kontakter (Contact Picker API) ----
  const nav = navigator as Navigator & ContactPickerNavigator
  const contactPickerSupported = !!nav.contacts?.select
  const partner = conns.contacts?.extra

  const pickContact = async () => {
    try {
      const picked = await nav.contacts!.select(['name'], { multiple: false })
      const contactName = picked?.[0]?.name?.[0]
      if (contactName) done('contacts', contactName)
    } catch {
      // användaren avbröt
    }
  }

  const sharePartner = () => {
    const s = weekStats()
    const text = `Hej ${partner}! Min vecka i Planera Mera: nivå ${s.level}, ${s.weekXp} XP, ${s.tasksDone} uppgifter klara, bästa streak ${s.bestStreak} dagar. Häng med du också! 💪${name ? ` /${name}` : ''}`
    void shareOrCopy('contacts', text, 'Kopierat — skicka till din peppartner!')
  }

  const notifyGranted =
    'Notification' in window && Notification.permission === 'granted'

  const connectNotify = async () => {
    if (!('Notification' in window)) {
      setCardNote('notify', 'Notiser stöds inte i den här webbläsaren.')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      done('notify')
      try {
        new Notification('🔌 Notiser kopplade!', {
          body: 'Planera Mera säger till när fokuspass och pauser är klara.',
        })
      } catch {
        // vissa webbläsare kräver service worker — statusen gäller ändå
      }
    } else {
      setCardNote('notify', 'Nekad — ändra i webbläsarens inställningar.')
    }
  }

  const connectInstagram = async () => {
    const s = weekStats()
    await shareStatsImage({
      title: 'MIN VECKA',
      subtitle: name,
      rows: [
        ['⭐', `Nivå ${s.level}`],
        ['⚡', `${s.weekXp} XP denna vecka`],
        ['✅', `${s.tasksDone} uppgifter klara`],
        ['🔥', `${s.bestStreak} dagars bästa streak`],
      ],
      filename: 'planeramera-min-vecka.png',
    })
    done('instagram')
  }

  const weekdayIndex = (new Date().getDay() + 6) % 7
  const todaysMeal = meals.find((m) => m.id === mealPlan[weekdayIndex])

  const connectIcal = () => {
    const start = new Date()
    start.setDate(25)
    start.setHours(9, 0, 0, 0)
    if (start < new Date()) start.setMonth(start.getMonth() + 1)
    const events = [
      {
        title: '💰 Betala dig själv först',
        start,
        durationMin: 15,
        rrule: 'FREQ=MONTHLY;BYMONTHDAY=25',
        description: 'Planera Mera — överför till sparande innan räkningarna.',
      },
    ]
    if (todaysMeal) {
      const dinner = new Date()
      dinner.setHours(17, 30, 0, 0)
      events.push({
        title: `🍽️ ${todaysMeal.name}`,
        start: dinner,
        durationMin: 60,
        rrule: '',
        description: 'Planera Mera — dagens middag.',
      })
    }
    downloadIcs('planeramera-kalender.ics', events.map((e) => ({
      ...e, rrule: e.rrule || undefined,
    })))
    done('ical')
  }

  const shortcutTemplate = `${location.origin}/#health=steps:STEG,sleep:TIMMAR`

  return (
    <>
      <div className="card">
        <div className="card-title">🔌 Kopplingar</div>
        <div className="card-sub">
          Koppla ihop Planera Mera med apparna runt omkring — med riktiga
          enhets-funktioner, utan konton och utan att din data lämnar telefonen
          (undantag: det du själv aktivt delar).
        </div>
      </div>

      {/* Hälsa */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">❤️ Hälsa (Apple)</div>
          <Status
            on={!!conns.health}
            label={conns.health ? `Kopplad ✓ · synk ${lastUsedText(conns.health)}` : undefined}
          />
        </div>
        <div className="card-sub">
          Steg och sömn flödar in automatiskt via en Genväg — kopplingen aktiveras
          själv vid första synken.
        </div>
        <input
          readOnly
          value={shortcutTemplate}
          style={{ width: '100%', fontSize: 13 }}
          onFocus={(e) => e.target.select()}
        />
        <div className="add-row">
          <button
            className="btn-ghost"
            style={{ flex: 1 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shortcutTemplate)
                setCardNote('health', '✓ URL-mall kopierad')
              } catch {
                setCardNote('health', 'Markera och kopiera texten manuellt.')
              }
            }}
          >
            Kopiera URL-mall
          </button>
          <a className="btn" href="shortcuts://" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Öppna Genvägar
          </a>
        </div>
        {note.health && <div className="hint">{note.health}</div>}
      </div>

      {/* Notiser */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">🔔 Notiser</div>
          <Status on={notifyGranted || !!conns.notify} />
        </div>
        <div className="card-sub">
          Få en signal när fokuspass och pauser är klara — även när appen ligger i
          bakgrunden.
        </div>
        {!notifyGranted && (
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={connectNotify}>
              Koppla notiser
            </button>
          </div>
        )}
        {note.notify && <div className="hint">{note.notify}</div>}
      </div>

      {/* Anteckningar */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">📝 Anteckningar</div>
          <Status
            on={!!conns.notes}
            label={conns.notes ? `Kopplad ✓ · delad ${lastUsedText(conns.notes)}` : undefined}
          />
        </div>
        <div className="card-sub">
          Skicka dagens plan och kvällsreflektion till Anteckningar (eller valfri
          app) via delningsmenyn.
        </div>
        <div className="add-row">
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => void shareOrCopy('notes', dayText(), 'Kopierat — klistra in i Anteckningar!')}
          >
            Koppla — dela dagens sida
          </button>
        </div>
        {note.notes && <div className="hint">{note.notes}</div>}
      </div>

      {/* Instagram */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">📸 Instagram</div>
          <Status
            on={!!conns.instagram}
            label={conns.instagram ? `Kopplad ✓ · delad ${lastUsedText(conns.instagram)}` : undefined}
          />
        </div>
        <div className="card-sub">
          Din vecka som story-bild (1080×1920) i appens guldlook — delningsmenyn
          öppnas direkt mot Instagram.
        </div>
        <div className="add-row">
          <button className="btn" style={{ flex: 1 }} onClick={() => void connectInstagram()}>
            Koppla — dela din vecka
          </button>
        </div>
      </div>

      {/* Google Kalender */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">📅 Google Kalender</div>
          <Status on={!!conns.gcal} />
        </div>
        <div className="card-sub">
          Skapar "💰 Betala dig själv först" den 25:e varje månad — förifyllt event
          direkt i Google Kalender, ett tryck att spara.
        </div>
        <div className="add-row">
          <a
            className="btn"
            style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
            href={gcalUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => done('gcal')}
          >
            Koppla Google Kalender
          </a>
        </div>
      </div>

      {/* Apple/övrig kalender */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">🗓️ Kalender (Apple m.fl.)</div>
          <Status on={!!conns.ical} />
        </div>
        <div className="card-sub">
          Laddar ner en .ics med månadssparandet{todaysMeal ? ' och dagens middag' : ''} —
          öppnas direkt i Apple Kalender.
        </div>
        <div className="add-row">
          <button className="btn" style={{ flex: 1 }} onClick={connectIcal}>
            Koppla kalender (.ics)
          </button>
        </div>
      </div>

      {/* Kontakter / peppartner */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">👥 Kontakter · peppartner</div>
          <Status on={!!partner} label={partner ? `Kopplad ✓ · ${partner}` : undefined} />
        </div>
        <div className="card-sub">
          Välj en person som håller dig ansvarig — dela din vecka till hen med ett
          tryck. Forskningen är tydlig: offentliga åtaganden håller bäst.
        </div>
        {!partner && contactPickerSupported && (
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={() => void pickContact()}>
              Koppla — välj ur Kontakter
            </button>
          </div>
        )}
        {!partner && !contactPickerSupported && (
          <div className="add-row">
            <input
              value={partnerDraft}
              placeholder="Namn på din peppartner…"
              onChange={(e) => setPartnerDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && partnerDraft.trim()) done('contacts', partnerDraft.trim())
              }}
            />
            <button
              className="btn"
              onClick={() => partnerDraft.trim() && done('contacts', partnerDraft.trim())}
            >
              Koppla
            </button>
          </div>
        )}
        {partner && (
          <div className="add-row">
            <button className="btn" style={{ flex: 1 }} onClick={sharePartner}>
              📤 Dela min vecka till {partner}
            </button>
          </div>
        )}
        {note.contacts && <div className="hint">{note.contacts}</div>}
      </div>

      {/* Bank/Klarna */}
      <div className="card">
        <div className="goal-head">
          <div className="card-title">🏦 Bank / Klarna</div>
          <Status
            on={expenses.length > 0}
            label={expenses.length > 0 ? `Kopplad ✓ · ${expenses.length} utgifter` : undefined}
          />
        </div>
        <div className="card-sub">
          Importera CSV-exporter från banken eller Klarna rakt in i utgiftsloggen.
        </div>
        <div className="add-row">
          <button className="btn" style={{ flex: 1 }} onClick={() => goTo('economy')}>
            Öppna CSV-import
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Ärligt om kopplingarna</div>
        <div className="hint">
          Allt ovan bygger på riktiga enhets-funktioner (delningsmeny, kalender-
          länkar, kontaktväljare, notis-API, Genvägar) — inte på företags-API:er
          som kräver konton och servrar. Det betyder: inget läcker, inget kostar,
          och det funkar idag. Vissa funktioner kräver mobil (Genvägar = iPhone,
          kontaktväljaren = Android Chrome).
        </div>
      </div>
    </>
  )
}
