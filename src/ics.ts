import { pad } from './store'

export interface IcsEvent {
  title: string
  start: Date
  durationMin?: number
  rrule?: string
  description?: string
}

const fmt = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

const escape = (s: string) => s.replace(/([,;\\])/g, '\\$1')

export function downloadIcs(filename: string, events: IcsEvent[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlaneraMera//SV',
  ]
  for (const e of events) {
    const end = new Date(e.start.getTime() + (e.durationMin ?? 60) * 60000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${Math.random().toString(36).slice(2)}@planeramera`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(e.start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${escape(e.title)}`,
    )
    if (e.rrule) lines.push(`RRULE:${e.rrule}`)
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], {
    type: 'text/calendar;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
