import { useEffect, useMemo, useRef, useState } from 'react'
import type { Draft, JournalEntry, Setup } from '../types'
import { activeProject } from '../types'
import { generateDraftsSmart } from '../generateSmart'
import type { DraftShape } from '../generate'
import { GENERATOR_MARKER, isShortEnough, xLength, X_LIMIT } from '../generate'
import { track } from '../track'
import PostToX from './PostToX'
import type { XConnectionState } from '../useXConnection'

void GENERATOR_MARKER

type Props = {
  drafts: Draft[]
  journals: JournalEntry[]
  setup: Setup
  onUpdate: (id: string, patch: Partial<Draft>) => void
  onDelete: (id: string) => void
  onRegen: (nextDrafts: Draft[], clearPendingForProjectId?: string) => void
  xConnection: XConnectionState
  onOpenSetup: () => void
  onToast: (msg: string) => void
  weekLine: string
  onSeeReceipts: () => void
}

export default function Drafts({
  drafts,
  journals,
  setup,
  onUpdate,
  onDelete,
  onRegen,
  xConnection,
  onOpenSetup,
  onToast,
  weekLine,
  onSeeReceipts,
}: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [lengthFailBanner, setLengthFailBanner] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const autoRegenTried = useRef(false)

  const project = activeProject(setup)

  const pendingAll = useMemo(
    () =>
      drafts
        .filter((d) => d.status !== 'approved' && d.status !== 'posted')
        .filter((d) => {
          if (!project?.id) return true
          if (!d.projectId) return true
          return d.projectId === project.id
        })
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [drafts, project?.id],
  )

  const options = useMemo(
    () => pendingAll.filter((d) => isShortEnough(d.text)).slice(0, 3),
    [pendingAll],
  )

  const latestJournal = useMemo(
    () =>
      journals
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0] ??
      null,
    [journals],
  )

  async function runRegen(shape: DraftShape | 'all' = 'all'): Promise<boolean> {
    if (!latestJournal?.shipped.trim()) {
      setLengthFailBanner(false)
      setRegenerating(false)
      return false
    }
    setRegenerating(true)
    const { drafts: fresh, meta } = await generateDraftsSmart(latestJournal, setup, shape)
    onRegen(fresh, project?.id)
    const usable = fresh.filter((d) => isShortEnough(d.text))
    track('drafts_generated', { source: meta.source, count: usable.length, shape })
    setRegenerating(false)
    if (usable.length > 0) {
      setLengthFailBanner(false)
      return true
    }
    setLengthFailBanner(true)
    return false
  }

  function handleRegen() {
    autoRegenTried.current = true
    void runRegen('all')
  }

  function handleShape(shape: DraftShape) {
    autoRegenTried.current = true
    void runRegen(shape)
  }

  useEffect(() => {
    if (autoRegenTried.current) return
    if (options.length > 0) return
    if (!latestJournal?.shipped.trim()) return
    if (pendingAll.length === 0 || pendingAll.every((d) => !isShortEnough(d.text))) {
      autoRegenTried.current = true
      void runRegen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length, pendingAll, latestJournal])

  async function copyText(d: Draft) {
    try {
      await navigator.clipboard.writeText(d.text)
      setCopiedId(d.id)
      track('draft_copied')
      onToast('copied')
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      window.prompt('Copy manually:', d.text)
      track('draft_copied')
      onToast('copied')
    }
  }

  function saveForLater(d: Draft) {
    onUpdate(d.id, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    })
    track('draft_saved_for_later')
    setSavedId(d.id)
    onToast('saved')
    window.setTimeout(() => setSavedId(null), 1400)
  }

  const showMakingShort =
    regenerating || (options.length === 0 && Boolean(latestJournal?.shipped.trim()) && !lengthFailBanner)

  return (
    <>
      <header className="order-3 mb-0 min-w-0 min-[1000px]:order-2 min-[1000px]:col-start-2 min-[1000px]:self-end">
        <p className="mb-1.5 font-script text-2xl font-bold text-orange">pick a draft →</p>
        <div className="mb-1.5 flex flex-wrap items-end gap-3">
          <h2 className="text-[31px] font-black tracking-[-0.02em] text-navy">Pick a draft</h2>
          <span className="whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-2.5 py-[3px] text-[11.5px] font-extrabold text-muted">
            {options.length} options · fit one post
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={handleRegen}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M21 12a9 9 0 1 1-2.6-6.3" />
              <path d="M21 3v6h-6" />
            </svg>
            Regen short drafts
          </button>
        </div>
        <p className="text-sm font-bold text-muted">
          Shapes from the journal — not viral templates. Post from your account, or copy. Nothing posts itself.
          {!xConnection.connected && (
            <>
              {' '}
              X isn&apos;t connected —{' '}
              <button
                type="button"
                onClick={onOpenSetup}
                className="font-black text-orange underline underline-offset-2 hover:text-orange-deep"
              >
                connect in Setup
              </button>{' '}
              to Post to X.
            </>
          )}
        </p>
      </header>

      <div id="drafts" className="order-4 flex min-w-0 flex-col gap-3 min-[1000px]:col-start-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Draft shape from journal">
        <span className="mr-1 text-[11px] font-extrabold uppercase tracking-wide text-muted">Write it as</span>
        {(
          [
            ['receipt', 'Receipt'],
            ['lesson', 'Lesson'],
            ['straight', 'Straight'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => handleShape(id)}
            disabled={regenerating || !latestJournal?.shipped.trim()}
            className="inline-flex min-h-8 items-center rounded-full border-[1.5px] border-line bg-cream-2 px-3 text-[12px] font-extrabold text-navy hover:border-navy disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
      {lengthFailBanner && (
        <div role="alert" className="rounded-2xl border-2 border-red-400 bg-red-50 px-3 py-3 text-sm font-extrabold text-red-700">
          Regen failed length check — try again.
          <button type="button" onClick={handleRegen} className="ml-2 underline decoration-2 underline-offset-2">
            Regen short drafts
          </button>
        </div>
      )}

      {showMakingShort && options.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-line bg-cream-2 px-5 py-10 text-center">
          <p className="text-base font-extrabold text-navy">Making short options…</p>
          <p className="mt-1.5 text-[13px] font-bold text-muted">Turning your journal into posts that fit one X tweet.</p>
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-line bg-cream-2 px-5 py-10 text-center">
          <p className="text-base font-extrabold text-navy">No short options yet.</p>
          <p className="mt-1.5 text-[13px] font-bold text-muted">
            {latestJournal ? 'Hit Regen for short options.' : 'Jot what you shipped, then make drafts.'}
          </p>
        </div>
      ) : (
        options.map((d, i) => {
          const len = xLength(d.text)
          const posted = d.status === 'posted'
          const sourceTag = d.source === 'ai' ? 'AI DRAFT' : d.source === 'journal-template' || d.source === 'seed' ? 'TEMPLATE' : 'TEMPLATE'
          return (
            <article
              key={d.id}
              className={`rounded-[22px] border-[1.5px] bg-card px-[18px] py-4 shadow-[0_8px_24px_rgba(43,27,77,.06)] ${
                posted ? 'border-sticker-mint' : savedId === d.id ? 'border-sticker-lilac' : 'border-line'
              }`}
            >
              <div className="mb-[9px] flex items-center gap-2">
                <span className="whitespace-nowrap rounded-full bg-orange/12 px-2.5 py-0.5 text-[10.5px] font-black tracking-[0.05em] text-orange-deep">
                  OPTION {i + 1}
                </span>
                <span className="text-[10.5px] font-black tracking-[0.05em] text-muted">{sourceTag}</span>
                {d.label && (
                  <span className="whitespace-nowrap rounded-full bg-sticker-lilac px-2.5 py-0.5 text-[10.5px] font-black tracking-[0.05em] text-navy">
                    {d.label.toUpperCase()}
                  </span>
                )}
                <span className="flex-1" />
                <span className="text-[11.5px] font-extrabold text-muted">
                  {len}/{X_LIMIT}
                </span>
              </div>
              <p className="mb-[13px] whitespace-pre-line text-sm font-bold leading-[1.55] text-navy">{d.text}</p>
              {posted ? (
                <div className="inline-flex items-center rounded-full border-[1.5px] border-sticker-mint bg-sticker-mint/25 px-4 py-[7px] text-[12.5px] font-black">
                  ✓ Posted to X · counted in receipts
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {xConnection.connected && (
                    <PostToX
                      text={d.text}
                      connected={xConnection.connected}
                      configured={xConnection.configured}
                      handle={xConnection.handle}
                      compact
                      onConnect={() => void xConnection.connect()}
                      onPosted={() => {
                        onUpdate(d.id, {
                          status: 'posted',
                          updatedAt: new Date().toISOString(),
                        })
                        track('draft_marked_posted')
                        onToast('posted')
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => void copyText(d)}
                    className={`inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy ${
                      copiedId === d.id ? 'border-sticker-mint bg-sticker-mint/25' : 'border-line bg-cream-2'
                    }`}
                  >
                    {copiedId === d.id ? '✓ Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveForLater(d)}
                    className={`inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy ${
                      savedId === d.id ? 'border-sticker-lilac bg-sticker-lilac/25' : 'border-line bg-cream-2'
                    }`}
                  >
                    {savedId === d.id ? '✓ Saved' : 'Save for later'}
                  </button>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => onDelete(d.id)}
                    className="whitespace-nowrap px-2 py-1.5 text-[12.5px] font-extrabold text-muted hover:text-orange-deep"
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          )
        })
      )}

      <div className="flex flex-wrap items-center gap-2.5 rounded-[18px] border border-line bg-cream-2 px-[18px] py-3">
        <span className="text-[12.5px] font-extrabold text-muted">This week: {weekLine}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onSeeReceipts}
          className="whitespace-nowrap text-[12.5px] font-black text-orange hover:text-orange-deep"
        >
          See receipts →
        </button>
      </div>
      </div>
    </>
  )
}
