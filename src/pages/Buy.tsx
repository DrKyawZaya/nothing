import { useMemo, useState } from 'react'
import { deletePurchase, recordPurchase, useShopData, usePurchases, useUid } from '../data'
import { displayName, useLang } from '../i18n'
import { formatDateTime, formatMMK, formatNumber, parseAmount } from '../lib/format'

interface Draft {
  ingredientId: string
  qty: string
  cost: string
}

const emptyLine = (): Draft => ({ ingredientId: '', qty: '', cost: '' })

export default function Buy() {
  const uid = useUid()
  const { t, lang } = useLang()
  const { ingredients } = useShopData()
  const [lines, setLines] = useState<Draft[]>([emptyLine()])
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState(false)
  const [range] = useState(() => {
    const end = new Date(Date.now() + 86_400_000)
    return { start: new Date(end.getTime() - 31 * 86_400_000), end }
  })
  const purchases = usePurchases(uid, range.start, range.end)
  const ingMap = useMemo(() => new Map((ingredients ?? []).map((i) => [i.id, i])), [ingredients])

  const parsed = lines
    .map((l) => ({ ingredientId: l.ingredientId, qty: parseAmount(l.qty), cost: parseAmount(l.cost) }))
    .filter((l) => l.ingredientId && l.qty > 0)
  const total = parsed.reduce((s, l) => s + l.cost, 0)

  const update = (i: number, patch: Partial<Draft>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  function save() {
    if (parsed.length === 0) return
    recordPurchase(uid, parsed, note.trim())
    setLines([emptyLine()])
    setNote('')
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  if (!ingredients) return null
  if (ingredients.length === 0) return <p className="muted">{t.noIngredients}</p>

  return (
    <div className="stack">
      <section className="card">
        <h2>{t.buy}</h2>
        {lines.map((l, i) => {
          const ing = ingMap.get(l.ingredientId)
          return (
            <div key={i} className="purchase-line">
              <select value={l.ingredientId} onChange={(e) => update(i, { ingredientId: e.target.value })}>
                <option value="">{t.ingredient}…</option>
                {ingredients.map((x) => (
                  <option key={x.id} value={x.id}>
                    {displayName(x, lang)} ({x.unit})
                  </option>
                ))}
              </select>
              <label>
                {t.qty} {ing && `(${ing.unit})`}
                <input inputMode="decimal" value={l.qty} onChange={(e) => update(i, { qty: e.target.value })} />
              </label>
              <label>
                {t.totalCost}
                <input inputMode="numeric" value={l.cost} onChange={(e) => update(i, { cost: e.target.value })} />
              </label>
            </div>
          )
        })}
        <button className="link" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
          {t.addLine}
        </button>
        <label>
          {t.note}
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="cart-total">
          <span>{t.total}</span>
          <strong>{formatMMK(total)}</strong>
        </div>
        <button className="primary" onClick={save} disabled={parsed.length === 0}>
          {flash ? `✓ ${t.saved}` : t.savePurchase}
        </button>
      </section>

      <section className="card">
        <h2>{t.recentPurchases}</h2>
        {purchases?.length === 0 && <p className="muted">{t.nothing}</p>}
        {purchases?.map((p) => (
          <div key={p.id} className="history-row">
            <div className="grow">
              <div className="muted small">
                {formatDateTime(p.date)} {p.note && `· ${p.note}`}
              </div>
              {p.lines.map((l, i) => {
                const ing = ingMap.get(l.ingredientId)
                return (
                  <div key={i}>
                    {ing ? displayName(ing, lang) : '—'} × {formatNumber(l.qty)} {ing?.unit} — {formatMMK(l.cost)}
                  </div>
                )
              })}
            </div>
            <strong>{formatMMK(p.total)}</strong>
            <button
              className="icon-btn"
              aria-label={t.delete}
              onClick={() => confirm(t.confirmDelete) && deletePurchase(uid, p, new Set(ingMap.keys()))}
            >
              🗑
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
