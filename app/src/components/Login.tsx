import { useState, type FormEvent } from 'react'
import EarlySticker from './EarlySticker'
import { CANONICAL_SHIPLOUD_URL } from '../url'

type Mode = 'passphrase' | 'email' | 'signup'

type Props = {
  onPassphraseLogin: (pass: string) => Promise<void>
  onEmailLogin: (email: string, password: string) => Promise<void>
  onSignup: (input: {
    email: string
    password: string
    inviteCode: string
    displayName?: string
  }) => Promise<void>
}

function friendlyError(code: string): string {
  switch (code) {
    case 'invalid_pass':
      return 'Wrong passphrase'
    case 'invalid_credentials':
      return 'Wrong email or password'
    case 'invalid_invite':
      return 'Invite code not found'
    case 'invite_used':
      return 'That invite was already used'
    case 'invite_required':
      return 'Invite code required'
    case 'email_taken':
      return 'Email already registered'
    case 'password_too_short':
      return 'Password must be at least 8 characters'
    case 'email_required':
      return 'Enter a valid email'
    case 'credentials_required':
      return 'Enter your credentials'
    default:
      return code
  }
}

export default function Login({ onPassphraseLogin, onEmailLogin, onSignup }: Props) {
  const [mode, setMode] = useState<Mode>('passphrase')
  const [pass, setPass] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'passphrase') {
        await onPassphraseLogin(pass)
      } else if (mode === 'email') {
        await onEmailLogin(email, password)
      } else {
        await onSignup({
          email,
          password,
          inviteCode,
          displayName: displayName.trim() || undefined,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(friendlyError(msg))
    } finally {
      setBusy(false)
    }
  }

  const tabBtn = (id: Mode, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setMode(id)
        setError(null)
      }}
      className={`min-h-10 flex-1 rounded-full px-3 text-xs font-extrabold transition sm:text-sm ${
        mode === id
          ? 'bg-orange text-white shadow-[0_2px_0_#C9440A]'
          : 'border border-line bg-card text-muted hover:text-navy'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card-soft w-full max-w-sm p-6 sm:p-7">
        <div className="mb-1 flex flex-wrap items-center gap-2.5">
          <a
            href={CANONICAL_SHIPLOUD_URL}
            className="font-extrabold tracking-tight text-navy text-xl transition hover:opacity-90"
            aria-label="ShipLoud home"
          >
            Ship<span className="text-orange">Loud</span>
          </a>
          <EarlySticker />
          <a
            href={CANONICAL_SHIPLOUD_URL}
            className="text-xs font-extrabold text-muted transition hover:text-orange"
          >
            Home
          </a>
        </div>
        <p className="mb-4 text-sm text-muted">
          {mode === 'signup'
            ? 'Join with an invite — email + password.'
            : mode === 'email'
              ? 'Early access login with your email.'
              : 'Early access login — enter your passphrase.'}
        </p>

        <div className="mb-4 flex gap-1.5">{['passphrase', 'email', 'signup'].map((m) =>
          tabBtn(
            m as Mode,
            m === 'passphrase' ? 'Passphrase' : m === 'email' ? 'Email' : 'Sign up',
          ),
        )}</div>

        {mode === 'passphrase' && (
          <>
            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted">
              Your passphrase
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="input-soft mb-3 min-h-12 w-full text-base"
              placeholder="••••••••"
              required
            />
          </>
        )}

        {(mode === 'email' || mode === 'signup') && (
          <>
            {mode === 'signup' && (
              <>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted">
                  Invite code
                </label>
                <input
                  type="text"
                  autoComplete="one-time-code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="input-soft mb-3 min-h-12 w-full font-mono text-base tracking-wider"
                  placeholder="ABCD2345"
                  required
                />
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted">
                  Display name <span className="font-semibold normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-soft mb-3 min-h-12 w-full text-base"
                  placeholder="Nicholas"
                />
              </>
            )}
            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-soft mb-3 min-h-12 w-full text-base"
              placeholder="you@example.com"
              required
            />
            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted">
              Password
            </label>
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-soft mb-3 min-h-12 w-full text-base"
              placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
            />
          </>
        )}

        {error && (
          <p className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={
            busy ||
            (mode === 'passphrase'
              ? !pass
              : mode === 'email'
                ? !email || !password
                : !email || !password || !inviteCode)
          }
          className="btn-pill flex min-h-12 w-full items-center justify-center text-sm"
        >
          {busy
            ? mode === 'signup'
              ? 'Creating account…'
              : 'Signing in…'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
