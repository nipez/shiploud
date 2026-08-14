import { useState, type FormEvent } from 'react'

const API_BASE = 'https://shiploud-api.nickperez.workers.dev'

type Props = {
  id?: string
  className?: string
  source?: string
}

export default function WaitlistForm({ id, className = '', source = 'marketing' }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error')
      setError('Enter a real email.')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      })
      let data: { ok?: boolean; error?: string } = {}
      try {
        data = (await res.json()) as { ok?: boolean; error?: string }
      } catch {
        data = {}
      }

      if (!res.ok || !data.ok) {
        if (res.status === 429) {
          setStatus('error')
          setError('Slow down — try again in a minute.')
          return
        }
        if (data.error === 'email_required') {
          setStatus('error')
          setError('Enter a real email.')
          return
        }
        setStatus('error')
        setError('Couldn’t join right now. Try again.')
        return
      }

      setStatus('ok')
      setEmail('')
    } catch {
      setStatus('error')
      setError('Network hiccup — try again.')
    }
  }

  if (status === 'ok') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-sticker-mint bg-cream-2 px-[22px] py-3.5 text-[15px] font-extrabold text-navy shadow-[0_6px_18px_rgba(43,27,77,.08)] ${className}`}
        role="status"
      >
        <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-navy bg-sticker-mint text-xs font-black">
          ✓
        </span>
        You're on the list. We'll ping you when ShipLoud opens.
      </div>
    )
  }

  const busy = status === 'loading'

  return (
    <form id={id} onSubmit={onSubmit} className={`w-full ${className}`} noValidate>
      <div className="flex max-w-[480px] flex-wrap gap-2.5">
        <label className="sr-only" htmlFor={id ? `${id}-email` : 'waitlist-email'}>
          Email
        </label>
        <input
          id={id ? `${id}-email` : 'waitlist-email'}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@shipfast.dev"
          value={email}
          disabled={busy}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          className="min-w-0 flex-1 rounded-full border-[1.5px] border-line bg-cream-2 px-[22px] py-3.5 text-[15px] font-bold text-navy outline-none placeholder:text-muted/55 focus:border-orange/60 focus:shadow-[0_0_0_3px_rgba(255,106,43,.14)] disabled:opacity-70"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? `${id ?? 'waitlist'}-err` : undefined}
        />
        <button type="submit" disabled={busy} className="btn-pill shrink-0 whitespace-nowrap px-[26px] py-3.5 text-[15px] disabled:opacity-70">
          {busy ? 'Joining…' : 'Join the waitlist'}
        </button>
      </div>
      {status === 'error' && (
        <p id={`${id ?? 'waitlist'}-err`} className="mt-2 text-sm font-bold text-orange-deep" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
