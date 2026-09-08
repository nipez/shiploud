import { useState } from 'react'
import { normalizeHandle, type BuilderTags } from '../types'
import {
  formatImportSummary,
  HANDLE_BARE_RE,
  planHandleImport,
  RADAR_MAX_HANDLES,
} from '../importHandles'
import BuilderSuggestions from './BuilderSuggestions'
import { ScreenHead } from './ScreenHead'

type Props = {
  favoriteBuilders: string[]
  builderTags?: BuilderTags
  onAdd: (handle: string) => void
  onAddMany?: (handles: string[]) => void
  onRemove: (handle: string) => void
  onSetTags: (handle: string, tags: string[]) => void
}

export default function Follows({
  favoriteBuilders,
  builderTags,
  onAdd,
  onAddMany,
  onRemove,
  onSetTags,
}: Props) {
  const [newHandle, setNewHandle] = useState('')
  const [addError, setAddError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState('')

  function addAnyone() {
    const raw = newHandle.trim()
    if (!raw) {
      setAddError('Enter a handle.')
      return
    }
    const h = normalizeHandle(raw)
    const bare = h.replace(/^@/, '')
    if (!h || !HANDLE_BARE_RE.test(bare)) {
      setAddError('Enter a valid @handle.')
      return
    }
    if (favoriteBuilders.map(normalizeHandle).includes(h)) {
      setAddError('Already on your feed.')
      setNewHandle('')
      return
    }
    if (favoriteBuilders.length >= RADAR_MAX_HANDLES) {
      setAddError(`Feed is full (max ${RADAR_MAX_HANDLES} handles).`)
      return
    }
    onAdd(h)
    setNewHandle('')
    setAddError('')
  }

  function runImport() {
    const plan = planHandleImport(importText, favoriteBuilders)
    const summary = formatImportSummary(plan)
    setImportMsg(summary)
    if (plan.toAdd.length === 0) return
    if (onAddMany) {
      onAddMany(plan.toAdd)
    } else {
      for (const h of plan.toAdd) onAdd(h)
    }
    setImportText('')
  }

  const slotsLeft = Math.max(0, RADAR_MAX_HANDLES - favoriteBuilders.length)

  return (
    <section>
      <ScreenHead
        eyebrow="pick your room →"
        title="Builders"
        sub="Your radar pulls public posts from these handles. The suggestions are a starter list — same for everyone, not an algorithm."
      />

      <div className="card-soft mb-[22px] rounded-3xl px-[22px] py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black tracking-[0.08em] text-muted">IN YOUR FEED</p>
          <button
            type="button"
            onClick={() => {
              setImportOpen((o) => !o)
              setImportMsg('')
            }}
            className="text-[12px] font-extrabold text-orange hover:underline"
            aria-expanded={importOpen}
          >
            {importOpen ? 'Hide import' : 'Import handles'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {favoriteBuilders.map((h, i) => {
            const display = normalizeHandle(h) || h
            return (
              <span
                key={`${display}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-cream-2 py-1.5 pl-3.5 pr-2 text-[12.5px] font-extrabold"
              >
                {display}
                <button
                  type="button"
                  aria-label={`Remove ${display} from feed`}
                  onClick={() => onRemove(display)}
                  className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-line text-[11px] font-black leading-none text-muted hover:bg-orange hover:text-white"
                >
                  ×
                </button>
              </span>
            )
          })}
          <input
            value={newHandle}
            onChange={(e) => {
              setNewHandle(e.target.value)
              if (addError) setAddError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addAnyone()
              }
            }}
            className="input-soft w-[130px] rounded-full px-4 py-2 text-[12.5px] font-bold"
            placeholder="@handle"
            autoComplete="off"
            spellCheck={false}
            aria-label="Add handle to feed"
          />
          <button
            type="button"
            onClick={addAnyone}
            className="btn-pill whitespace-nowrap px-[18px] py-[9px] text-[12.5px]"
          >
            Add
          </button>
        </div>
        {addError && <p className="mt-2 text-sm font-extrabold text-red-600">{addError}</p>}

        {importOpen && (
          <div className="mt-4 space-y-2.5 border-t border-line pt-4">
            <p className="text-xs font-semibold text-muted">
              Paste handles you already know (@a, @b or one per line). Local feed only — does not follow
              anyone on X or sync your X following list.
              {slotsLeft < RADAR_MAX_HANDLES ? ` ${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left.` : ''}
            </p>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value)
                if (importMsg) setImportMsg('')
              }}
              rows={4}
              className="input-soft w-full resize-y font-mono text-[12.5px] font-bold leading-relaxed"
              placeholder={'@marclou\n@levelsio, @tibo_maker'}
              spellCheck={false}
              aria-label="Paste handles to import"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={runImport}
                className="btn-pill whitespace-nowrap px-[18px] py-[9px] text-[12.5px]"
              >
                Add to feed
              </button>
              {importMsg && (
                <p className="text-sm font-extrabold text-navy" role="status">
                  {importMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mb-3.5 text-[11px] font-black tracking-[0.08em] text-muted">
        SUGGESTED FOLLOWS · A STARTER LIST, NOT AN ALGORITHM
      </p>
      <BuilderSuggestions
        favoriteBuilders={favoriteBuilders}
        builderTags={builderTags}
        onAdd={onAdd}
        onSetTags={onSetTags}
        variant="page"
      />
    </section>
  )
}
