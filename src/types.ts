export type Lang = 'en' | 'my'

export interface Ingredient {
  id: string
  nameEn: string
  nameMy: string
  unit: string
  stock: number
  lowStock: number
  costPerUnit: number
}

export interface RecipeLine {
  ingredientId: string
  qty: number
}

export interface MenuItem {
  id: string
  nameEn: string
  nameMy: string
  price: number
  recipe: RecipeLine[]
  active: boolean
}

export type PaymentMethod = 'cash' | 'kpay' | 'wave' | 'other'

export interface SaleLine {
  menuItemId: string
  nameEn: string
  nameMy: string
  qty: number
  price: number
}

export interface Sale {
  id: string
  date: Date
  lines: SaleLine[]
  total: number
  cost: number
  payment: PaymentMethod
  usage: RecipeLine[]
}

export interface PurchaseLine {
  ingredientId: string
  qty: number
  cost: number
}

export interface Purchase {
  id: string
  date: Date
  lines: PurchaseLine[]
  total: number
  note: string
}

export type AdjustmentReason = 'waste' | 'count'

export interface Adjustment {
  id: string
  date: Date
  ingredientId: string
  qty: number
  reason: AdjustmentReason
}
