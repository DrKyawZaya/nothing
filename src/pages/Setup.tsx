import { useMemo, useState } from 'react'
import {
  deleteIngredient,
  deleteMenuItem,
  saveIngredient,
  saveMenuItem,
  useShopData,
  useUid,
} from '../data'
import { displayName, useLang } from '../i18n'
import { formatMMK, formatNumber, parseAmount } from '../lib/format'
import { usageCost } from '../lib/stock'
import type { Ingredient, MenuItem } from '../types'

const unitSuggestions = ['pcs', 'g', 'kg', 'ml', 'L', 'slice', 'pack', 'bottle', 'ခု', 'လုံး', 'ချပ်', 'ထုပ်', 'ပိဿာ', 'ကျပ်သား']

export default function Setup() {
  const uid = useUid()
  const { t, lang } = useLang()
  const { ingredients, menu } = useShopData()
  const [editIng, setEditIng] = useState<Ingredient | 'new' | null>(null)
  const [editMenu, setEditMenu] = useState<MenuItem | 'new' | null>(null)
  const ingMap = useMemo(() => new Map((ingredients ?? []).map((i) => [i.id, i])), [ingredients])

  if (!ingredients || !menu) return null

  function removeIngredient(ing: Ingredient) {
    const usedBy = menu!.filter((m) => m.recipe.some((r) => r.ingredientId === ing.id))
    if (usedBy.length > 0) {
      alert(`${t.usedIn} ${usedBy.map((m) => displayName(m, lang)).join(', ')}`)
      return
    }
    if (confirm(`${t.delete} ${displayName(ing, lang)}?`)) deleteIngredient(uid, ing.id)
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>{t.menuItems}</h2>
        {menu.map((m) =>
          editMenu !== 'new' && editMenu?.id === m.id ? (
            <MenuForm key={m.id} item={m} ingredients={ingredients} onDone={() => setEditMenu(null)} />
          ) : (
            <div key={m.id} className={`list-row ${m.active ? '' : 'inactive'}`}>
              <span className="grow">{displayName(m, lang)}</span>
              <span className="muted small">
                {t.cost} {formatMMK(usageCost(m.recipe, ingMap))}
              </span>
              <strong>{formatMMK(m.price)}</strong>
              <button className="chip" onClick={() => setEditMenu(m)}>
                {t.edit}
              </button>
            </div>
          ),
        )}
        {editMenu === 'new' ? (
          <MenuForm item={null} ingredients={ingredients} onDone={() => setEditMenu(null)} />
        ) : (
          <button className="link" onClick={() => setEditMenu('new')}>
            {t.addMenuItem}
          </button>
        )}
      </section>

      <section className="card">
        <h2>{t.ingredients}</h2>
        {ingredients.map((ing) =>
          editIng !== 'new' && editIng?.id === ing.id ? (
            <IngredientForm key={ing.id} ing={ing} onDone={() => setEditIng(null)} />
          ) : (
            <div key={ing.id} className="list-row">
              <span className="grow">
                {displayName(ing, lang)} <span className="muted small">({ing.unit})</span>
              </span>
              <span className="muted small">
                {formatMMK(ing.costPerUnit)}/{ing.unit}
              </span>
              <button className="chip" onClick={() => setEditIng(ing)}>
                {t.edit}
              </button>
              <button className="icon-btn" aria-label={t.delete} onClick={() => removeIngredient(ing)}>
                🗑
              </button>
            </div>
          ),
        )}
        {editIng === 'new' ? (
          <IngredientForm ing={null} onDone={() => setEditIng(null)} />
        ) : (
          <button className="link" onClick={() => setEditIng('new')}>
            {t.addIngredient}
          </button>
        )}
      </section>

      <datalist id="units">
        {unitSuggestions.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </div>
  )
}

function IngredientForm({ ing, onDone }: { ing: Ingredient | null; onDone: () => void }) {
  const uid = useUid()
  const { t } = useLang()
  const [nameEn, setNameEn] = useState(ing?.nameEn ?? '')
  const [nameMy, setNameMy] = useState(ing?.nameMy ?? '')
  const [unit, setUnit] = useState(ing?.unit ?? '')
  const [lowStock, setLowStock] = useState(ing ? String(ing.lowStock) : '')

  function save() {
    if (!nameEn.trim() && !nameMy.trim()) return
    saveIngredient(uid, ing?.id ?? null, {
      nameEn: nameEn.trim(),
      nameMy: nameMy.trim(),
      unit: unit.trim(),
      lowStock: parseAmount(lowStock),
    })
    onDone()
  }

  return (
    <div className="form">
      <label>
        {t.nameEn}
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoFocus />
      </label>
      <label>
        {t.nameMy}
        <input value={nameMy} onChange={(e) => setNameMy(e.target.value)} />
      </label>
      <div className="row">
        <label className="grow">
          {t.unit}
          <input list="units" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </label>
        <label className="grow">
          {t.lowStockAt}
          <input inputMode="decimal" value={lowStock} onChange={(e) => setLowStock(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button className="secondary" onClick={onDone}>
          {t.cancel}
        </button>
        <button className="primary grow" onClick={save}>
          {t.save}
        </button>
      </div>
    </div>
  )
}

function MenuForm({
  item,
  ingredients,
  onDone,
}: {
  item: MenuItem | null
  ingredients: Ingredient[]
  onDone: () => void
}) {
  const uid = useUid()
  const { t, lang } = useLang()
  const [nameEn, setNameEn] = useState(item?.nameEn ?? '')
  const [nameMy, setNameMy] = useState(item?.nameMy ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [active, setActive] = useState(item?.active ?? true)
  const [recipe, setRecipe] = useState(
    (item?.recipe ?? []).map((r) => ({ ingredientId: r.ingredientId, qty: String(r.qty) })),
  )
  const ingMap = new Map(ingredients.map((i) => [i.id, i]))

  const parsedRecipe = recipe
    .map((r) => ({ ingredientId: r.ingredientId, qty: parseAmount(r.qty) }))
    .filter((r) => r.ingredientId && r.qty > 0)
  const cost = usageCost(parsedRecipe, ingMap)
  const priceNum = parseAmount(price)

  const update = (i: number, patch: Partial<{ ingredientId: string; qty: string }>) =>
    setRecipe((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  function save() {
    if (!nameEn.trim() && !nameMy.trim()) return
    saveMenuItem(uid, item?.id ?? null, {
      nameEn: nameEn.trim(),
      nameMy: nameMy.trim(),
      price: priceNum,
      recipe: parsedRecipe,
      active,
    })
    onDone()
  }

  return (
    <div className="form">
      <label>
        {t.nameEn}
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoFocus />
      </label>
      <label>
        {t.nameMy}
        <input value={nameMy} onChange={(e) => setNameMy(e.target.value)} />
      </label>
      <label>
        {t.price}
        <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>

      <div className="muted small">{t.recipe}</div>
      {recipe.map((r, i) => (
        <div key={i} className="row">
          <select className="grow" value={r.ingredientId} onChange={(e) => update(i, { ingredientId: e.target.value })}>
            <option value="">{t.ingredient}…</option>
            {ingredients.map((x) => (
              <option key={x.id} value={x.id}>
                {displayName(x, lang)} ({x.unit})
              </option>
            ))}
          </select>
          <input
            className="qty-input"
            inputMode="decimal"
            placeholder={t.qty}
            value={r.qty}
            onChange={(e) => update(i, { qty: e.target.value })}
          />
          <button
            className="icon-btn"
            aria-label={t.delete}
            onClick={() => setRecipe((rs) => rs.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      {ingredients.length === 0 ? (
        <p className="muted small">{t.noIngredients}</p>
      ) : (
        <button className="link" onClick={() => setRecipe((rs) => [...rs, { ingredientId: '', qty: '' }])}>
          {t.addIngredient}
        </button>
      )}

      <div className="kv">
        <span>{t.estCost}</span>
        <span>{formatMMK(cost)}</span>
      </div>
      <div className="kv">
        <span>{t.margin}</span>
        <strong className={priceNum - cost < 0 ? 'negative' : ''}>
          {formatMMK(priceNum - cost)}
          {priceNum > 0 && ` (${formatNumber(Math.round(((priceNum - cost) / priceNum) * 100))}%)`}
        </strong>
      </div>

      <label className="check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        {t.active}
      </label>
      <div className="row">
        <button className="secondary" onClick={onDone}>
          {t.cancel}
        </button>
        <button className="primary grow" onClick={save}>
          {t.save}
        </button>
      </div>
      {item && (
        <button
          className="link danger"
          onClick={() => {
            if (confirm(`${t.delete} ${displayName(item, lang)}?`)) {
              deleteMenuItem(uid, item.id)
              onDone()
            }
          }}
        >
          {t.delete}
        </button>
      )}
    </div>
  )
}
