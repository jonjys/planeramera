import { useRef, useState } from 'react'
import { useStored, dateKey, monthKey, uid, kr, pad } from '../store'
import { expenseCategories } from '../data'
import type { Expense, Goal } from '../types'

interface Subscription {
  id: string
  name: string
  price: number
}

/** Tolerant CSV-tolkning av bank-/Klarnaexporter: hittar datum-, belopp-
 *  och textkolumn per rad oavsett kolumnordning. */
export function parseBankCsv(text: string): Omit<Expense, 'id'>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []
  const first = lines[0]
  const delim = [';', '\t', ','].reduce((a, b) =>
    first.split(a).length >= first.split(b).length ? a : b,
  )
  const rows: Omit<Expense, 'id'>[] = []
  for (const line of lines) {
    const cells = line
      .split(delim)
      .map((c) => c.replace(/^["']|["']$/g, '').trim())
    let date = ''
    let amount: number | null = null
    let note = ''
    for (const cell of cells) {
      let m = cell.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        date = `${m[1]}-${m[2]}-${m[3]}`
        continue
      }
      m = cell.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
      if (m) {
        date = `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`
        continue
      }
      const num = cell.replace(/\s/g, '').replace(',', '.')
      if (/^-?\d+(\.\d+)?$/.test(num) && num.includes('.')) {
        amount = Number(num)
        continue
      }
      if (cell.length > note.length && !/^\d+$/.test(cell)) note = cell
    }
    if (date && amount !== null && amount < 0) {
      rows.push({ date, amount: Math.abs(amount), category: 'Övrigt', note })
    }
  }
  return rows
}

export default function Economy() {
  const [expenses, setExpenses] = useStored<Expense[]>('pm.expenses', [])
  const [goals, setGoals] = useStored<Goal[]>('pm.goals', [])
  const [income, setIncome] = useStored<string>('pm.income', '')

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(expenseCategories[0])
  const [note, setNote] = useState('')

  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [deposits, setDeposits] = useState<Record<string, string>>({})

  const [budgets, setBudgets] = useStored<Record<string, number>>('pm.budgets', {})
  const [editBudgets, setEditBudgets] = useState(false)
  const [subs, setSubs] = useStored<Subscription[]>('pm.subs', [])
  const [subName, setSubName] = useState('')
  const [subPrice, setSubPrice] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)
  const [csvStatus, setCsvStatus] = useState('')

  const importCsv = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseBankCsv(String(reader.result))
      if (!rows.length) {
        setCsvStatus('Hittade inga utgifter i filen — kolla att det är en CSV-export.')
        return
      }
      setExpenses([...rows.map((r) => ({ ...r, id: uid() })), ...expenses])
      setCsvStatus(`✓ Importerade ${rows.length} utgifter.`)
    }
    reader.readAsText(file)
  }

  const addSub = () => {
    const price = Number(subPrice.replace(',', '.'))
    if (!subName.trim() || !price || price <= 0) return
    setSubs([...subs, { id: uid(), name: subName.trim(), price }])
    setSubName('')
    setSubPrice('')
  }
  const subTotal = subs.reduce((s, x) => s + x.price, 0)

  const addExpense = () => {
    const value = Number(amount.replace(',', '.'))
    if (!value || value <= 0) return
    setExpenses([
      { id: uid(), date: dateKey(), amount: value, category, note: note.trim() },
      ...expenses,
    ])
    setAmount('')
    setNote('')
  }

  const removeExpense = (id: string) =>
    setExpenses(expenses.filter((e) => e.id !== id))

  const month = monthKey()
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month))
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = expenseCategories
    .map((c) => ({
      name: c,
      total: monthExpenses
        .filter((e) => e.category === c)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxCat = Math.max(...byCategory.map((c) => c.total), 1)

  const loggedDays = new Set(expenses.map((e) => e.date)).size

  const incomeNum = Number(income.replace(',', '.')) || 0

  const addGoal = () => {
    const target = Number(goalTarget.replace(',', '.'))
    if (!goalName.trim() || !target || target <= 0) return
    setGoals([...goals, { id: uid(), name: goalName.trim(), target, saved: 0 }])
    setGoalName('')
    setGoalTarget('')
  }

  const deposit = (id: string) => {
    const value = Number((deposits[id] ?? '').replace(',', '.'))
    if (!value) return
    setGoals(
      goals.map((g) =>
        g.id === id ? { ...g, saved: Math.max(0, g.saved + value) } : g,
      ),
    )
    setDeposits({ ...deposits, [id]: '' })
  }

  const removeGoal = (id: string) => setGoals(goals.filter((g) => g.id !== id))

  return (
    <>
      <div className="stat-row" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">Denna månad</div>
          <div className="big-number">{kr(monthTotal)}</div>
          <div className="progress-label">{monthExpenses.length} utgifter</div>
        </div>
        <div className="card">
          <div className="card-title">30-dagars­utmaningen</div>
          <div className="big-number">{Math.min(loggedDays, 30)}/30</div>
          <div className="progress-label">dagar med loggade utgifter</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Skriv ner allt du spenderar</div>
        <div className="card-sub">
          Kaffe, leverans, streaming — allt räknas. Du vet inte vart pengarna tar
          vägen förrän du ser det.
        </div>
        <div className="two-col">
          <input
            value={amount}
            inputMode="decimal"
            placeholder="Belopp (kr)"
            onChange={(e) => setAmount(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {expenseCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="add-row">
          <input
            value={note}
            placeholder="Anteckning (valfritt)…"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExpense()}
          />
          <button className="btn" onClick={addExpense}>
            Logga
          </button>
        </div>
        <div className="add-row">
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => csvRef.current?.click()}>
            📄 Importera CSV från bank/Klarna
          </button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importCsv(f)
              e.target.value = ''
            }}
          />
        </div>
        {csvStatus && (
          <div className="hint" style={{ marginTop: 8 }}>
            {csvStatus}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Prenumerationer</div>
        <div className="card-sub">
          Tysta pengaläckor nummer ett. Skriv upp allt du betalar för varje månad —
          och se vad det kostar per år.
        </div>
        {subs.map((s) => (
          <div className="expense-row" key={s.id}>
            <span className="note">{s.name}</span>
            <span className="amount">{kr(s.price)}/mån</span>
            <button
              className="row-del"
              onClick={() => setSubs(subs.filter((x) => x.id !== s.id))}
            >
              ✕
            </button>
          </div>
        ))}
        {subs.length > 0 && (
          <>
            <div className="result-line">
              <span>Per månad</span>
              <span className="value">{kr(subTotal)}</span>
            </div>
            <div className="result-line">
              <span>Per år</span>
              <span className="value">{kr(subTotal * 12)}</span>
            </div>
          </>
        )}
        <div className="two-col" style={{ marginTop: 10 }}>
          <input
            value={subName}
            placeholder="T.ex. Netflix…"
            onChange={(e) => setSubName(e.target.value)}
          />
          <input
            value={subPrice}
            inputMode="decimal"
            placeholder="Kr/mån"
            onChange={(e) => setSubPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSub()}
          />
        </div>
        <div className="add-row">
          <button className="btn" style={{ flex: 1 }} onClick={addSub}>
            Lägg till prenumeration
          </button>
        </div>
      </div>

      {(byCategory.length > 0 || editBudgets) && (
        <div className="card">
          <div className="goal-head">
            <div className="card-title">Vart pengarna går</div>
            <button
              className="row-del"
              onClick={() => setEditBudgets(!editBudgets)}
              style={{ color: 'var(--gold)' }}
            >
              {editBudgets ? 'Klar' : '✎ Budget'}
            </button>
          </div>
          {editBudgets ? (
            <>
              <div className="card-sub">
                Sätt månadsbudget per kategori — staplarna blir röda om du går över.
              </div>
              {expenseCategories.map((c) => (
                <div className="cat-bar" key={c}>
                  <span className="name">{c}</span>
                  <input
                    inputMode="numeric"
                    placeholder="Budget kr/mån…"
                    value={budgets[c] || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      const next = { ...budgets }
                      if (v > 0) next[c] = v
                      else delete next[c]
                      setBudgets(next)
                    }}
                    style={{ flex: 1, padding: '6px 10px' }}
                  />
                </div>
              ))}
            </>
          ) : (
            byCategory.map((c) => {
              const budget = budgets[c.name]
              const over = budget ? c.total > budget : false
              const width = budget
                ? Math.min(100, (c.total / budget) * 100)
                : (c.total / maxCat) * 100
              return (
                <div className="cat-bar" key={c.name}>
                  <span className="name">{c.name}</span>
                  <div className="bar">
                    <div
                      className={over ? 'over' : ''}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="amt">
                    {budget ? `${kr(c.total)} / ${kr(budget)}` : kr(c.total)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}

      {monthExpenses.length > 0 && (
        <div className="card">
          <div className="card-title">Senaste utgifter</div>
          {monthExpenses.slice(0, 12).map((e) => (
            <div className="expense-row" key={e.id}>
              <span className="date">{e.date.slice(5)}</span>
              <span className="note">{e.note || e.category}</span>
              <span className="amount">{kr(e.amount)}</span>
              <button className="row-del" onClick={() => removeExpense(e.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">Betala dig själv först</div>
        <div className="card-sub">
          Innan du betalar en enda räkning: sätt undan en del till dig själv. De
          pengarna är heliga.
        </div>
        <input
          value={income}
          inputMode="numeric"
          placeholder="Din månadsinkomst (kr)…"
          onChange={(e) => setIncome(e.target.value)}
          style={{ width: '100%' }}
        />
        {incomeNum > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="result-line">
              <span>10 % — grundnivån</span>
              <span className="value">{kr(incomeNum * 0.1)} / mån</span>
            </div>
            <div className="result-line">
              <span>15 % — ett steg till</span>
              <span className="value">{kr(incomeNum * 0.15)} / mån</span>
            </div>
            <div className="result-line">
              <span>20 % — framtidsläget</span>
              <span className="value">{kr(incomeNum * 0.2)} / mån</span>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              Samma datum varje månad, fast belopp. Konsekvens slår engångsinsatser.
              📈
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Tydliga sparmål</div>
        <div className="card-sub">
          Vaga mål = vaga resultat. "100 000 kr på 2 år" slår "jag vill spara
          pengar".
        </div>

        {goals.map((g) => {
          const pct = Math.min(100, (g.saved / g.target) * 100)
          return (
            <div className="goal" key={g.id}>
              <div className="goal-head">
                <span className="goal-name">
                  {pct >= 100 ? '🏆 ' : '🎯 '}
                  {g.name}
                </span>
                <span className="goal-nums">
                  {kr(g.saved)} / {kr(g.target)} · {Math.floor(pct)} %
                </span>
              </div>
              <div className="progress">
                <div style={{ width: `${pct}%` }} />
              </div>
              <div className="goal-actions">
                <input
                  value={deposits[g.id] ?? ''}
                  inputMode="decimal"
                  placeholder="Belopp…"
                  onChange={(e) =>
                    setDeposits({ ...deposits, [g.id]: e.target.value })
                  }
                  onKeyDown={(e) => e.key === 'Enter' && deposit(g.id)}
                />
                <button className="btn" onClick={() => deposit(g.id)}>
                  Sätt in
                </button>
                <button className="btn-ghost" onClick={() => removeGoal(g.id)}>
                  Ta bort
                </button>
              </div>
            </div>
          )
        })}

        <div className="two-col" style={{ marginTop: 12 }}>
          <input
            value={goalName}
            placeholder="Mål, t.ex. Buffert…"
            onChange={(e) => setGoalName(e.target.value)}
          />
          <input
            value={goalTarget}
            inputMode="numeric"
            placeholder="Målbelopp (kr)"
            onChange={(e) => setGoalTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          />
        </div>
        <div className="add-row">
          <button className="btn" style={{ flex: 1 }} onClick={addGoal}>
            Lägg till mål
          </button>
        </div>
      </div>
    </>
  )
}
