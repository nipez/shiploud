import type { ReactNode } from 'react'

function AppWindow({
  title,
  step,
  children,
}: {
  title: string
  step: string
  children: ReactNode
}) {
  return (
    <div className="tour-window">
      <div className="tour-window-chrome">
        <div className="tour-window-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="tour-window-title">
          <span className="tour-window-step">{step}</span>
          {title}
        </p>
      </div>
      <div className="tour-window-body">{children}</div>
    </div>
  )
}

function TodayMini() {
  return (
    <AppWindow title="Ship journal" step="01">
      <div className="tour-app-panel">
        <p className="tour-app-eyebrow">Today</p>
        <h4 className="tour-app-heading">What actually shipped</h4>

        <div className="tour-field">
          <div className="tour-field-label">
            <span>What shipped</span>
          </div>
          <div className="tour-field-value tour-field-value--tall">
            ShipLoud landing live at shiploud.pages.dev
          </div>
        </div>

        <div className="tour-field">
          <div className="tour-field-label">
            <span>Numbers</span>
          </div>
          <div className="tour-field-value">~8 followers · $0 MRR · 1 product shipped</div>
        </div>

        <div className="tour-field">
          <div className="tour-field-label">
            <span>Blocker</span>
          </div>
          <div className="tour-field-value tour-field-value--tall">
            Decision: use the product ourselves before the pitch.
          </div>
        </div>

        <button type="button" className="tour-btn tour-btn--primary" tabIndex={-1}>
          Save today&apos;s entry
        </button>
      </div>
    </AppWindow>
  )
}

function DraftsMini() {
  return (
    <AppWindow title="Post drafts" step="02">
      <div className="tour-app-panel tour-app-panel--stack">
        <p className="tour-app-eyebrow">Drafts</p>
        <h4 className="tour-app-heading">Approve queue</h4>

        <article className="tour-draft-card">
          <div className="tour-draft-meta">
            <span className="tour-pill tour-pill--ready">Ready</span>
            <span className="tour-draft-time">just now</span>
          </div>
          <p className="tour-draft-body">
            Project #1. Day 1.
            <br />
            Idea → landing → live URL.
            <br />
            Same afternoon.
            <br />
            <br />
            Followers: still ~8
            <br />
            MRR: $0
            <br />
            Products shipped: 1
            <br />
            <br />
            North star isn&apos;t followers.
            <br />
            It&apos;s shipped products.
          </p>
          <div className="tour-draft-actions">
            <button type="button" className="tour-btn tour-btn--primary" tabIndex={-1}>
              Approve
            </button>
            <button type="button" className="tour-btn tour-btn--ghost" tabIndex={-1}>
              Copy
            </button>
          </div>
        </article>

        <article className="tour-draft-card tour-draft-card--dim">
          <div className="tour-draft-meta">
            <span className="tour-pill tour-pill--idea">Idea</span>
            <span className="tour-draft-time">earlier</span>
          </div>
          <p className="tour-draft-body">
            My X timeline was replies.
            <br />
            So I built the tool I needed.
          </p>
        </article>
      </div>
    </AppWindow>
  )
}

function RadarMini() {
  return (
    <AppWindow title="Reply radar" step="03">
      <div className="tour-app-panel">
        <p className="tour-app-eyebrow">Reply radar</p>
        <h4 className="tour-app-heading">Who to engage</h4>

        <article className="tour-radar-card">
          <div className="tour-radar-top">
            <span className="tour-handle">@marc_louv</span>
            <span className="tour-pill tour-pill--todo">Todo</span>
          </div>
          <p className="tour-radar-summary">
            Short post about shipping ugly MVPs before polishing distribution.
          </p>
          <div className="tour-reply-box">
            <p className="tour-reply-label">Suggested reply</p>
            <p className="tour-reply-text">
              This. Landing live same afternoon. Followers still ~8, MRR $0, products
              shipped: 1. North star is shipped products — building ShipLoud so the
              posts match the shipping.
            </p>
          </div>
          <button type="button" className="tour-btn tour-btn--primary" tabIndex={-1}>
            Copy reply
          </button>
        </article>
      </div>
    </AppWindow>
  )
}

const panels = [
  {
    key: 'today',
    caption: 'Log what actually shipped.',
    label: 'Today — Ship journal',
    ui: <TodayMini />,
  },
  {
    key: 'drafts',
    caption: 'Get posts in your shipper voice.',
    label: 'Drafts — Approve queue',
    ui: <DraftsMini />,
  },
  {
    key: 'radar',
    caption: 'Know who to engage today.',
    label: 'Reply radar',
    ui: <RadarMini />,
  },
]

export default function ProductTour() {
  return (
    <section id="tour" className="tour-section px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-script text-2xl text-orange">see it →</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-navy sm:text-4xl">
            Journal. Drafts. Replies.
          </h2>
          <p className="mt-3 max-w-xl text-base font-semibold leading-relaxed text-muted sm:text-lg">
            The loop, in three screens — clear, concrete, ready to approve.
          </p>
        </div>

        <div className="tour-track mt-10" role="list">
          {panels.map((panel, i) => (
            <article key={panel.key} className="tour-panel" role="listitem">
              <div className="tour-panel-label">
                <span className="tour-panel-num" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{panel.label}</span>
              </div>
              {panel.ui}
              <p className="tour-caption">{panel.caption}</p>
            </article>
          ))}
        </div>

        <p className="tour-footnote mt-8 text-center text-sm font-bold text-muted">
          Approve before anything leaves the queue. Copy → X for now.
        </p>
      </div>
    </section>
  )
}
