import { useState } from 'react'
import { adjustStock, useShopData, useUid } from '../data'
import { displayName, useLang } from '../i18n'
import { formatMMK, formatNumber, parseAmount } from '../lib/format'
import { isLow } from '../lib/stock'
import type { AdjustmentReason, Ingredient } from '../types'

export default function Stock() {
  const { t, lang } = useLang()
  const { ingredients } = useShopData()
  const [editing, setEditing] = useState<string | null>(null)

  if (!ingredients) return null
  if (ingredients.length === 0) return <p className="muted">{t.noIngredients}</p>

  const sorted = [...ingredients].sort((a, b) => Number(isLow(b)) - Number(isLow(a)))
  const value = ingredients.reduce((s, i) => s + Math.max(0, i.stock) * i.costPerUnit, 0)

  return (
    <section className="card">
      <h2>
        {t.stock} <span className="muted small">≈ {formatMMK(value)}</span>
      </h2>
      {sorted.map((ing) => (
        <div key={ing.id} className={`stock-row ${isLow(ing) ? 'low' : ''}`}>
          <div className="stock-main">
            <span className="grow">
              {displayName(ing, lang)}
              {isLow(ing) && <span className="tag">{t.lowStock}</span>}
            </span>
            <strong>
              {formatNumber(ing.stock)} {ing.unit}
            </strong>
            <button className="chip" onClick={() => setEditing(editing === ing.id ? null : ing.id)}>
              {t.adjust}
            </button>
          </div>
          {editing === ing.id && <AdjustForm ing={ing} onDone={() => setEditing(null)} />}
        </div>
      ))}
    </section>
  )
}

function AdjustForm({ ing, onDone }: { ing: Ingredient; onDone: () => void }) {
  const uid = useUid()
  const { t } = useLang()
  const [reason, setReason] = useState<AdjustmentReason>('waste')
  const [value, setValue] = useState('')

  function apply() {
    const n = parseAmount(value)
    if (value.trim() === '') return
    const delta = reason === 'waste' ? -n : n - ing.stock
    if (delta !== 0) adjustStock(uid, ing.id, delta, reason)
    onDone()
  }

  return (
    <div className="adjust">
      <div className="segmented">
        <button className={reason === 'waste' ? 'active' : ''} onClick={() => setReason('waste')}>
          {t.waste}
        </button>
        <button className={reason === 'count' ? 'active' : ''} onClick={() => setReason('count')}>
          {t.count}
        </button>
      </div>
      <label>
        {reason === 'waste' ? t.amount : t.newCount} ({ing.unit})
        <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </label>
      <div className="row">
        <button className="secondary" onClick={onDone}>
          {t.cancel}
        </button>
        <button className="primary grow" onClick={apply}>
          {t.apply}
        </button>
      </div>
    </div>
  )
}
