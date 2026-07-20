export interface WeekStats {
  name: string
  level: number
  weekXp: number
  tasksDone: number
  bestStreak: number
}

export async function shareWeekImage(stats: WeekStats) {
  return shareStatsImage({
    title: 'MIN VECKA',
    subtitle: stats.name,
    rows: [
      ['⭐', `Nivå ${stats.level}`],
      ['⚡', `${stats.weekXp} XP denna vecka`],
      ['✅', `${stats.tasksDone} uppgifter klara`],
      ['🔥', `${stats.bestStreak} dagars bästa streak`],
    ],
    filename: 'planeramera-min-vecka.png',
  })
}

export interface StatsImage {
  title: string
  subtitle?: string
  rows: [string, string][]
  filename: string
}

/** Genererar en story-bild (1080×1920) och öppnar delningsmenyn. */
export async function shareStatsImage(img: StatsImage) {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1920
  const ctx = c.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#0b0b0d'
  ctx.fillRect(0, 0, 1080, 1920)
  const glow = ctx.createRadialGradient(540, 80, 60, 540, 80, 900)
  glow.addColorStop(0, 'rgba(242,193,78,0.22)')
  glow.addColorStop(1, 'rgba(242,193,78,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1080, 1920)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#f2c14e'
  ctx.font = '800 52px Sora, sans-serif'
  ctx.fillText('PLANERA MERA', 540, 200)

  ctx.fillStyle = '#f5f2ea'
  ctx.font = '800 110px Sora, sans-serif'
  ctx.fillText(img.title, 540, 360)
  if (img.subtitle) {
    ctx.fillStyle = '#9b978c'
    ctx.font = '500 48px "Space Grotesk", sans-serif'
    ctx.fillText(img.subtitle, 540, 440)
  }

  const rows = img.rows
  const spacing = rows.length > 4 ? 210 : 240
  const startY = rows.length > 4 ? 640 : 700
  rows.forEach(([icon, text], i) => {
    const y = startY + i * spacing
    ctx.fillStyle = '#16161a'
    roundRect(ctx, 90, y - 120, 900, 190, 28)
    ctx.fill()
    ctx.strokeStyle = '#b98f2e'
    ctx.lineWidth = 2
    roundRect(ctx, 90, y - 120, 900, 190, 28)
    ctx.stroke()
    ctx.font = '80px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#f5f2ea'
    ctx.fillText(icon, 140, y + 8)
    ctx.font = '700 60px "Space Grotesk", sans-serif'
    ctx.fillText(text, 290, y + 2)
    ctx.textAlign = 'center'
  })

  ctx.fillStyle = '#f2c14e'
  ctx.font = '700 44px "Space Grotesk", sans-serif'
  ctx.fillText('Disciplin idag, frihet imorgon.', 540, 1740)
  ctx.fillStyle = '#9b978c'
  ctx.font = '500 36px "Space Grotesk", sans-serif'
  ctx.fillText('planeramera', 540, 1810)

  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'))
  if (!blob) return
  const file = new File([blob], img.filename, { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Min vecka' })
      return
    }
  } catch {
    // användaren avbröt — falla igenom till nedladdning vore fel här
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  URL.revokeObjectURL(a.href)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
