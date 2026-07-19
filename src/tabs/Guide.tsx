import { principles, moneyHabits, memoryTips } from '../data'
import type { Principle } from '../data'

function PrincipleCard({ p }: { p: Principle }) {
  return (
    <div className="card principle">
      <div className="p-icon">{p.icon}</div>
      <div>
        <h3>{p.title}</h3>
        <div className="p-sub">{p.subtitle}</div>
        <ul>
          {p.points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Guide() {
  return (
    <>
      <div className="card">
        <div className="card-title">Guiden</div>
        <div className="hint">
          Skärmdumpar fixar inte ditt liv — men rätt information gör det enklare.
          Här är principerna bakom appen, samlade på ett ställe.
        </div>
      </div>

      <div className="guide-section">8 japanska principer mot lathet</div>
      {principles.map((p) => (
        <PrincipleCard key={p.title} p={p} />
      ))}

      <div className="guide-section">Penningvanor som bygger frihet</div>
      {moneyHabits.map((p) => (
        <PrincipleCard key={p.title} p={p} />
      ))}

      <div className="guide-section">Sluta glömma allt</div>
      {memoryTips.map((p) => (
        <PrincipleCard key={p.title} p={p} />
      ))}

      <div className="card">
        <div className="card-title">Kom ihåg</div>
        <div className="hint">
          Disciplin idag, frihet imorgon. Fokus · Planera · Genomför · Upprepa. ✨
        </div>
      </div>
    </>
  )
}
