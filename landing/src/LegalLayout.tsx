import type { ReactNode } from 'react'

function Logo({ className = '' }: { className?: string }) {
  return (
    <a href="/" className={`inline-flex items-center gap-2.5 font-black tracking-tight text-navy ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-orange shadow-[0_3px_0_#C9440A]" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <circle cx="11" cy="13" r="2.4" fill="#fff" />
          <circle cx="21" cy="13" r="2.4" fill="#fff" />
          <path d="M10 20c2.2 2.4 9.8 2.4 12 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span>
        Ship<span className="text-orange">Loud</span>
      </span>
    </a>
  )
}

export default function LegalLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-navy/5 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo className="text-lg" />
          <a href="/" className="text-sm font-bold text-navy/80 transition hover:text-orange">
            ← Home
          </a>
        </div>
      </header>

      <main className="px-4 py-12 sm:px-6 sm:py-16">
        <article className="card-soft mx-auto max-w-3xl border-2 border-navy/10 p-6 sm:p-10">
          <p className="font-script text-2xl text-orange">legal →</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-navy sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm font-semibold text-muted">
            Standard policy for an early product. Last updated August 12, 2026.
          </p>
          <div className="legal-prose mt-8 space-y-5 text-[15px] font-semibold leading-relaxed text-navy/90">
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t border-navy/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Logo className="text-base" />
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted">
            <a href="/privacy" className="transition hover:text-orange">
              Privacy
            </a>
            <a href="/terms" className="transition hover:text-orange">
              Terms
            </a>
            <span>© 2026 ShipLoud · getshiploud.com</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
