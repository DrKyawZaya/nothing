import { useMemo, useState } from 'react'
import { recordSale, useShopData, useUid } from '../data'
import { displayName, useLang } from '../i18n'
import { formatMMK, parseAmount } from '../lib/format'
import { ingredientUsage, portionsPossible, shortages, usageCost } from '../lib/stock'
import type { PaymentMethod } from '../types'

const payments: PaymentMethod[] = ['cash', 'kpay', 'wave', 'other']

export default function Sell() {
  const uid = useUid()
  const { t, lang } = useLang()
  const { ingredients, menu } = useShopData()
  const [cart, setCart] = useState<Map<string, number>>(new Map())
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [received, setReceived] = useState('')
  const [flash, setFlash] = useState(false)

  const menuMap = useMemo(() => new Map((menu ?? []).map((m) => [m.id, m])), [menu])
  const ingMap = useMemo(() => new Map((ingredients ?? []).map((i) => [i.id, i])), [ingredients])

  const lines = [...cart].flatMap(([id, qty]) => {
    const item = menuMap.get(id)
    return item ? [{ item, qty }] : []
  })
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0)
  const change = parseAmount(received) - total

  const add = (id: string, delta: number) =>
    setCart((c) => {
      const next = new Map(c)
      const qty = (next.get(id) ?? 0) + delta
      if (qty > 0) next.set(id, qty)
      else next.delete(id)
      return next
    })

  const reset = () => {
    setCart(new Map())
    setReceived('')
    setPayment('cash')
  }

  function save() {
    if (lines.length === 0) return
    const usage = ingredientUsage(
      lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty })),
      menuMap,
    ).filter((u) => ingMap.has(u.ingredientId))
    const short = shortages(usage, ingMap)
    if (short.length > 0) {
      const names = short.map((i) => displayName(i, lang)).join(', ')
      if (!confirm(`${t.notEnough} ${names}. ${t.saveAnyway}`)) return
    }
    recordSale(uid, {
      lines: lines.map((l) => ({
        menuItemId: l.item.id,
        nameEn: l.item.nameEn,
        nameMy: l.item.nameMy,
        qty: l.qty,
        price: l.item.price,
      })),
      total,
      cost: usageCost(usage, ingMap),
      payment,
      usage,
    })
    reset()
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  if (!menu || !ingredients) return null
  const active = menu.filter((m) => m.active)

  return (
    <div className="sell">
      <section className="menu-grid">
        {active.length === 0 && <p className="muted">{t.noMenu}</p>}
        {active.map((m) => {
          const left = portionsPossible(m, ingMap)
          return (
            <button key={m.id} className={`menu-btn ${left === 0 ? 'out' : ''}`} onClick={() => add(m.id, 1)}>
              <span className="menu-name">{displayName(m, lang)}</span>
              <span className="menu-price">{formatMMK(m.price)}</span>
              {left !== null && (
                <span className="menu-left">
                  {left} {t.left}
                </span>
              )}
              {cart.get(m.id) && <span className="badge">{cart.get(m.id)}</span>}
            </button>
          )
        })}
      </section>

      <section className="card cart">
        <h2>{t.cart}</h2>
        {lines.length === 0 && <p className="muted">{t.emptyCart}</p>}
        {lines.map(({ item, qty }) => (
          <div key={item.id} className="cart-line">
            <span className="grow">{displayName(item, lang)}</span>
            <button className="qty-btn" onClick={() => add(item.id, -1)} aria-label="-">
              −
            </button>
            <span className="qty">{qty}</span>
            <button className="qty-btn" onClick={() => add(item.id, 1)} aria-label="+">
              +
            </button>
            <span className="amount">{formatMMK(item.price * qty)}</span>
          </div>
        ))}
        <div className="cart-total">
          <span>{t.total}</span>
          <strong>{formatMMK(total)}</strong>
        </div>

        <div className="segmented">
          {payments.map((p) => (
            <button key={p} className={payment === p ? 'active' : ''} onClick={() => setPayment(p)}>
              {t[p]}
            </button>
          ))}
        </div>

        {payment === 'cash' && total > 0 && (
          <>
            <label>
              {t.received}
              <input inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value)} />
            </label>
            <div className="quick-cash">
              {[total, ...[5000, 10000, 20000, 50000].filter((v) => v > total)].slice(0, 4).map((v) => (
                <button key={v} className="chip" onClick={() => setReceived(String(v))}>
                  {formatMMK(v)}
                </button>
              ))}
            </div>
            {received && (
              <div className={`cart-total ${change < 0 ? 'negative' : ''}`}>
                <span>{t.change}</span>
                <strong>{formatMMK(change)}</strong>
              </div>
            )}
          </>
        )}

        <div className="row">
          <button className="secondary" onClick={reset}>
            {t.clear}
          </button>
          <button className="primary grow" onClick={save} disabled={lines.length === 0}>
            {flash ? `✓ ${t.saved}` : t.saveSale}
          </button>
        </div>
      </section>
    </div>
  )
}
