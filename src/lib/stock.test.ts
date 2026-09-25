import { describe, expect, it } from 'vitest'
import { ingredientUsage, portionsPossible, shortages, usageCost } from './stock'
import type { Ingredient, MenuItem } from '../types'

const ing = (id: string, stock: number, costPerUnit: number): Ingredient => ({
  id,
  nameEn: id,
  nameMy: '',
  unit: 'pcs',
  stock,
  lowStock: 0,
  costPerUnit,
})

const ingredients = new Map([
  ['egg', ing('egg', 10, 200)],
  ['bread', ing('bread', 3, 150)],
  ['veg', ing('veg', 500, 2)],
])

const breakfast: MenuItem = {
  id: 'breakfast',
  nameEn: 'American breakfast',
  nameMy: '',
  price: 5000,
  active: true,
  recipe: [
    { ingredientId: 'egg', qty: 2 },
    { ingredientId: 'bread', qty: 2 },
    { ingredientId: 'veg', qty: 50 },
  ],
}
const friedEgg: MenuItem = { ...breakfast, id: 'friedEgg', recipe: [{ ingredientId: 'egg', qty: 1 }] }
const menu = new Map([breakfast, friedEgg].map((m) => [m.id, m]))

describe('ingredientUsage', () => {
  it('multiplies recipes by quantity and merges shared ingredients', () => {
    const usage = ingredientUsage(
      [
        { menuItemId: 'breakfast', qty: 2 },
        { menuItemId: 'friedEgg', qty: 3 },
      ],
      menu,
    )
    expect(Object.fromEntries(usage.map((u) => [u.ingredientId, u.qty]))).toEqual({ egg: 7, bread: 4, veg: 100 })
  })

  it('ignores unknown menu items', () => {
    expect(ingredientUsage([{ menuItemId: 'gone', qty: 1 }], menu)).toEqual([])
  })
})

describe('usageCost', () => {
  it('sums qty × cost per unit', () => {
    const usage = ingredientUsage([{ menuItemId: 'breakfast', qty: 1 }], menu)
    expect(usageCost(usage, ingredients)).toBe(2 * 200 + 2 * 150 + 50 * 2)
  })
})

describe('shortages', () => {
  it('lists ingredients without enough stock', () => {
    const usage = ingredientUsage([{ menuItemId: 'breakfast', qty: 2 }], menu)
    expect(shortages(usage, ingredients).map((i) => i.id)).toEqual(['bread'])
  })
})

describe('portionsPossible', () => {
  it('is limited by the scarcest ingredient', () => {
    expect(portionsPossible(breakfast, ingredients)).toBe(1)
    expect(portionsPossible(friedEgg, ingredients)).toBe(10)
  })

  it('is null when there is no recipe', () => {
    expect(portionsPossible({ ...breakfast, recipe: [] }, ingredients)).toBeNull()
  })

  it('never goes below zero', () => {
    const negative = new Map([['egg', ing('egg', -3, 0)]])
    expect(portionsPossible(friedEgg, negative)).toBe(0)
  })
})
