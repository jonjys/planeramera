import { useStored, dateKey, addDays, weekDates, weekKey, kr } from '../store'
import { xpTotal, xpLog, xpDays, levelInfo } from '../xp'
import { defaultHabits } from '../data'
import Backup from '../components/Backup'
import { Bars, LineChart } from '../components/Charts'
import { shareWeekImage, shareStatsImage } from '../storyImage'
import { streakWith } from '../streaks'
import { getPatterns } from '../patterns'
import type { Follow } from '../pack'
import type { Expense, Habit, PlanTask } from '../types'

interface Achievement {
  icon: string
  title: string
  desc: string
  unlocked: boolean
}

export default function Profile() {
  const [name, setName] = useStored('pm.user.name', '')
  const [theme, setTheme] = useStored<'dark' | 'light'>('pm.theme', 'dark')
  const [follows] = useStored<Follow[]>('pm.follows', [])
  const [habitDone] = useStored<Record<string, string[]>>('pm.habits.done', {})
  const [habits] = useStored<Habit[]>('pm.habits.items', defaultHabits)
  const [plans] = useStored<Record<string, PlanTask[]>>('pm.plan', {})
  const [expenses] = useStored<Expense[]>('pm.expenses', [])
  const [journal] = useStored<Record<string, unknown>>('pm.journal', {})
  const [frozen] = useStored<Record<string, string[]>>('pm.frozen', {})
  const [freezes] = useStored<number>('pm.freezes', 0)

  const total = xpTotal()
  const { level, into, need } = levelInfo(total)
  const log = xpLog()
  const days = xpDays()

  // --- veckans siffror ---
  const week = weekDates().map((d) => dateKey(d))
  const weekSet = new Set(week)
  const prevWeekSet = new Set(
    weekDates(addDays(new Date(), -7)).map((d) => dateKey(d)),
  )

  const tasksDone = week.reduce(
    (s, d) => s + (plans[d]?.filter((t) => t.done).length ?? 0),
    0,
  )
  const habitChecks = habits.reduce(
    (s, h) => s + (habitDone[h.id] ?? []).filter((d) => weekSet.has(d)).length,
    0,
  )
  let pomos = 0
  for (const d of weekDates()) {
    try {
      pomos += Number(
        JSON.parse(localStorage.getItem('pm.pomo.rounds.' + d.toDateString()) ?? '0'),
      )
    } catch {
      // ignorera trasig post
    }
  }
  const spentWeek = expenses
    .filter((e) => weekSet.has(e.date))
    .reduce((s, e) => s + e.amount, 0)
  const spentPrev = expenses
    .filter((e) => prevWeekSet.has(e.date))
    .reduce((s, e) => s + e.amount, 0)

  // --- utmärkelser ---
  const bestStreak = Math.max(
    0,
    ...habits.map((h) => streakWith(habitDone[h.id] ?? [], frozen[h.id] ?? [])),
  )
  const pomoDayMax = (() => {
    let max = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      if (key.startsWith('pm.pomo.rounds.')) {
        try {
          max = Math.max(max, Number(JSON.parse(localStorage.getItem(key)!)))
        } catch {
          // ignorera trasig post
        }
      }
    }
    return max
  })()
  const expenseDays = new Set(expenses.map((e) => e.date)).size

  const achievements: Achievement[] = [
    {
      icon: '🐸',
      title: 'Grodätaren',
      desc: 'Klara din första stora uppgift',
      unlocked: Object.keys(log).some((k) => k.startsWith('task:major:')),
    },
    {
      icon: '🔥',
      title: 'Vaneveckan',
      desc: '7 dagars streak på en vana',
      unlocked: bestStreak >= 7,
    },
    {
      icon: '🍅',
      title: 'Djupt fokus',
      desc: '4 pomodoro-pass på en dag',
      unlocked: pomoDayMax >= 4,
    },
    {
      icon: '💰',
      title: '30-dagarsklubben',
      desc: 'Logga utgifter 30 olika dagar',
      unlocked: expenseDays >= 30,
    },
    {
      icon: '✍️',
      title: 'Reflektören',
      desc: '7 kvällsreflektioner',
      unlocked: Object.keys(journal).length >= 7,
    },
    {
      icon: '📦',
      title: 'Följaren',
      desc: 'Följ ditt första paket',
      unlocked: follows.length >= 1,
    },
    {
      icon: '⭐',
      title: 'Nivå 5',
      desc: 'Nå nivå 5',
      unlocked: level >= 5,
    },
    {
      icon: '👑',
      title: 'Tusenklubben',
      desc: 'Samla 1 000 XP totalt',
      unlocked: total >= 1000,
    },
  ]
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  // --- aktivitet: 12 veckor ---
  const weeks: string[][] = []
  const thisMonday = weekDates()[0]
  for (let w = 11; w >= 0; w--) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) =>
        dateKey(addDays(thisMonday, -w * 7 + i)),
      ),
    )
  }
  const intensity = (v: number) => (v >= 60 ? 3 : v >= 30 ? 2 : v > 0 ? 1 : 0)
  const today = dateKey()

  // --- grafer ---
  const dayLetters = ['S', 'M', 'T', 'O', 'T', 'F', 'L']
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13))
  const xpSeries = last14.map((d) => ({
    label: dayLetters[d.getDay()],
    value: days[dateKey(d)] ?? 0,
  }))

  const [health] = useStored<Record<string, { mood?: number }>>('pm.health', {})
  const moodSeries = last14.map((d) => ({
    label: dayLetters[d.getDay()],
    value: health[dateKey(d)]?.mood ?? 0,
  }))

  // --- året i siffror ---
  const year = String(new Date().getFullYear())
  const yearEntries = Object.entries(days).filter(([d]) => d.startsWith(year))
  const yearXp = yearEntries.reduce((s, [, v]) => s + v, 0)
  const activeDays = yearEntries.filter(([, v]) => v > 0).length
  const yearTasks = Object.entries(plans)
    .filter(([d]) => d.startsWith(year))
    .reduce((s, [, list]) => s + list.filter((t) => t.done).length, 0)
  const monthNames = [
    'januari', 'februari', 'mars', 'april', 'maj', 'juni',
    'juli', 'augusti', 'september', 'oktober', 'november', 'december',
  ]
  const byMonth = new Map<string, number>()
  for (const [d, v] of yearEntries) {
    byMonth.set(d.slice(5, 7), (byMonth.get(d.slice(5, 7)) ?? 0) + v)
  }
  const bestMonth = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0]

  const shareYear = () =>
    shareStatsImage({
      title: `MITT ${year}`,
      subtitle: name,
      rows: [
        ['⚡', `${yearXp} XP i år`],
        ['📅', `${activeDays} aktiva dagar`],
        ['✅', `${yearTasks} uppgifter klara`],
        ['🔥', `${bestStreak} dagars bästa streak`],
        ['🏆', bestMonth ? `Bästa månaden: ${monthNames[Number(bestMonth[0]) - 1]}` : 'Året har bara börjat'],
      ],
      filename: `planeramera-${year}.png`,
    })

  const weekSpendSeries = Array.from({ length: 8 }, (_, i) => {
    const monday = addDays(weekDates()[0], (i - 7) * 7)
    const daysOfWeek = weekDates(monday).map((d) => dateKey(d))
    return {
      label: weekKey(monday).split('-')[1],
      value: expenses
        .filter((e) => daysOfWeek.includes(e.date))
        .reduce((s, e) => s + e.amount, 0),
    }
  })

  return (
    <>
      <div className="card">
        <div className="card-title">Min profil</div>
        <input
          value={name}
          placeholder="Vad heter du?"
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', marginBottom: 14 }}
        />
        <div className="segments" style={{ marginBottom: 14 }}>
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              className={theme === t ? 'active' : ''}
              onClick={() => {
                setTheme(t)
                document.documentElement.dataset.theme = t
              }}
            >
              {t === 'dark' ? '🌙 Mörkt' : '☀️ Ljust'}
            </button>
          ))}
        </div>
        <div className="goal-head">
          <span className="goal-name">⭐ Nivå {level}</span>
          <span className="goal-nums">
            {into} / {need} XP · {total} totalt
          </span>
        </div>
        <div className="progress">
          <div style={{ width: `${(into / need) * 100}%` }} />
        </div>
        <div className="result-line" style={{ marginTop: 8 }}>
          <span>🧊 Streak-frysningar</span>
          <span className="value">{freezes} / 3</span>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          Du får XP för klara uppgifter, vanor, rutiner, fokuspass och
          kvällsreflektioner. Synliga framsteg bygger konsekvens. 📊
        </div>
        <div className="add-row">
          <button
            className="btn-ghost"
            style={{ flex: 1 }}
            onClick={() =>
              shareWeekImage({
                name,
                level,
                weekXp: week.reduce((s, d) => s + (days[d] ?? 0), 0),
                tasksDone,
                bestStreak,
              })
            }
          >
            📸 Dela min vecka som bild
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Veckans siffror</div>
        <div className="result-line">
          <span>✅ Uppgifter klara</span>
          <span className="value">{tasksDone}</span>
        </div>
        <div className="result-line">
          <span>📊 Vanor avbockade</span>
          <span className="value">{habitChecks}</span>
        </div>
        <div className="result-line">
          <span>🍅 Fokuspass</span>
          <span className="value">{pomos}</span>
        </div>
        <div className="result-line">
          <span>💸 Utgifter denna vecka</span>
          <span className="value">{kr(spentWeek)}</span>
        </div>
        <div className="result-line">
          <span>↔️ Jämfört med förra veckan</span>
          <span
            className="value"
            style={{
              color:
                spentWeek <= spentPrev ? 'var(--green)' : 'var(--red)',
            }}
          >
            {spentPrev === 0
              ? '—'
              : `${spentWeek <= spentPrev ? '' : '+'}${kr(spentWeek - spentPrev)}`}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Aktivitet · senaste 12 veckorna</div>
        <div className="heatmap">
          {weeks.map((wk, i) => (
            <div className="heat-col" key={i}>
              {wk.map((d) => (
                <div
                  key={d}
                  className={`heat-cell i${intensity(days[d] ?? 0)} ${
                    d === today ? 'today' : ''
                  } ${d > today ? 'future' : ''}`}
                  title={d}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="progress-label" style={{ marginTop: 6 }}>
          Varje ruta är en dag — ju mer guld, desto mer gjort. Små steg, stor
          förändring.
        </div>
      </div>

      <div className="card">
        <div className="goal-head">
          <div className="card-title">🎁 Mitt {year}</div>
        </div>
        <div className="result-line">
          <span>⚡ XP i år</span>
          <span className="value">{yearXp}</span>
        </div>
        <div className="result-line">
          <span>📅 Aktiva dagar</span>
          <span className="value">{activeDays}</span>
        </div>
        <div className="result-line">
          <span>✅ Uppgifter klara</span>
          <span className="value">{yearTasks}</span>
        </div>
        {bestMonth && (
          <div className="result-line">
            <span>🏆 Bästa månaden</span>
            <span className="value" style={{ textTransform: 'capitalize' }}>
              {monthNames[Number(bestMonth[0]) - 1]}
            </span>
          </div>
        )}
        <div className="add-row">
          <button className="btn-ghost" style={{ flex: 1 }} onClick={shareYear}>
            📸 Dela mitt {year} som bild
          </button>
        </div>
      </div>

      {(() => {
        const patterns = getPatterns()
        if (!patterns.length) return null
        return (
          <div className="card">
            <div className="card-title">🧬 Dina mönster · alla</div>
            <div className="card-sub">
              Statistiska samband i din egen data. Fler dyker upp allt eftersom
              du använder appen.
            </div>
            {patterns.map((p, i) => (
              <div className="insight" key={i}>
                <span className="insight-icon">{p.icon}</span>
                <span>{p.text}</span>
              </div>
            ))}
          </div>
        )
      })()}

      <div className="card">
        <div className="card-title">XP · senaste 14 dagarna</div>
        <Bars data={xpSeries} />
      </div>

      <div className="card">
        <div className="card-title">Utgifter per vecka · 8 veckor</div>
        <Bars data={weekSpendSeries} color="var(--blue)" />
      </div>

      {moodSeries.some((m) => m.value > 0) && (
        <div className="card">
          <div className="card-title">Humör · senaste 14 dagarna</div>
          <LineChart data={moodSeries} min={0} max={5} color="var(--green)" />
        </div>
      )}

      <div className="card">
        <div className="card-title">
          Utmärkelser · {unlockedCount}/{achievements.length}
        </div>
        <div className="ach-grid">
          {achievements.map((a) => (
            <div className={`ach ${a.unlocked ? 'on' : ''}`} key={a.title}>
              <div className="ach-icon">{a.unlocked ? a.icon : '🔒'}</div>
              <div className="ach-title">{a.title}</div>
              <div className="ach-desc">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {follows.length > 0 && (
        <div className="card">
          <div className="card-title">Du följer</div>
          {follows.map((f, i) => (
            <div className="check-row" key={i}>
              <span className="check-label">
                📦 {f.name}{' '}
                <span style={{ color: 'var(--muted)' }}>av {f.author}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <Backup />
    </>
  )
}
