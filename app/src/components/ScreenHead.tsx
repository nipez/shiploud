import type { ReactNode } from 'react'

export function ScreenHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string
  title: string
  sub: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6">
      <p className="mb-1.5 font-script text-2xl font-bold text-orange">{eyebrow}</p>
      <div className="mb-1.5 flex flex-wrap items-end gap-3">
        <h1 className="text-[31px] font-black tracking-[-0.02em] text-navy">{title}</h1>
        <span className="flex-1" />
        {action}
      </div>
      <p className="max-w-[640px] text-sm font-bold text-muted">{sub}</p>
    </header>
  )
}
