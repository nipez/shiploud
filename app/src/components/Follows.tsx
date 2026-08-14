import { useEffect, useRef, useState } from 'react'
import { normalizeHandle, tagsForHandle, usedBuilderTags, type BuilderTags } from '../types'
import BuilderSuggestions from './BuilderSuggestions'
import BuilderTagPicker from './BuilderTagPicker'

type Props = {
  favoriteBuilders: string[]
  builderTags?: BuilderTags
  onAdd: (handle: string) => void
  onRemove: (handle: string) => void
  onSetTags: (handle: string, tags: string[]) => void
}

const HANDLE_RE = /^[a-zA-Z0-9_]{1,15}$/

export default function Follows({ favoriteBuilders, builderTags, onAdd, onRemove, onSetTags }: Props) {
  const extraTags = usedBuilderTags(builderTags, favoriteBuilders)
  const [newHandle, setNewHandle] = useState('')
  const [addError, setAddError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!toolbarRef.current?.contains(e.target as Node)) setSelected(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    if (!selected) return
    const stillThere = favoriteBuilders.some((h) => normalizeHandle(h) === selected)
    if (!stillThere) setSelected(null)
  }, [favoriteBuilders, selected])

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
    <section className="space-y-4">
      <header className="space-y-0.5">
        <h2 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
          Suggested follows
        </h2>
        <p className="text-sm text-muted">
          Add people to your ShipLoud feed (not your X timeline).
        </p>
      </header>

      <div ref={toolbarRef} className="space-y-2">
        <div className="flex items-center gap-2">
          {favoriteBuilders.length > 0 && (
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
              {favoriteBuilders.map((h, i) => {
                const display = normalizeHandle(h) || h
                const on = selected === display
                return (
                  <div
                    key={`${display}-${i}`}
                    className={
                      on
                        ? 'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange pl-2.5 pr-1 py-0.5 font-mono text-xs font-extrabold text-white'
                        : 'inline-flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-card pl-2.5 pr-1 py-0.5 font-mono text-xs font-extrabold text-navy'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelected((prev) => (prev === display ? null : display))}
                      aria-pressed={on}
                      className="max-w-[10rem] truncate py-0.5"
                    >
                      {display}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${display} from feed`}
                      onClick={() => onRemove(display)}
                      className={
                        on
                          ? 'inline-flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-white/80 hover:bg-white/20 hover:text-white'
                          : 'inline-flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-muted hover:bg-red-50 hover:text-red-600'
                      }
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
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
              className="input-soft min-h-8 w-28 px-2.5 py-1 font-mono text-xs sm:w-32"
              placeholder="@handle"
              autoComplete="off"
              spellCheck={false}
              aria-label="Add handle to feed"
            />
            <button
              type="button"
              onClick={addAnyone}
              className="inline-flex min-h-8 items-center rounded-full border border-line bg-card px-3 text-xs font-extrabold text-navy hover:border-orange/40"
            >
              Add
            </button>
          </div>
        </div>
        {addError && <p className="text-sm font-extrabold text-red-600">{addError}</p>}
        {selected && (
          <BuilderTagPicker
            selected={tagsForHandle(builderTags, selected)}
            extraTags={extraTags}
            onChange={(tags) => onSetTags(selected, tags)}
          />
        )}
      </div>

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
