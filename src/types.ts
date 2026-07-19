export type Tier = 'major' | 'medium' | 'small'

export interface PlanTask {
  id: string
  text: string
  tier: Tier
  done: boolean
}

export interface Habit {
  id: string
  name: string
}

export interface Expense {
  id: string
  date: string // YYYY-MM-DD
  amount: number
  category: string
  note: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
}

export interface ShopItem {
  id: string
  text: string
  checked: boolean
}
