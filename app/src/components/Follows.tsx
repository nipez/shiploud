import { useState } from 'react'
import { normalizeHandle, type BuilderTags } from '../types'
import BuilderSuggestions from './BuilderSuggestions'
import { ScreenHead } from './ScreenHead'

type Props = {
  favoriteBuilders: string[]
  builderTags?: BuilderTags
  onAdd: (handle: string) => void
  onRemove: (handle: string) => void
  onSetTags: (handle: string, tags: string[]) => void
}

const HANDLE_RE = /^[a-zA-Z0-9_]{1,15}$/

export default function Follows({ favoriteBuilders, builderTags, onAdd, onRemove, onSetTags }: Props) {
  const [newHandle, setNewHandle] = useState('')
  const [addError, setAddError] = useState('')

  function addAnyone() {
    const raw = newHandle.trim()
    if (!raw) {
      setAddError('Enter a handle.')
      return
    }
    const h = normalizeHandle(raw)
    const bare = h.replace(/^@/, '')
    if (!h || !HANDLE_RE.test(bare)) {
      setAddError('Enter a valid @handle.')
      return
    }
    if (favoriteBuilders.map(normalizeHandle).includes(h)) {
      setAddError('Already on your feed.')
      setNewHandle('')
      return
    }
    onAdd(h)
    setNewHandle('')
    setAddError('')
  }

  return (
    <section>
      <ScreenHead
        eyebrow="pick your room →"
        title="Builders"
        sub="Your radar pulls public posts from these handles. The suggestions are a starter list — same for everyone, not an algorithm."
      />

      <div className="card-soft mb-[22px] rounded-3xl px-[22px] py-5">
        <p className="mb-3 text-[11px] font-black tracking-[0.08em] text-muted">IN YOUR FEED</p>
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
