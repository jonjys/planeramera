import { useState } from 'react'
import { useStored, uid } from '../store'
import { pantryStaples, beforeYouGo } from '../data'
import type { ShopItem } from '../types'

export default function Shopping() {
  const [items, setItems] = useStored<ShopItem[]>('pm.shopping', [])
  const [draft, setDraft] = useState('')
  const [shareMsg, setShareMsg] = useState('')

  const shareList = async () => {
    const open = items.filter((i) => !i.checked)
    const text = 'Inköpslista:\n' + open.map((i) => '• ' + i.text).join('\n')
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareMsg('✓ Kopierad — klistra in var du vill!')
        setTimeout(() => setShareMsg(''), 2500)
      }
    } catch {
      // användaren avbröt delningen
    }
  }

  const add = (text: string) => {
    const t = text.trim()
    if (!t) return
    if (items.some((i) => i.text.toLowerCase() === t.toLowerCase())) return
    setItems([...items, { id: uid(), text: t, checked: false }])
  }

  const toggle = (id: string) =>
    setItems(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))

  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))

  const clearChecked = () => setItems(items.filter((i) => !i.checked))

  const checkedCount = items.filter((i) => i.checked).length

  return (
    <>
      <div className="card">
        <div className="card-title">Inköpslista</div>
        <div className="card-sub">
          Skriv listan hemma — och håll dig till den i butiken.
        </div>

        {items.length === 0 && (
          <div className="empty">Tom lista. Lägg till nedan eller tryck på basvarorna.</div>
        )}

        {items.map((i) => (
          <div className="check-row" key={i.id}>
            <button
              className={`checkbox ${i.checked ? 'on' : ''}`}
              onClick={() => toggle(i.id)}
              aria-label="I korgen"
            >
              ✓
            </button>
            <span className={`check-label ${i.checked ? 'done' : ''}`}>{i.text}</span>
            <button className="row-del" onClick={() => remove(i.id)}>
              ✕
            </button>
          </div>
        ))}

        <div className="add-row">
          <input
            value={draft}
            placeholder="Lägg till vara…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                add(draft)
                setDraft('')
              }
            }}
          />
          <button
            className="btn"
            onClick={() => {
              add(draft)
              setDraft('')
            }}
          >
            +
          </button>
        </div>

        <div className="add-row">
          {items.some((i) => !i.checked) && (
            <button className="btn-ghost" style={{ flex: 1 }} onClick={shareList}>
              📤 Dela listan
            </button>
          )}
          {checkedCount > 0 && (
            <button className="btn-ghost" style={{ flex: 1 }} onClick={clearChecked}>
              Rensa avbockade ({checkedCount})
            </button>
          )}
        </div>
        {shareMsg && <div className="hint">{shareMsg}</div>}
      </div>

      <div className="card">
        <div className="card-title">Prisvärda basvaror</div>
        <div className="card-sub">Tryck för att lägga till på listan.</div>
        <div className="chips">
          {pantryStaples.map((s) => {
            const used = items.some(
              (i) => i.text.toLowerCase() === s.toLowerCase(),
            )
            return (
              <button
                key={s}
                className={`chip ${used ? 'used' : ''}`}
                onClick={() => add(s)}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Innan du går</div>
        {beforeYouGo.map((tip, i) => (
          <div className="check-row" key={i}>
            <span className="check-label">{tip}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Tysta pengaläckor</div>
        <div className="hint">
          Beställa leverans för ofta · handla utan lista · slänga mat · dyra
          "hälsoprodukter" du inte behöver · flera butiksrundor per vecka · köpa
          ingredienser du aldrig använder. 💸
        </div>
      </div>
    </>
  )
}
