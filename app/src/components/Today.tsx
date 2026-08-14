import { useEffect, useState, type ReactNode } from 'react'
import type { Draft, JournalEntry, Setup } from '../types'
import { activeProject } from '../types'
import { todayISO, uid } from '../storage'
import { generateDraftsSmart } from '../generateSmart'
import { track } from '../track'
import { ScreenHead } from './ScreenHead'

type Props = {
  journals: JournalEntry[]
  setup: Setup
  onSave: (entry: JournalEntry) => void
  onGeneratedDrafts: (drafts: Draft[]) => void
  onSetActiveProject: (projectId: string) => void
  onToast: (msg: string) => void
  children?: ReactNode
}

export default function Today({
  journals,
  setup,
  onSave,
  onGeneratedDrafts,
  onSetActiveProject,
  onToast,
  children,
}: Props) {
  const today = todayISO()
  const existing = journals.find((j) => j.date === today) ?? journals[0]
  const project = activeProject(setup)

  const [shipped, setShipped] = useState(existing?.shipped ?? '')
  const [numbers, setNumbers] = useState(existing?.numbers ?? '')
  const [blockerLesson, setBlockerLesson] = useState(existing?.blockerLesson ?? '')
  const [link, setLink] = useState(existing?.link ?? '')

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
    if (project?.id) onSetActiveProject(project.id)
    track('journal_saved')
    onToast("Saved. Make drafts when you're ready.")
  }

  async function handleGenerate() {
    const entry = currentEntry()
    onSave(entry)
    if (project?.id) onSetActiveProject(project.id)
    track('journal_saved')
    const { drafts, meta } = await generateDraftsSmart(entry, setup)
    onGeneratedDrafts(drafts)
    track('drafts_generated', { source: meta.source, count: meta.count })
  }

  return (
    <section>
      <ScreenHead
        eyebrow="today's loop →"
        title="What did you ship today?"
        sub="Jot it down, pick a draft, tap Post. Two minutes, then back to building."
      />

      <div className="flex flex-col items-start gap-[22px] min-[1000px]:flex-row min-[1000px]:flex-wrap">
        <form
          className="card-soft flex w-full flex-col gap-3.5 rounded-3xl p-[22px] min-[1000px]:max-w-[420px] min-[1000px]:flex-[1_1_340px]"
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <Field label="What shipped" hint="Concrete. One or two sentences.">
            <textarea
              value={shipped}
              onChange={(e) => setShipped(e.target.value)}
              rows={2}
              className="input-soft w-full resize-y text-[13.5px] font-bold leading-normal"
              placeholder="Shipped X to URL…"
            />
          </Field>
          <Field label="Numbers" hint="Only real ones. $0 is allowed.">
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={2}
              className="input-soft w-full resize-y text-[13.5px] font-bold leading-normal"
              placeholder="~9 followers · $0 MRR"
            />
          </Field>
          <Field label="Blocker / lesson" hint="What got in the way.">
            <textarea
              value={blockerLesson}
              onChange={(e) => setBlockerLesson(e.target.value)}
              rows={2}
              className="input-soft w-full resize-y text-[13.5px] font-bold leading-normal"
              placeholder="X login blocked → dogfood before pitch…"
            />
          </Field>
          <Field label="Link" hint="Optional">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="input-soft min-h-11 w-full font-mono text-[13.5px] font-bold"
              placeholder="https://"
            />
          </Field>

          <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="btn-pill whitespace-nowrap px-[22px] py-3 text-sm"
            >
              Make drafts
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-5 py-3 text-sm font-extrabold text-navy hover:border-navy"
            >
              Save
            </button>
          </div>
          <p className="text-[11.5px] font-bold text-muted">Empty journal = empty drafts. That's the deal.</p>
        </form>

        <div className="w-full min-w-0 min-[1000px]:flex-[1_1_420px]">{children}</div>
      </div>
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
    <label className="flex flex-col gap-[5px]">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-black text-navy">{label}</span>
        {hint && <span className="text-[11px] font-bold text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
