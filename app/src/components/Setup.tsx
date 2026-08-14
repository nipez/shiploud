import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Project, Setup as SetupType } from '../types'
import {
  dropHandleTags,
  normalizeBuilderTags,
  normalizeHandle,
  setHandleTags,
  tagsForHandle,
  usedBuilderTags,
} from '../types'
import { newEmptyProject } from '../storage'
import { refreshXStats } from '../api'
import { track } from '../track'
import BuilderSuggestions from './BuilderSuggestions'
import BuilderTagPicker from './BuilderTagPicker'
import XConnectCard from './XConnectCard'
import type { XConnectionState } from '../useXConnection'

type Props = {
  setup: SetupType
  onSave: (setup: SetupType) => void
  onBack: () => void
  xConnection: XConnectionState
}

export default function Setup({ setup, onSave, onBack, xConnection }: Props) {
  const [projects, setProjects] = useState<Project[]>(setup.projects)
  const [activeProjectId, setActiveProjectId] = useState(setup.activeProjectId)
  const [newFav, setNewFav] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState('')

  useEffect(() => {
    setProjects(setup.projects)
    setActiveProjectId(setup.activeProjectId)
  }, [setup])

  const active = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId],
  )

  function patchActive(patch: Partial<Project>) {
    if (!active) return
    setProjects((prev) => prev.map((p) => (p.id === active.id ? { ...p, ...patch } : p)))
  }

  function selectProject(id: string) {
    setActiveProjectId(id)
  }

  function handleSave() {
    const cleaned = projects
      .map((p) => ({
        ...p,
        name: p.name.trim() || 'Untitled',
        building: p.building.trim(),
        who: p.who.trim(),
        goal: p.goal.trim(),
        voice: p.voice.trim(),
        favoriteBuilders: p.favoriteBuilders.map(normalizeHandle).filter(Boolean),
        builderTags: normalizeBuilderTags(
          p.builderTags,
          p.favoriteBuilders.map(normalizeHandle).filter(Boolean),
        ),
        url: (p.url ?? '').trim(),
        xHandle: normalizeHandle(p.xHandle ?? ''),
      }))
      .filter((p) => p.name)

    const list = cleaned.length > 0 ? cleaned : [newEmptyProject('ShipLoud')]
    let activeId = activeProjectId
    if (!list.some((p) => p.id === activeId)) activeId = list[0].id

    onSave({
      activeProjectId: activeId,
      projects: list,
      updatedAt: new Date().toISOString(),
    })
    track('setup_saved')
    setProjects(list)
    setActiveProjectId(activeId)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  function addProject() {
    const p = newEmptyProject('')
    setProjects((prev) => [...prev, p])
    setActiveProjectId(p.id)
  }

  function removeProject(id: string) {
    if (projects.length <= 1) return
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (activeProjectId === id && next[0]) setActiveProjectId(next[0].id)
      return next
    })
  }

  function addFavorite(raw?: string) {
    if (!active) return
    const fromInput = raw === undefined
    const h = normalizeHandle(fromInput ? newFav : raw)
    if (!h) return
    if (active.favoriteBuilders.map(normalizeHandle).includes(h)) {
      if (fromInput) setNewFav('')
      return
    }
    patchActive({
      favoriteBuilders: [...active.favoriteBuilders.map(normalizeHandle).filter(Boolean), h],
    })
    if (fromInput) setNewFav('')
  }

  function removeFavorite(handle: string) {
    if (!active) return
    const n = normalizeHandle(handle)
    patchActive({
      favoriteBuilders: active.favoriteBuilders.filter((h) => normalizeHandle(h) !== n),
      builderTags: dropHandleTags(active.builderTags, n),
    })
  }

  function setFavoriteTags(handle: string, tags: string[]) {
    if (!active) return
    patchActive({
      builderTags: setHandleTags(
        active.builderTags,
        handle,
        tags,
        usedBuilderTags(active.builderTags, active.favoriteBuilders),
      ),
    })
  }

  const projectLabel = active?.name.trim() || 'This project'

  async function checkXNow() {
    if (!active) return
    const handle = normalizeHandle(active.xHandle || '')
    if (!handle) {
      setCheckMsg('Add an X handle first.')
      return
    }
    setChecking(true)
    setCheckMsg('')
    try {
      const res = await refreshXStats(handle)
      if (res.ok && res.latest) {
        track('x_followers_refreshed', {
          handle: res.handle,
          followers: res.latest.followers,
          source: res.source || res.latest.source,
        })
        setCheckMsg(
          `${res.latest.followers.toLocaleString()} followers · via ${res.source || res.latest.source}`,
        )
      } else {
        setCheckMsg(res.message || res.error || 'Fetch failed — try again later.')
      }
    } catch (e) {
      setCheckMsg(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setChecking(false)
    }
  }


  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-extrabold text-muted hover:border-orange/40 hover:text-navy"
        >
          ← Back
        </button>
        <h2 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
          Your setup
        </h2>
        <p className="text-sm text-muted">
          Each project has its own building, URL, audience, goal, voice, and favorite builders.
        </p>
      </header>

      <XConnectCard x={xConnection} />

      <div className="card-soft space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-extrabold text-navy">Projects</h3>
          <span className="text-xs text-muted">Tap one to edit · active tags Journal</span>
        </div>
        <ul className="space-y-2">
          {projects.map((p) => {
            const selected = active?.id === p.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectProject(p.id)}
                  className={`flex w-full flex-wrap items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? 'border-orange/50 bg-orange/10 shadow-sm'
                      : 'border-line bg-cream-2/80 hover:border-orange/35'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? 'border-orange bg-orange text-[10px] text-white'
                        : 'border-line bg-card'
                    }`}
                    aria-hidden
                  >
                    {selected ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-navy">
                    {p.name.trim() || 'Untitled'}
                  </span>
                  {selected && (
                    <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                      Active
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addProject}
            className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy hover:border-orange/40"
          >
            + Add project
          </button>
          {active && (
            <button
              type="button"
              onClick={() => removeProject(active.id)}
              className="min-h-11 rounded-full px-3 text-xs font-extrabold text-muted hover:text-red-600 disabled:opacity-40"
              disabled={projects.length <= 1}
            >
              Remove project
            </button>
          )}
        </div>
      </div>

      {active && (
        <div className="card-soft space-y-4 p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-wide text-orange">
              Editing · {projectLabel}
            </p>
            <p className="text-sm text-muted">
              These fields belong only to this project — switch projects above to edit another.
            </p>
          </div>

          <Field label={`${projectLabel} — name`}>
            <input
              value={active.name}
              onChange={(e) => patchActive({ name: e.target.value })}
              className="input-soft min-h-11 w-full text-base sm:text-sm"
              placeholder="ShipLoud"
            />
          </Field>
          <Field label={`${projectLabel} — what you're building`} hint="1–3 sentences.">
            <textarea
              value={active.building}
              onChange={(e) => patchActive({ building: e.target.value })}
              rows={3}
              className="input-soft w-full resize-y text-base leading-relaxed sm:text-sm"
              placeholder="grow X by turning ship notes into posts…"
            />
          </Field>
          <Field label="URL" hint="Product or landing link">
            <input
              value={active.url ?? ''}
              onChange={(e) => patchActive({ url: e.target.value })}
              className="input-soft min-h-11 w-full font-mono text-base sm:text-sm"
              placeholder="https://www.getshiploud.com"
              inputMode="url"
              autoComplete="url"
            />
          </Field>
          <Field
            label="X handle"
            hint="Public profile · follower tracking"
          >
            <div className="flex flex-wrap gap-2">
              <input
                value={active.xHandle ?? ''}
                onChange={(e) => patchActive({ xHandle: e.target.value })}
                className="input-soft min-h-11 min-w-[10rem] flex-1 font-mono text-base sm:text-sm"
                placeholder="@dreamandbuildit"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => void checkXNow()}
                disabled={checking}
                className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy hover:border-orange/40 disabled:opacity-50"
              >
                {checking ? 'Checking…' : 'Check now'}
              </button>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted">
              From your public X profile. Not impressions/engagement.
            </p>
            {checkMsg && (
              <p className="mt-1 text-sm font-extrabold text-orange">{checkMsg}</p>
            )}
          </Field>
          <Field label={`${projectLabel} — who it's for`}>
            <input
              value={active.who}
              onChange={(e) => patchActive({ who: e.target.value })}
              className="input-soft min-h-11 w-full text-base sm:text-sm"
              placeholder="indie builders on X"
            />
          </Field>
          <Field label={`${projectLabel} — goal`}>
            <input
              value={active.goal}
              onChange={(e) => patchActive({ goal: e.target.value })}
              className="input-soft min-h-11 w-full text-base sm:text-sm"
              placeholder="$10K MRR and beyond"
            />
          </Field>
          <Field label={`${projectLabel} — voice`}>
            <input
              value={active.voice}
              onChange={(e) => patchActive({ voice: e.target.value })}
              className="input-soft min-h-11 w-full text-base sm:text-sm"
              placeholder="short lines, numbers, no guru speak"
            />
          </Field>

          <div className="space-y-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-extrabold text-navy">
                {projectLabel} — favorite builders
              </h3>
              <span className="text-xs text-muted">X handles · reply radar</span>
            </div>
            <ul className="space-y-2">
              {active.favoriteBuilders.length === 0 && (
                <li className="text-xs font-semibold text-muted">None yet — add handles below.</li>
              )}
              {active.favoriteBuilders.map((h, i) => {
                const display = normalizeHandle(h) || h
                return (
                  <li
                    key={`${display}-${i}`}
                    className="rounded-2xl border border-line bg-cream-2 px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-extrabold text-navy">{display}</span>
                      <button
                        type="button"
                        onClick={() => removeFavorite(display)}
                        className="text-muted hover:text-red-600"
                        aria-label={`Remove ${display}`}
                      >
                        ×
                      </button>
                    </div>
                    <BuilderTagPicker
                      selected={tagsForHandle(active.builderTags, display)}
                      extraTags={usedBuilderTags(active.builderTags, active.favoriteBuilders)}
                      onChange={(tags) => setFavoriteTags(display, tags)}
                    />
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <input
                value={newFav}
                onChange={(e) => setNewFav(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addFavorite()
                  }
                }}
                className="input-soft min-h-11 min-w-[10rem] flex-1 font-mono text-sm"
                placeholder="@marclou"
              />
              <button
                type="button"
                onClick={() => addFavorite()}
                className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy hover:border-orange/40"
              >
                Add
              </button>
            </div>
            <BuilderSuggestions
              favoriteBuilders={active.favoriteBuilders}
              builderTags={active.builderTags}
              onAdd={(handle) => addFavorite(handle)}
              onSetTags={setFavoriteTags}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} className="btn-pill min-h-11 px-6 py-2.5 text-sm">
          Save setup
        </button>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
        >
          Done
        </button>
        {savedFlash && <p className="text-sm font-extrabold text-orange">Saved.</p>}
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
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-extrabold text-navy">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
