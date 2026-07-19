import { useState } from 'react'
import { useStored, uid, weekDates } from '../store'
import { meals, cookingEasier } from '../data'
import { downloadIcs } from '../ics'
import type { ShopItem } from '../types'

const weekdayNames = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

export default function Meals() {
  const [items, setItems] = useStored<ShopItem[]>('pm.shopping', [])
  const [added, setAdded] = useState<string | null>(null)
  const [plan, setPlan] = useStored<Record<number, string>>('pm.mealplan', {})
  const [weekAdded, setWeekAdded] = useState(false)

  const addIngredients = (mealId: string, ingredients: string[]) => {
    const existing = new Set(items.map((i) => i.text.toLowerCase()))
    const next = ingredients
      .filter((ing) => !existing.has(ing.toLowerCase()))
      .map((ing) => ({ id: uid(), text: ing, checked: false }))
    if (next.length) setItems([...items, ...next])
    setAdded(mealId)
    setTimeout(() => setAdded((a) => (a === mealId ? null : a)), 2000)
  }

  const plannedMeals = [...new Set(Object.values(plan))]
    .map((id) => meals.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m)

  const addWeekIngredients = () => {
    const all = [...new Set(plannedMeals.flatMap((m) => m.ingredients))]
    const existing = new Set(items.map((i) => i.text.toLowerCase()))
    const next = all
      .filter((ing) => !existing.has(ing.toLowerCase()))
      .map((ing) => ({ id: uid(), text: ing, checked: false }))
    if (next.length) setItems([...items, ...next])
    setWeekAdded(true)
    setTimeout(() => setWeekAdded(false), 2000)
  }

  const todayIndex = (new Date().getDay() + 6) % 7

  return (
    <>
      <div className="card">
        <div className="card-title">Veckans matsedel</div>
        <div className="card-sub">
          Bestäm middagarna en gång — slipp beslutet varje kväll. Dagens middag
          dyker upp på Idag-fliken.
        </div>
        {weekdayNames.map((day, i) => (
          <div className="cat-bar" key={day}>
            <span
              className="name"
              style={i === todayIndex ? { color: 'var(--gold)', fontWeight: 700 } : {}}
            >
              {day}
            </span>
            <select
              value={plan[i] ?? ''}
              onChange={(e) => {
                const next = { ...plan }
                if (e.target.value) next[i] = e.target.value
                else delete next[i]
                setPlan(next)
              }}
              style={{ flex: 1, padding: '7px 10px' }}
            >
              <option value="">—</option>
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.name}
                </option>
              ))}
            </select>
          </div>
        ))}
        {plannedMeals.length > 0 && (
          <>
            <div className="add-row">
              <button
                className={weekAdded ? 'btn-ghost' : 'btn'}
                style={{ flex: 1 }}
                onClick={addWeekIngredients}
              >
                {weekAdded
                  ? '✓ Tillagt på inköpslistan'
                  : '🛒 Lägg veckans ingredienser på listan'}
              </button>
            </div>
            <div className="add-row">
              <button
                className="btn-ghost"
                style={{ flex: 1 }}
                onClick={() => {
                  const monday = weekDates()[0]
                  const events = Object.entries(plan).flatMap(([i, mealId]) => {
                    const meal = meals.find((m) => m.id === mealId)
                    if (!meal) return []
                    const start = new Date(monday)
                    start.setDate(start.getDate() + Number(i))
                    start.setHours(17, 30, 0, 0)
                    return [
                      {
                        title: `🍽️ ${meal.name}`,
                        start,
                        durationMin: 60,
                        rrule: 'FREQ=WEEKLY',
                        description: 'Planera Mera — veckans matsedel',
                      },
                    ]
                  })
                  downloadIcs('planeramera-matsedel.ics', events)
                }}
              >
                📅 Lägg matsedeln i kalendern
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">5 basmåltider</div>
        <div className="card-sub">
          Kan du dessa fem klarar du dig hela veckan — billigt, enkelt och utan
          stress. Tryck på knappen för att lägga ingredienserna på inköpslistan.
        </div>
      </div>

      {meals.map((m) => (
        <div className="card" key={m.id}>
          <div className="principle">
            <div className="p-icon">{m.icon}</div>
            <div style={{ flex: 1 }}>
              <h3>{m.name}</h3>
              <div className="p-sub">{m.base}</div>
              <ul>
                {m.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <div className="chips">
                {m.ingredients.map((ing) => (
                  <span className="chip" key={ing} style={{ cursor: 'default' }}>
                    {ing}
                  </span>
                ))}
              </div>
              <div className="add-row">
                <button
                  className={added === m.id ? 'btn-ghost' : 'btn'}
                  style={{ flex: 1 }}
                  onClick={() => addIngredients(m.id, m.ingredients)}
                >
                  {added === m.id
                    ? '✓ Tillagt på inköpslistan'
                    : '🛒 Lägg till på inköpslistan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="card-title">Det som gör matlagning lättare</div>
        {cookingEasier.map((tip, i) => (
          <div className="check-row" key={i}>
            <span className="check-label">{tip}</span>
          </div>
        ))}
      </div>
    </>
  )
}
