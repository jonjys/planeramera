import { useState } from 'react'
import { useStored, dateKey, monthKey, uid, kr } from '../store'
import { expenseCategories } from '../data'
import type { Expense, Goal } from '../types'

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
      </div>

      {byCategory.length > 0 && (
        <div className="card">
          <div className="card-title">Vart pengarna går</div>
          {byCategory.map((c) => (
            <div className="cat-bar" key={c.name}>
              <span className="name">{c.name}</span>
              <div className="bar">
                <div style={{ width: `${(c.total / maxCat) * 100}%` }} />
              </div>
              <span className="amt">{kr(c.total)}</span>
            </div>
          ))}
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
