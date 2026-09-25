import { describe, expect, it } from 'vitest'
import { periodRange, summarize } from './report'
import { parseAmount } from './format'
import type { Purchase, Sale } from '../types'

const sale = (total: number, cost: number, payment: Sale['payment'], qty = 1): Sale => ({
  id: String(Math.random()),
  date: new Date(),
  total,
  cost,
  payment,
  usage: [],
  lines: [{ menuItemId: 'b', nameEn: 'Breakfast', nameMy: '', qty, price: total / qty }],
})

describe('summarize', () => {
  it('computes totals, profit and payment split', () => {
    const purchases: Purchase[] = [{ id: 'p', date: new Date(), lines: [], total: 8000, note: '' }]
    const s = summarize([sale(5000, 1500, 'cash'), sale(10000, 3000, 'kpay', 2)], purchases)
    expect(s.salesTotal).toBe(15000)
    expect(s.cost).toBe(4500)
    expect(s.grossProfit).toBe(10500)
    expect(s.purchasesTotal).toBe(8000)
    expect(s.cashFlow).toBe(7000)
    expect(s.byPayment).toEqual({ cash: 5000, kpay: 10000, wave: 0, other: 0 })
    expect(s.topItems).toEqual([{ menuItemId: 'b', nameEn: 'Breakfast', nameMy: '', qty: 3, amount: 15000 }])
  })
})

describe('periodRange', () => {
  const now = new Date(2026, 8, 25, 14, 30) // Friday

  it('week starts on Monday', () => {
    const { start, end } = periodRange('week', now)
    expect(start).toEqual(new Date(2026, 8, 21))
    expect(end).toEqual(new Date(2026, 8, 26))
  })

  it('last month covers the whole previous month', () => {
    const { start, end } = periodRange('lastMonth', now)
    expect(start).toEqual(new Date(2026, 7, 1))
    expect(end).toEqual(new Date(2026, 8, 1))
  })

  it('yesterday ends at midnight today', () => {
    const { start, end } = periodRange('yesterday', now)
    expect(start).toEqual(new Date(2026, 8, 24))
    expect(end).toEqual(new Date(2026, 8, 25))
  })
})

describe('parseAmount', () => {
  it('accepts commas and Myanmar digits', () => {
    expect(parseAmount('12,500')).toBe(12500)
    expect(parseAmount('၅၀၀၀')).toBe(5000)
    expect(parseAmount('abc')).toBe(0)
  })
})
