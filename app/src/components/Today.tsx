import { useEffect, useState, type ReactNode } from 'react'
import type { Draft, JournalEntry, Metrics, Setup } from '../types'
import { activeProject, isSetupEmpty } from '../types'
import { todayISO, uid } from '../storage'
import { generateDraftsSmart } from '../generateSmart'
import { track } from '../track'
import WeeklyReceipts from './WeeklyReceipts'

type Props = {
  journals: JournalEntry[]
  setup: Setup
  metrics: Metrics
  showSetupBanner: boolean
  onSave: (entry: JournalEntry) => void
  onGeneratedDrafts: (drafts: Draft[]) => void
  onOpenSetup: () => void
  onSetActiveProject: (projectId: string) => void
  onDismissSetupBanner: () => void
  onSaveMetrics: (metrics: Metrics) => void
  children?: ReactNode
}

export default function Today({
  journals,
  setup,
  metrics,
  showSetupBanner,
  onSave,
  onGeneratedDrafts,
  onOpenSetup,
  onSetActiveProject,
  onDismissSetupBanner,
  onSaveMetrics,
  children,
}: Props) {
  const today = todayISO()
  const existing = journals.find((j) => j.date === today) ?? journals[0]
  const project = activeProject(setup)

  const [shipped, setShipped] = useState(existing?.shipped ?? '')
  const [numbers, setNumbers] = useState(existing?.numbers ?? '')
  const [blockerLesson, setBlockerLesson] = useState(existing?.blockerLesson ?? '')
  const [link, setLink] = useState(existing?.link ?? '')
  const [savedFlash, setSavedFlash] = useState(false)
  const [genFlash, setGenFlash] = useState('')

  useEffect(() => {
    const e = journals.find((j) => j.date === today) ?? journals[0]
    if (!e) return
    setShipped(e.shipped)
    setNumbers(e.numbers)
    setBlockerLesson(e.blockerLesson)
    setLink(e.link)
  }, [journals, today])

  function currentEntry(): JournalEntry {
    const base = journals.find((j) => j.date === today)
    return {
      id: base?.id ?? uid('journal'),
      date: today,
      shipped: shipped.trim(),
      numbers: numbers.trim(),
      blockerLesson: blockerLesson.trim(),
      link: link.trim(),
      updatedAt: new Date().toISOString(),
      projectId: project?.id,
    }
  }

  function handleSave() {
    onSave(currentEntry())
    track('journal_saved')
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  async function handleGenerate() {
    const entry = currentEntry()
    onSave(entry)
    track('journal_saved')
    setGenFlash('Making short options…')
    const { drafts, meta } = await generateDraftsSmart(entry, setup)
    onGeneratedDrafts(drafts)
    track('drafts_generated', { source: meta.source, count: meta.count })
    const tag = meta.source === 'ai' ? 'AI' : 'template'
    setGenFlash(`Made ${meta.count} ${tag} options — pick one below.`)
    window.setTimeout(() => setGenFlash(''), 2800)
  }

  return (
    <section className="space-y-6">
      {isSetupEmpty(setup) && showSetupBanner && (
        <div className="relative overflow-hidden rounded-[28px] border-2 border-orange/45 bg-gradient-to-br from-orange/20 via-orange/10 to-cream-2 p-4 shadow-[0_10px_24px_rgba(255,106,43,0.18)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={onOpenSetup}
              className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
            >
              <span className="inline-flex items-center rounded-full bg-orange px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                Setup needed
              </span>
              <span className="text-lg font-extrabold leading-snug text-orange-deep sm:text-xl">
                Add what you’re building →
              </span>
              <span className="text-sm font-semibold text-navy/80">
                Tell ShipLoud your project, audience, and voice so drafts match you.
              </span>
            </button>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenSetup}
                className="btn-pill min-h-11 px-5 py-2.5 text-sm"
              >
                Open Setup
              </button>
              <button
                type="button"
                onClick={onDismissSetupBanner}
                className="min-h-11 rounded-full border border-line bg-card px-3 text-xs font-extrabold text-muted hover:text-navy"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {project && (
            <span className="inline-flex items-center rounded-full border border-line bg-card px-2.5 py-1 text-xs font-extrabold text-navy shadow-sm">
              {project.name}
            </span>
          )}
          {setup.projects.length > 1 && (
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
              <span className="sr-only">Switch project</span>
              <select
                value={setup.activeProjectId}
                onChange={(e) => onSetActiveProject(e.target.value)}
                className="min-h-9 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-extrabold text-navy"
              >
                {setup.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
          What did you ship today?
        </h2>
        <p className="text-sm text-muted">
          <span className="font-bold text-navy">{today}</span> · jot it down, then pick a draft below.
        </p>
      </header>

      <div className="card-soft space-y-4 p-4 sm:p-5">
        <Field label="What shipped" hint="Concrete. One or two sentences.">
          <textarea
            value={shipped}
            onChange={(e) => setShipped(e.target.value)}
            rows={3}
            className="input-soft w-full resize-y text-base leading-relaxed sm:text-sm"
            placeholder="Shipped X to URL…"
          />
        </Field>
        <Field label="Numbers" hint="Followers, MRR, waitlist — whatever is real.">
          <input
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            className="input-soft min-h-11 w-full text-base sm:text-sm"
            placeholder="~8 followers · $0 MRR"
          />
        </Field>
        <Field label="Blocker / lesson" hint="What got in the way, or what you learned.">
          <textarea
            value={blockerLesson}
            onChange={(e) => setBlockerLesson(e.target.value)}
            rows={3}
            className="input-soft w-full resize-y text-base leading-relaxed sm:text-sm"
            placeholder="X login blocked → dogfood before pitch…"
          />
        </Field>
        <Field label="Link (optional)">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="input-soft min-h-11 w-full font-mono text-base sm:text-sm"
            placeholder="https://"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            className="btn-pill min-h-11 px-6 py-2.5 text-sm"
          >
            Make drafts
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
          >
            Save
          </button>
        </div>
        {savedFlash && <p className="text-sm font-extrabold text-orange">Saved.</p>}
        {genFlash && <p className="text-sm font-extrabold text-orange">{genFlash}</p>}
      </div>

      {children}

      <WeeklyReceipts metrics={metrics} xHandle={project?.xHandle ?? ''} onSaveMetrics={onSaveMetrics} />

      {journals.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-muted">Recent</h3>
          <ul className="space-y-2">
            {journals
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((j) => (
                <li
                  key={j.id}
                  className="rounded-2xl border border-line bg-card px-3 py-2.5 text-sm shadow-sm"
                >
                  <span className="text-xs font-extrabold text-orange">{j.date}</span>
                  <p className="mt-0.5 break-words font-semibold text-navy">{j.shipped}</p>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-extrabold text-navy">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
