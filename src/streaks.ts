import { dateKey, addDays } from './store'

/** Streak som räknar både avbockade och frysta dagar.
 *  Streaken lever så länge idag eller igår är täckt. */
export function streakWith(dates: string[], frozen: string[] = []): number {
  const set = new Set([...dates, ...frozen])
  let count = 0
  let cursor = new Date()
  if (!set.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1)
    if (!set.has(dateKey(cursor))) return 0
  }
  while (set.has(dateKey(cursor))) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}
