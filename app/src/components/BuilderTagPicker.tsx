import { useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  SUGGESTED_BUILDER_TAGS,
  canonicalizeTag,
  normalizeTag,
} from '../types'

type Props = {
  selected: string[]
  extraTags?: string[]
  onChange: (tags: string[]) => void
}

function tagKey(t: string): string {
  return normalizeTag(t).toLowerCase()
}

export default function BuilderTagPicker({ selected, extraTags = [], onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const selectedKeys = new Set(selected.map(tagKey).filter(Boolean))
  const chips: string[] = []
  const seen = new Set<string>()
  for (const t of [...SUGGESTED_BUILDER_TAGS, ...extraTags, ...selected]) {
    const n = canonicalizeTag(t, chips)
    const k = tagKey(n)
    if (!k || seen.has(k)) continue
    seen.add(k)
    chips.push(n)
  }

  function toggle(tag: string) {
    const k = tagKey(tag)
    if (!k) return
    if (selectedKeys.has(k)) {
      onChange(selected.filter((t) => tagKey(t) !== k))
      return
    }
    onChange([...selected, canonicalizeTag(tag, chips)])
  }

  function commitNew(raw: string) {
    const t = canonicalizeTag(raw, chips)
    setDraft('')
    setAdding(false)
    if (!t) return
    if (selectedKeys.has(tagKey(t))) return
    onChange([...selected, t])
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    commitNew(draft)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setDraft('')
      setAdding(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Tags</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((tag) => {
          const on = selectedKeys.has(tagKey(tag))
          return (
            <button
              key={tagKey(tag)}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={on}
              className={
                on
                  ? 'inline-flex min-h-8 items-center rounded-full bg-orange px-2.5 text-[11px] font-extrabold text-white'
                  : 'inline-flex min-h-8 items-center rounded-full border border-line bg-card px-2.5 text-[11px] font-extrabold text-navy hover:border-orange/40'
              }
            >
              {tag}
            </button>
          )
        })}
        {adding ? (
          <form onSubmit={onSubmit} className="inline-flex items-center gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              onBlur={() => {
                if (!draft.trim()) setAdding(false)
              }}
              autoFocus
              maxLength={32}
              placeholder="New tag"
              className="input-soft min-h-8 w-28 px-2 py-1 text-[11px] font-extrabold"
              aria-label="New tag"
            />
            <button
              type="submit"
              className="inline-flex min-h-8 items-center rounded-full border border-line bg-card px-2.5 text-[11px] font-extrabold text-navy hover:border-orange/40"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-8 items-center rounded-full border border-dashed border-line bg-card px-2.5 text-[11px] font-extrabold text-muted hover:border-orange/40 hover:text-navy"
          >
            New tag
          </button>
        )}
      </div>
    </div>
  )
}
