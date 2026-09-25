import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  AdjustmentReason,
  Ingredient,
  MenuItem,
  PaymentMethod,
  Purchase,
  PurchaseLine,
  RecipeLine,
  Sale,
  SaleLine,
} from './types'

export const UidContext = createContext('')
export const useUid = () => useContext(UidContext)

export const ShopDataContext = createContext<{ ingredients: Ingredient[] | null; menu: MenuItem[] | null }>({
  ingredients: null,
  menu: null,
})
export const useShopData = () => useContext(ShopDataContext)

const col = (uid: string, name: string) => collection(db, 'users', uid, name)

// Offline writes only resolve once the server acknowledges them, so callers
// must not await commit; the local cache updates immediately.
function commit(batch: WriteBatch) {
  batch.commit().catch((e) => {
    console.error(e)
    alert(String(e?.message ?? e))
  })
}

function useCollection<T>(
  uid: string,
  name: string,
  convert: (id: string, d: DocumentData) => T,
  start?: Date,
  end?: Date,
): T[] | null {
  const startMs = start?.getTime()
  const endMs = end?.getTime()
  const key = `${uid}/${name}/${startMs}/${endMs}`
  const [state, setState] = useState<{ key: string; rows: T[] } | null>(null)
  useEffect(() => {
    const constraints: QueryConstraint[] =
      startMs === undefined || endMs === undefined
        ? []
        : [
            where('date', '>=', Timestamp.fromMillis(startMs)),
            where('date', '<', Timestamp.fromMillis(endMs)),
            orderBy('date', 'desc'),
          ]
    return onSnapshot(
      query(col(uid, name), ...constraints),
      (snap) => setState({ key, rows: snap.docs.map((d) => convert(d.id, d.data())) }),
      (e) => console.error(name, e),
    )
  }, [uid, name, convert, startMs, endMs, key])
  return state?.key === key ? state.rows : null
}

const toIngredient = (id: string, d: DocumentData): Ingredient => ({
  id,
  nameEn: d.nameEn ?? '',
  nameMy: d.nameMy ?? '',
  unit: d.unit ?? '',
  stock: d.stock ?? 0,
  lowStock: d.lowStock ?? 0,
  costPerUnit: d.costPerUnit ?? 0,
})

const toMenuItem = (id: string, d: DocumentData): MenuItem => ({
  id,
  nameEn: d.nameEn ?? '',
  nameMy: d.nameMy ?? '',
  price: d.price ?? 0,
  recipe: d.recipe ?? [],
  active: d.active ?? true,
})

const toSale = (id: string, d: DocumentData): Sale => ({
  id,
  date: (d.date as Timestamp).toDate(),
  lines: d.lines ?? [],
  total: d.total ?? 0,
  cost: d.cost ?? 0,
  payment: d.payment ?? 'cash',
  usage: d.usage ?? [],
})

const toPurchase = (id: string, d: DocumentData): Purchase => ({
  id,
  date: (d.date as Timestamp).toDate(),
  lines: d.lines ?? [],
  total: d.total ?? 0,
  note: d.note ?? '',
})

const byName = (a: { nameEn: string }, b: { nameEn: string }) => a.nameEn.localeCompare(b.nameEn)

export function useIngredients(uid: string) {
  const rows = useCollection(uid, 'ingredients', toIngredient)
  return useMemo(() => rows && [...rows].sort(byName), [rows])
}

export function useMenu(uid: string) {
  const rows = useCollection(uid, 'menuItems', toMenuItem)
  return useMemo(() => rows && [...rows].sort(byName), [rows])
}

export function useSales(uid: string, start: Date, end: Date) {
  return useCollection(uid, 'sales', toSale, start, end)
}

export function usePurchases(uid: string, start: Date, end: Date) {
  return useCollection(uid, 'purchases', toPurchase, start, end)
}

type IngredientInput = Omit<Ingredient, 'id' | 'stock' | 'costPerUnit'>

export function saveIngredient(uid: string, id: string | null, data: IngredientInput) {
  const batch = writeBatch(db)
  if (id) batch.update(doc(col(uid, 'ingredients'), id), { ...data })
  else batch.set(doc(col(uid, 'ingredients')), { ...data, stock: 0, costPerUnit: 0 })
  commit(batch)
}

export function deleteIngredient(uid: string, id: string) {
  const batch = writeBatch(db)
  batch.delete(doc(col(uid, 'ingredients'), id))
  commit(batch)
}

export function saveMenuItem(uid: string, id: string | null, data: Omit<MenuItem, 'id'>) {
  const batch = writeBatch(db)
  batch.set(id ? doc(col(uid, 'menuItems'), id) : doc(col(uid, 'menuItems')), data)
  commit(batch)
}

export function deleteMenuItem(uid: string, id: string) {
  const batch = writeBatch(db)
  batch.delete(doc(col(uid, 'menuItems'), id))
  commit(batch)
}

function applyUsage(batch: WriteBatch, uid: string, usage: RecipeLine[], sign: 1 | -1) {
  for (const u of usage) {
    batch.update(doc(col(uid, 'ingredients'), u.ingredientId), { stock: increment(sign * u.qty) })
  }
}

export function recordSale(
  uid: string,
  sale: { lines: SaleLine[]; total: number; cost: number; payment: PaymentMethod; usage: RecipeLine[] },
) {
  const batch = writeBatch(db)
  batch.set(doc(col(uid, 'sales')), { ...sale, date: Timestamp.now() })
  applyUsage(batch, uid, sale.usage, -1)
  commit(batch)
}

export function deleteSale(uid: string, sale: Sale, existingIngredients: Set<string>) {
  const batch = writeBatch(db)
  batch.delete(doc(col(uid, 'sales'), sale.id))
  applyUsage(batch, uid, sale.usage.filter((u) => existingIngredients.has(u.ingredientId)), 1)
  commit(batch)
}

export function recordPurchase(uid: string, lines: PurchaseLine[], note: string) {
  const batch = writeBatch(db)
  const total = lines.reduce((s, l) => s + l.cost, 0)
  batch.set(doc(col(uid, 'purchases')), { lines, total, note, date: Timestamp.now() })
  for (const l of lines) {
    batch.update(doc(col(uid, 'ingredients'), l.ingredientId), {
      stock: increment(l.qty),
      ...(l.qty > 0 && l.cost > 0 ? { costPerUnit: l.cost / l.qty } : {}),
    })
  }
  commit(batch)
}

export function deletePurchase(uid: string, purchase: Purchase, existingIngredients: Set<string>) {
  const batch = writeBatch(db)
  batch.delete(doc(col(uid, 'purchases'), purchase.id))
  applyUsage(
    batch,
    uid,
    purchase.lines.filter((l) => existingIngredients.has(l.ingredientId)),
    -1,
  )
  commit(batch)
}

export function adjustStock(uid: string, ingredientId: string, qty: number, reason: AdjustmentReason) {
  const batch = writeBatch(db)
  batch.set(doc(col(uid, 'adjustments')), { ingredientId, qty, reason, date: Timestamp.now() })
  batch.update(doc(col(uid, 'ingredients'), ingredientId), { stock: increment(qty) })
  commit(batch)
}
