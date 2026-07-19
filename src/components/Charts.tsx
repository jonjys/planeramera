interface Point {
  label: string
  value: number
}

export function Bars({
  data,
  height = 68,
  color = 'var(--gold)',
}: {
  data: Point[]
  height?: number
  color?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <div className="bars" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="bars-col" title={`${d.label}: ${d.value}`}>
            <div
              className="bars-bar"
              style={{
                height: `${Math.max(3, (d.value / max) * 100)}%`,
                background: d.value > 0 ? color : 'var(--card2)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="bars-labels">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Linjediagram där värdet 0 tolkas som "saknas" och hoppar över punkten. */
export function LineChart({
  data,
  height = 68,
  min = 0,
  max,
  color = 'var(--gold)',
}: {
  data: Point[]
  height?: number
  min?: number
  max?: number
  color?: string
}) {
  const w = 300
  const top = max ?? Math.max(...data.map((d) => d.value), 1)
  const stepX = w / Math.max(1, data.length - 1)
  const y = (v: number) =>
    height - 6 - ((v - min) / Math.max(1, top - min)) * (height - 12)

  const segments: string[] = []
  let current: string[] = []
  data.forEach((d, i) => {
    if (d.value > 0) {
      current.push(`${i * stepX},${y(d.value)}`)
    } else if (current.length) {
      segments.push(current.join(' '))
      current = []
    }
  })
  if (current.length) segments.push(current.join(' '))

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        style={{ width: '100%', height }}
        preserveAspectRatio="none"
      >
        {segments.map((points, i) => (
          <polyline
            key={i}
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {data.map((d, i) =>
          d.value > 0 ? (
            <circle key={i} cx={i * stepX} cy={y(d.value)} r={3.5} fill={color} />
          ) : null,
        )}
      </svg>
      <div className="bars-labels">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}
