import { useMemo, useState } from 'react'
import { deleteSale, useShopData, usePurchases, useSales, useUid } from '../data'
import { displayName, useLang } from '../i18n'
import { formatDateTime, formatMMK } from '../lib/format'
import { periodRange, summarize, type PeriodKey } from '../lib/report'
import type { PaymentMethod } from '../types'

const periods: PeriodKey[] = ['today', 'yesterday', 'week', 'month', 'lastMonth']
const payments: PaymentMethod[] = ['cash', 'kpay', 'wave', 'other']

export default function Reports() {
  const uid = useUid()
  const { t, lang } = useLang()
  const [period, setPeriod] = useState<PeriodKey>('today')
  const range = useMemo(() => periodRange(period), [period])
  const sales = useSales(uid, range.start, range.end)
  const purchases = usePurchases(uid, range.start, range.end)
  const { ingredients } = useShopData()
  const summary = useMemo(() => summarize(sales ?? [], purchases ?? []), [sales, purchases])
  const maxItem = Math.max(1, ...summary.topItems.map((i) => i.amount))

  const tiles: [string, number, boolean?][] = [
    [t.sales, summary.salesTotal],
    [t.ingredientCost, summary.cost],
    [t.grossProfit, summary.grossProfit, true],
    [t.purchases, summary.purchasesTotal],
    [t.cashFlow, summary.cashFlow, true],
  ]

  return (
    <div className="stack">
      <div className="segmented scroll">
        {periods.map((p) => (
          <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
            {t[p]}
          </button>
        ))}
      </div>

      <section className="tiles">
        {tiles.map(([label, value, signed]) => (
          <div key={label} className="tile">
            <span className="muted small">{label}</span>
            <strong className={signed && value < 0 ? 'negative' : ''}>{formatMMK(value)}</strong>
          </div>
        ))}
        <div className="tile">
          <span className="muted small">{t.orders}</span>
          <strong>{summary.saleCount}</strong>
        </div>
      </section>

      <section className="card">
        <h2>{t.topItems}</h2>
        {summary.topItems.length === 0 && <p className="muted">{t.nothing}</p>}
        {summary.topItems.map((i) => (
          <div key={i.menuItemId} className="bar-row">
            <div className="bar-label">
              <span className="grow">
                {displayName(i, lang)} × {i.qty}
              </span>
              <span>{formatMMK(i.amount)}</span>
            </div>
            <div className="bar-track">
              <div className="bar" style={{ width: `${(i.amount / maxItem) * 100}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>{t.byPayment}</h2>
        {payments.map((p) => (
          <div key={p} className="kv">
            <span>{t[p]}</span>
            <span>{formatMMK(summary.byPayment[p])}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>{t.history}</h2>
        {sales?.length === 0 && <p className="muted">{t.nothing}</p>}
        {sales?.map((s) => (
          <div key={s.id} className="history-row">
            <div className="grow">
              <div className="muted small">
                {formatDateTime(s.date)} · {t[s.payment]}
              </div>
              <div>{s.lines.map((l) => `${displayName(l, lang)} × ${l.qty}`).join(', ')}</div>
            </div>
            <strong>{formatMMK(s.total)}</strong>
            <button
              className="icon-btn"
              aria-label={t.delete}
              onClick={() =>
                confirm(t.confirmDelete) && deleteSale(uid, s, new Set((ingredients ?? []).map((i) => i.id)))
              }
            >
              🗑
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
