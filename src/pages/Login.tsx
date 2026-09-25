import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { useLang } from '../i18n'

export default function Login() {
  const { t, lang, setLang } = useLang()
  const [mode, setMode] = useState<'signIn' | 'create'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signIn') await signInWithEmailAndPassword(auth, email.trim(), password)
      else await createUserWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>{t.appName}</h1>
        <label>
          {t.email}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t.password}
          <input
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {mode === 'signIn' ? t.signIn : t.createAccount}
        </button>
        <button type="button" className="link" onClick={() => setMode(mode === 'signIn' ? 'create' : 'signIn')}>
          {mode === 'signIn' ? t.noAccount : t.haveAccount}
        </button>
        <button type="button" className="link" onClick={() => setLang(lang === 'en' ? 'my' : 'en')}>
          {lang === 'en' ? 'မြန်မာ' : 'English'}
        </button>
      </form>
    </div>
  )
}
