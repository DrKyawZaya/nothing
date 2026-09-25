import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from './firebase'
import { dictionaries, LangContext, useLang } from './i18n'
import { ShopDataContext, UidContext, useIngredients, useMenu } from './data'
import type { Lang } from './types'
import Login from './pages/Login'
import Sell from './pages/Sell'
import Buy from './pages/Buy'
import Stock from './pages/Stock'
import Reports from './pages/Reports'
import Setup from './pages/Setup'

type Tab = 'sell' | 'buy' | 'stock' | 'reports' | 'setup'
const tabs: { key: Tab; icon: string }[] = [
  { key: 'sell', icon: '🛒' },
  { key: 'buy', icon: '📦' },
  { key: 'stock', icon: '📋' },
  { key: 'reports', icon: '📊' },
  { key: 'setup', icon: '⚙️' },
]

function readLang(): Lang {
  try {
    return localStorage.getItem('lang') === 'en' ? 'en' : 'my'
  } catch {
    return 'my'
  }
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(readLang)
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('lang', l)
    } catch {
      // storage unavailable (private mode); keep in memory only
    }
  }

  return (
    <LangContext.Provider value={{ lang, t: dictionaries[lang], setLang }}>
      {user === undefined ? null : user ? (
        <UidContext.Provider value={user.uid}>
          <ShopData uid={user.uid}>
            <Shell />
          </ShopData>
        </UidContext.Provider>
      ) : (
        <Login />
      )}
    </LangContext.Provider>
  )
}

function ShopData({ uid, children }: { uid: string; children: ReactNode }) {
  const ingredients = useIngredients(uid)
  const menu = useMenu(uid)
  const value = useMemo(() => ({ ingredients, menu }), [ingredients, menu])
  return <ShopDataContext.Provider value={value}>{children}</ShopDataContext.Provider>
}

function Shell() {
  const { t, lang, setLang } = useLang()
  const [tab, setTab] = useState<Tab>('sell')
  const online = useOnline()

  return (
    <div className="shell">
      <header className="topbar">
        <strong>{t.appName}</strong>
        <div className="topbar-actions">
          <button className="chip" onClick={() => setLang(lang === 'en' ? 'my' : 'en')}>
            {lang === 'en' ? 'မြန်မာ' : 'English'}
          </button>
          {tab === 'setup' && (
            <button className="chip" onClick={() => signOut(auth)}>
              {t.signOut}
            </button>
          )}
        </div>
      </header>
      {!online && <div className="offline-bar">{t.offline}</div>}
      <main className="content">
        {tab === 'sell' && <Sell />}
        {tab === 'buy' && <Buy />}
        {tab === 'stock' && <Stock />}
        {tab === 'reports' && <Reports />}
        {tab === 'setup' && <Setup />}
      </main>
      <nav className="tabbar">
        {tabs.map((x) => (
          <button key={x.key} className={tab === x.key ? 'active' : ''} onClick={() => setTab(x.key)}>
            <span className="tab-icon">{x.icon}</span>
            <span>{t[x.key]}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
