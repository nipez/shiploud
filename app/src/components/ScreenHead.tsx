import type { ReactNode } from 'react'

export function ScreenHead({
  eyebrow,
  title,
  sub,
  action,
  className = '',
  eyebrowClassName = '',
  titleClassName = '',
  titleRowClassName = '',
  actionClassName = '',
  subClassName = '',
}: {
  eyebrow: string
  title: string
  sub: string
  action?: ReactNode
  className?: string
  eyebrowClassName?: string
  titleClassName?: string
  titleRowClassName?: string
  actionClassName?: string
  subClassName?: string
}) {
  const splitAction = Boolean(actionClassName)
  return (
    <header className={className || 'mb-6'}>
      <p className={`mb-1.5 font-script text-2xl font-bold text-orange ${eyebrowClassName}`.trim()}>
        {eyebrow}
      </p>
      {splitAction ? (
        <>
          <h1
            className={`mb-1.5 text-[31px] font-black tracking-[-0.02em] text-navy ${titleClassName} ${titleRowClassName}`.trim()}
          >
            {title}
          </h1>
          {action ? <div className={`mb-1.5 ${actionClassName}`.trim()}>{action}</div> : null}
        </>
      ) : (
        <div className={`mb-1.5 flex flex-wrap items-end gap-3 ${titleRowClassName}`.trim()}>
          <h1 className={`text-[31px] font-black tracking-[-0.02em] text-navy ${titleClassName}`.trim()}>
            {title}
          </h1>
          <span className="flex-1" />
          {action}
        </div>
      )}
      <p className={`max-w-[640px] text-sm font-bold text-muted ${subClassName}`.trim()}>{sub}</p>
    </header>
  )
}
