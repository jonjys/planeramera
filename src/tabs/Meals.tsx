import { useState } from 'react'
import { useStored, uid } from '../store'
import { meals, cookingEasier } from '../data'
import type { ShopItem } from '../types'

export default function Meals() {
  const [items, setItems] = useStored<ShopItem[]>('pm.shopping', [])
  const [added, setAdded] = useState<string | null>(null)

  const addIngredients = (mealId: string, ingredients: string[]) => {
    const existing = new Set(items.map((i) => i.text.toLowerCase()))
    const next = ingredients
      .filter((ing) => !existing.has(ing.toLowerCase()))
      .map((ing) => ({ id: uid(), text: ing, checked: false }))
    if (next.length) setItems([...items, ...next])
    setAdded(mealId)
    setTimeout(() => setAdded((a) => (a === mealId ? null : a)), 2000)
  }

  return (
    <>
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
