import type { Ingredient, MenuItem, RecipeLine } from '../types'

export function ingredientUsage(
  lines: { menuItemId: string; qty: number }[],
  menu: Map<string, MenuItem>,
): RecipeLine[] {
  const totals = new Map<string, number>()
  for (const line of lines) {
    const item = menu.get(line.menuItemId)
    if (!item) continue
    for (const r of item.recipe) {
      totals.set(r.ingredientId, (totals.get(r.ingredientId) ?? 0) + r.qty * line.qty)
    }
  }
  return [...totals].map(([ingredientId, qty]) => ({ ingredientId, qty }))
}

export function usageCost(usage: RecipeLine[], ingredients: Map<string, Ingredient>): number {
  let cost = 0
  for (const u of usage) cost += u.qty * (ingredients.get(u.ingredientId)?.costPerUnit ?? 0)
  return Math.round(cost)
}

export function shortages(usage: RecipeLine[], ingredients: Map<string, Ingredient>): Ingredient[] {
  return usage.flatMap((u) => {
    const ing = ingredients.get(u.ingredientId)
    return ing && ing.stock < u.qty ? [ing] : []
  })
}

export function portionsPossible(item: MenuItem, ingredients: Map<string, Ingredient>): number | null {
  if (item.recipe.length === 0) return null
  let min = Infinity
  for (const r of item.recipe) {
    if (r.qty <= 0) continue
    const stock = ingredients.get(r.ingredientId)?.stock ?? 0
    min = Math.min(min, Math.floor(stock / r.qty))
  }
  return min === Infinity ? null : Math.max(0, min)
}

export function isLow(ing: Ingredient): boolean {
  return ing.stock <= ing.lowStock
}
