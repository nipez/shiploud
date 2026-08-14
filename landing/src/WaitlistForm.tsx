import { useState, type FormEvent } from 'react'

const API_BASE = 'https://shiploud-api.nickperez.workers.dev'

type Props = {
  id?: string
  size?: 'lg' | 'md'
  className?: string
  source?: string
}

export default function WaitlistForm({ id, size = 'lg', className = '', source = 'marketing' }: Props) {
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
        className={`flex items-center gap-3 rounded-[24px] border-2 border-navy/10 bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(43,27,77,0.08)] ${className}`}
        role="status"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange text-white font-black shadow-[0_3px_0_#C9440A]">
          ✓
        </span>
        <div>
          <p className="font-extrabold text-navy">You're on the list.</p>
          <p className="text-sm text-muted">We'll ping you when ShipLoud opens.</p>
        </div>
      </div>
    )
  }

  const isLg = size === 'lg'
  const busy = status === 'loading'

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className={`flex w-full flex-col gap-3 sm:flex-row sm:items-stretch ${className}`}
      noValidate
    >
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
        className={`min-w-0 flex-1 rounded-full border-2 border-navy/10 bg-white text-navy placeholder:text-muted/70 outline-none transition shadow-[0_4px_14px_rgba(43,27,77,0.06)] focus:border-orange focus:ring-4 focus:ring-orange/20 disabled:opacity-70 ${
          isLg ? 'px-5 py-3.5 text-base font-semibold' : 'px-4 py-3 text-sm font-semibold'
        }`}
        aria-invalid={status === 'error'}
        aria-describedby={status === 'error' ? `${id ?? 'waitlist'}-err` : undefined}
      />
      <button
        type="submit"
        disabled={busy}
        className={`btn-pill shrink-0 disabled:opacity-70 ${isLg ? 'px-7 py-3.5 text-base' : 'px-6 py-3 text-sm'}`}
      >
        {busy ? 'Joining…' : 'Join the waitlist'}
      </button>
      {status === 'error' && (
        <p id={`${id ?? 'waitlist'}-err`} className="basis-full text-sm font-bold text-orange-deep" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
