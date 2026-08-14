import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Draft, JournalEntry, Setup } from '../types'
import { activeProject } from '../types'
import { generateDraftsSmart } from '../generateSmart'
import { GENERATOR_MARKER, isShortEnough, xLength, X_LIMIT } from '../generate'
import { track } from '../track'
import PostToX from './PostToX'
import type { XConnectionState } from '../useXConnection'

// Keep short-only marker in the shipped bundle for deploy greps.
void GENERATOR_MARKER

type Props = {
  drafts: Draft[]
  journals: JournalEntry[]
  setup: Setup
  onUpdate: (id: string, patch: Partial<Draft>) => void
  onDelete: (id: string) => void
  onRegen: (nextDrafts: Draft[], clearPendingForProjectId?: string) => void
  xConnection: XConnectionState
}

const PREVIEW_CHARS = 220

export default function Drafts({
  drafts,
  journals,
  setup,
  onUpdate,
  onDelete,
  onRegen,
  xConnection,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [flash, setFlash] = useState('')
  const [lengthFailBanner, setLengthFailBanner] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [lastSource, setLastSource] = useState<'ai' | 'template' | null>(null)
  const autoRegenTried = useRef(false)

  const project = activeProject(setup)

  /** Pending for active project (and untagged). Never treat overlong as options. */
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

  /** ONLY usable one-post drafts — product rule: never show essays as options. */
  const options = useMemo(
    () => pendingAll.filter((d) => isShortEnough(d.text)),
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

  async function runRegen(): Promise<boolean> {
    if (!latestJournal) {
      setFlash('Add a journal entry on Journal first.')
      setLengthFailBanner(false)
      setRegenerating(false)
      window.setTimeout(() => setFlash(''), 2400)
      return false
    }
    setRegenerating(true)
    const { drafts: fresh, meta } = await generateDraftsSmart(latestJournal, setup)
    // Hard-replace pending for this project — never append onto old essays.
    onRegen(fresh, project?.id)
    const usable = fresh.filter((d) => isShortEnough(d.text))
    setLastSource(meta.source)
    track('drafts_generated', { source: meta.source, count: usable.length })
    setRegenerating(false)
    if (usable.length > 0) {
      setLengthFailBanner(false)
      const tag = meta.source === 'ai' ? 'AI' : 'template'
      setFlash(`Got ${usable.length} ${tag} options — pick your favorite. Copy and paste into X.`)
      window.setTimeout(() => setFlash(''), 3200)
      return true
    }
    setLengthFailBanner(true)
    setFlash('')
    return false
  }

  function handleRegen() {
    autoRegenTried.current = true
    void runRegen()
  }

  // If every pending draft is overlong (or pending empty after strip) and we have a journal,
  // auto-regen once — never leave the user staring at essay cards.
  useEffect(() => {
    if (autoRegenTried.current) return
    if (options.length > 0) return
    if (!latestJournal) return
    // Pending overlong still in blob, or strip left us empty — make short options.
    if (pendingAll.length === 0 || pendingAll.every((d) => !isShortEnough(d.text))) {
      autoRegenTried.current = true
      void runRegen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally once when empty/overlong
  }, [options.length, pendingAll, latestJournal])

  function startEdit(d: Draft) {
    setEditingId(d.id)
    setEditText(d.text)
  }

  function saveEdit(id: string) {
    onUpdate(id, { text: editText, updatedAt: new Date().toISOString() })
    setEditingId(null)
  }

  async function copyText(d: Draft) {
    try {
      await navigator.clipboard.writeText(d.text)
      setCopiedId(d.id)
      track('draft_copied')
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      window.prompt('Copy manually:', d.text)
      track('draft_copied')
    }
  }

  const totalOptions = options.length
  const optionIndex = (id: string) => {
    const i = options.findIndex((d) => d.id === id)
    return i >= 0 ? i + 1 : 0
  }

  const showMakingShort = regenerating || (options.length === 0 && Boolean(latestJournal) && !lengthFailBanner)

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
          {showMakingShort
            ? 'Making short options…'
            : totalOptions > 0
              ? `Here are ${totalOptions} options — pick your favorite`
              : 'Here are your options — pick your favorite'}
        </h2>
        <p className="text-sm font-semibold text-muted">
          {xConnection.connected
            ? 'Post from your account, or copy. Only drafts that fit one X post.'
            : 'Copy and paste into X (or wherever you post). Only drafts that fit one X post.'}
        </p>
        <p className="rounded-2xl border border-orange/25 bg-orange/10 px-3 py-2 text-sm font-semibold text-navy">
          {xConnection.connected
            ? 'Post to X ships from your account. Radar still uses public posts.'
            : 'Big orange Copy is the move. Connect X to post from here. Radar still uses public posts.'}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRegen}
          className="btn-pill min-h-11 px-5 py-2.5 text-sm"
        >
          Regen short drafts
        </button>
        {lastSource && (
          <span className="rounded-full border border-line bg-cream-2 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-muted">
            {lastSource === 'ai' ? 'AI' : 'Template'}
          </span>
        )}
      </div>

      {lengthFailBanner && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-400 bg-red-50 px-3 py-3 text-sm font-extrabold text-red-700"
        >
          Regen failed length check — try again.
          <button
            type="button"
            onClick={handleRegen}
            className="ml-2 underline decoration-2 underline-offset-2"
          >
            Regen short drafts
          </button>
        </div>
      )}

      {flash && <p className="text-sm font-extrabold text-orange">{flash}</p>}

      {showMakingShort && options.length === 0 ? (
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed border-orange/35 bg-orange/5 px-4 py-12 text-center">
          <p className="text-lg font-extrabold text-navy sm:text-xl">Making short options…</p>
          <p className="max-w-sm text-sm font-semibold text-muted">
            Turning your journal into posts that fit one X tweet. Hang tight — or hit regen.
          </p>
          <button
            type="button"
            onClick={handleRegen}
            className="btn-pill mt-1 min-h-12 px-8 py-3 text-base"
          >
            Regen short drafts
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {options.map((d) => {
            const len = xLength(d.text)
            const isEditing = editingId === d.id
            const showFull = expanded[d.id] || isEditing
            const needsTruncate = !isEditing && d.text.length > PREVIEW_CHARS
            const display =
              showFull || !needsTruncate ? d.text : `${d.text.slice(0, PREVIEW_CHARS).trimEnd()}…`
            const n = optionIndex(d.id)
            const editLen = xLength(editText)

            return (
              <li
                key={d.id}
                className="overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_6px_18px_rgba(43,27,77,0.06)]"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream-2/80 px-3 py-2 sm:px-4">
                  {totalOptions > 0 && n > 0 && (
                    <span className="rounded-full border border-orange/30 bg-orange/10 px-2 py-0.5 text-[11px] font-black tracking-wide text-orange-deep">
                      Option {n} of {totalOptions}
                    </span>
                  )}
                  {d.projectName && (
                    <span className="text-[11px] font-extrabold tracking-wide text-muted uppercase">
                      {d.projectName}
                    </span>
                  )}
                  {d.label && (
                    <span className="rounded-full border border-line bg-card px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-navy">
                      {d.label}
                    </span>
                  )}
                  {d.source === 'ai' && (
                    <span className="rounded-full border border-orange/25 bg-orange/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-deep">
                      AI
                    </span>
                  )}
                  <span
                    className={`ml-auto tabular-nums text-xs font-black ${
                      len > 240 ? 'text-amber-600' : 'text-muted'
                    }`}
                    title="X-weighted characters (links ~23)"
                  >
                    {len}/{X_LIMIT}
                  </span>
                </div>

                <div className="px-3 py-3 sm:px-4 sm:py-3.5">
                  {isEditing ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={6}
                      className="input-soft min-h-[8rem] w-full resize-y text-[15px] font-semibold leading-snug sm:text-sm"
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="max-w-prose break-words text-[15px] font-semibold leading-snug whitespace-pre-wrap text-navy sm:text-sm">
                        {display}
                      </div>
                      {needsTruncate && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [d.id]: !prev[d.id] }))
                          }
                          className="text-xs font-extrabold text-orange hover:underline"
                        >
                          {showFull ? 'Show less' : 'Expand'}
                        </button>
                      )}
                    </div>
                  )}
                  {isEditing && (
                    <p
                      className={`mt-2 text-xs font-black tabular-nums ${
                        editLen > X_LIMIT ? 'text-red-600' : 'text-muted'
                      }`}
                    >
                      {editLen}/{X_LIMIT}
                      {editLen > X_LIMIT ? ' · too long for one X post' : ''}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3 sm:px-4">
                  {isEditing ? (
                    <>
                      <Btn onClick={() => saveEdit(d.id)} primary>
                        Save
                      </Btn>
                      <Btn onClick={() => setEditingId(null)}>Cancel</Btn>
                    </>
                  ) : (
                    <>
                      <PostToX
                        text={d.text}
                        connected={xConnection.connected}
                        configured={xConnection.configured}
                        handle={xConnection.handle}
                        onConnect={() => void xConnection.connect()}
                        onPosted={() => {
                          onUpdate(d.id, {
                            status: 'posted',
                            updatedAt: new Date().toISOString(),
                          })
                          track('draft_marked_posted')
                        }}
                      />
                      <Btn primary={!xConnection.connected} onClick={() => void copyText(d)}>
                        {copiedId === d.id ? 'Copied ✓' : 'Copy'}
                      </Btn>
                      <Btn
                        onClick={() => {
                          onUpdate(d.id, {
                            status: 'approved',
                            updatedAt: new Date().toISOString(),
                          })
                          track('draft_saved_for_later')
                        }}
                      >
                        Save for later
                      </Btn>
                      <Btn onClick={() => startEdit(d)}>Edit</Btn>
                      <Btn danger onClick={() => onDelete(d.id)}>
                        Delete
                      </Btn>
                    </>
                  )}
                </div>
              </li>
            )
          })}
          {options.length === 0 && (
            <li className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-10 text-center">
              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                <p className="text-base font-extrabold text-navy">No short options yet.</p>
                <p className="text-sm font-semibold text-muted">
                  {latestJournal
                    ? 'Hit Regen for short options — then pick your favorite and copy it.'
                    : 'Make some from Journal — then pick your favorite and copy it into X.'}
                </p>
                <button
                  type="button"
                  onClick={handleRegen}
                  className="btn-pill mt-1 min-h-12 px-8 py-3 text-base"
                >
                  Regen short drafts
                </button>
              </div>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

function Btn({
  children,
  onClick,
  primary,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  primary?: boolean
  danger?: boolean
}) {
  const cls = primary
    ? 'btn-pill'
    : danger
      ? 'rounded-full border border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
      : 'rounded-full border border-line bg-card text-navy hover:border-orange/40'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-extrabold transition ${
        primary
          ? `min-h-12 px-6 py-3 text-base ${cls}`
          : `min-h-11 px-4 py-2.5 text-sm ${cls}`
      }`}
    >
      {children}
    </button>
  )
}
