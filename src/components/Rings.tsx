export interface RingSpec {
  pct: number
  color: string
  label: string
  icon: string
}

export default function Rings({ rings }: { rings: RingSpec[] }) {
  const size = 172
  const stroke = 14
  const gap = 4
  return (
    <div className="rings-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((r, i) => {
          const radius = size / 2 - stroke / 2 - i * (stroke + gap)
          const circ = 2 * Math.PI * radius
          const pct = Math.max(0, Math.min(100, r.pct))
          return (
            <g key={r.label}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--card2)"
                strokeWidth={stroke}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={String(circ)}
                strokeDashoffset={circ * (1 - pct / 100)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="ring-anim"
              />
            </g>
          )
        })}
      </svg>
      <div className="rings-legend">
        {rings.map((r) => (
          <div key={r.label} className="ring-leg">
            <span className="ring-dot" style={{ background: r.color }} />
            <span>
              {r.icon} {r.label}
            </span>
            <strong>{Math.round(Math.min(100, r.pct))}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
