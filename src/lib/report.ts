import type { PaymentMethod, Purchase, Sale } from '../types'

export type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth'

export function periodRange(key: PeriodKey, now = new Date()): { start: Date; end: Date } {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  switch (key) {
    case 'today':
      return { start: day, end: addDays(day, 1) }
    case 'yesterday':
      return { start: addDays(day, -1), end: day }
    case 'week': {
      const sinceMonday = (day.getDay() + 6) % 7
      return { start: addDays(day, -sinceMonday), end: addDays(day, 1) }
    }
    case 'month':
      return { start: new Date(day.getFullYear(), day.getMonth(), 1), end: addDays(day, 1) }
    case 'lastMonth':
      return {
        start: new Date(day.getFullYear(), day.getMonth() - 1, 1),
        end: new Date(day.getFullYear(), day.getMonth(), 1),
      }
  }
}

export interface ItemTotal {
  menuItemId: string
  nameEn: string
  nameMy: string
  qty: number
  amount: number
}

export interface Summary {
  salesTotal: number
  saleCount: number
  cost: number
  grossProfit: number
  purchasesTotal: number
  cashFlow: number
  byPayment: Record<PaymentMethod, number>
  topItems: ItemTotal[]
}

export function summarize(sales: Sale[], purchases: Purchase[]): Summary {
  const byPayment: Record<PaymentMethod, number> = { cash: 0, kpay: 0, wave: 0, other: 0 }
  const items = new Map<string, ItemTotal>()
  let salesTotal = 0
  let cost = 0
  for (const s of sales) {
    salesTotal += s.total
    cost += s.cost
    byPayment[s.payment] += s.total
    for (const l of s.lines) {
      const t = items.get(l.menuItemId) ?? { ...l, qty: 0, amount: 0 }
      t.qty += l.qty
      t.amount += l.qty * l.price
      items.set(l.menuItemId, t)
    }
  }
  const purchasesTotal = purchases.reduce((sum, p) => sum + p.total, 0)
  return {
    salesTotal,
    saleCount: sales.length,
    cost,
    grossProfit: salesTotal - cost,
    purchasesTotal,
    cashFlow: salesTotal - purchasesTotal,
    byPayment,
    topItems: [...items.values()]
      .map(({ menuItemId, nameEn, nameMy, qty, amount }) => ({ menuItemId, nameEn, nameMy, qty, amount }))
      .sort((a, b) => b.amount - a.amount),
  }
}
