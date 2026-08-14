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
import XConnectCard from './XConnectCard'
import { ScreenHead } from './ScreenHead'
import type { XConnectionState } from '../useXConnection'

type Props = {
  setup: SetupType
  onSave: (setup: SetupType) => void
  onBack: () => void
  xConnection: XConnectionState
  onSetActiveProject?: (projectId: string) => void
}

export default function Setup({ setup, onSave, onBack, xConnection, onSetActiveProject }: Props) {
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
    onSetActiveProject?.(id)
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
    <section>
      <ScreenHead
        eyebrow="tell it the project once →"
        title="Your setup"
        sub="Each project has its own building, audience, goal, voice, and favorite builders. Drafts borrow all of it."
      />

      <div className="flex max-w-[760px] flex-col gap-4">
        <XConnectCard x={xConnection} />

        <div className="card-soft rounded-3xl px-[22px] py-5">
          <p className="mb-2.5 text-[11px] font-black tracking-[0.08em] text-muted">PROJECTS</p>
          <div className="flex flex-wrap items-center gap-2.5">
            {projects.map((p) => {
              const selected = active?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProject(p.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 py-[7px] text-[12.5px] font-black ${
                    selected
                      ? 'border-orange bg-orange/10 text-navy'
                      : 'border-line bg-cream-2 text-navy hover:border-navy'
                  }`}
                >
                  {p.name.trim() || 'Untitled'}
                  {selected && (
                    <span className="rounded-full bg-orange px-2 py-px text-[9.5px] font-black tracking-[0.06em] text-white">
                      ACTIVE
                    </span>
                  )}
                </button>
              )
            })}
            <button
              type="button"
              onClick={addProject}
              className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-dashed border-line bg-cream-2 px-4 py-2 text-[12.5px] font-extrabold text-navy hover:border-navy"
            >
              + Add project
            </button>
            {active && (
              <button
                type="button"
                onClick={() => removeProject(active.id)}
                className="text-xs font-extrabold text-muted hover:text-red-600 disabled:opacity-40"
                disabled={projects.length <= 1}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {active && (
          <div className="card-soft rounded-3xl px-[22px] py-5">
            <p className="mb-3.5 text-[11px] font-black tracking-[0.08em] text-orange">
              EDITING · {projectLabel.toUpperCase()}
            </p>
            <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2">
              <Field label="Name">
                <input
                  value={active.name}
                  onChange={(e) => patchActive({ name: e.target.value })}
                  className="input-soft min-h-11 w-full text-[13px] font-bold"
                  placeholder="ShipLoud"
                />
              </Field>
              <Field label="URL">
                <input
                  value={active.url ?? ''}
                  onChange={(e) => patchActive({ url: e.target.value })}
                  className="input-soft min-h-11 w-full font-mono text-[13px] font-bold"
                  placeholder="https://www.getshiploud.com"
                  inputMode="url"
                  autoComplete="url"
                />
              </Field>
              <Field label="X handle">
                <div className="flex flex-wrap gap-2">
                  <input
                    value={active.xHandle ?? ''}
                    onChange={(e) => patchActive({ xHandle: e.target.value })}
                    className="input-soft min-h-11 min-w-[10rem] flex-1 font-mono text-[13px] font-bold"
                    placeholder="@dreamandbuildit"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => void checkXNow()}
                    disabled={checking}
                    className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 text-[12.5px] font-extrabold text-navy hover:border-navy disabled:opacity-50"
                  >
                    {checking ? 'Checking…' : 'Check now'}
                  </button>
                </div>
                {checkMsg && <p className="mt-1 text-sm font-extrabold text-orange">{checkMsg}</p>}
              </Field>
              <Field label="Who it's for">
                <input
                  value={active.who}
                  onChange={(e) => patchActive({ who: e.target.value })}
                  className="input-soft min-h-11 w-full text-[13px] font-bold"
                  placeholder="indie builders on X"
                />
              </Field>
              <Field label="Goal">
                <input
                  value={active.goal}
                  onChange={(e) => patchActive({ goal: e.target.value })}
                  className="input-soft min-h-11 w-full text-[13px] font-bold"
                  placeholder="$10K MRR and beyond"
                />
              </Field>
              <Field label="Voice">
                <input
                  value={active.voice}
                  onChange={(e) => patchActive({ voice: e.target.value })}
                  className="input-soft min-h-11 w-full text-[13px] font-bold"
                  placeholder="short lines, numbers, no guru speak"
                />
              </Field>
            </div>
            <Field label="What you're building" hint="1–3 sentences">
              <textarea
                value={active.building}
                onChange={(e) => patchActive({ building: e.target.value })}
                rows={2}
                className="input-soft w-full resize-y text-[13px] font-bold leading-normal"
                placeholder="grow X by turning ship notes into posts…"
              />
            </Field>
          </div>
        )}

        {active && (
          <div className="card-soft rounded-3xl px-[22px] py-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-2">
              <p className="text-[11px] font-black tracking-[0.08em] text-muted">FAVORITE BUILDERS</p>
              <span className="text-[11.5px] font-bold text-muted">· these handles feed your radar</span>
            </div>
            <div className="mb-3 flex flex-col gap-2">
              {active.favoriteBuilders.length === 0 && (
                <p className="text-xs font-semibold text-muted">None yet — add handles below.</p>
              )}
              {active.favoriteBuilders.map((h, i) => {
                const display = normalizeHandle(h) || h
                const tags = tagsForHandle(active.builderTags, display)
                return (
                  <div
                    key={`${display}-${i}`}
                    className="flex items-center gap-2.5 rounded-[14px] border border-line bg-cream-2 px-3.5 py-[9px]"
                  >
                    <span className="text-[13px] font-black text-navy">{display}</span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-muted">
                      {tags.join(' · ') || 'uncategorized'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFavorite(display)}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-line text-xs font-black leading-none text-muted hover:bg-orange hover:text-white"
                      aria-label={`Remove ${display}`}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
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
                className="input-soft w-40 rounded-full px-4 py-[9px] font-mono text-[12.5px] font-bold"
                placeholder="@handle"
              />
              <button
                type="button"
                onClick={() => addFavorite()}
                className="btn-pill whitespace-nowrap px-[18px] py-[9px] text-[12.5px]"
              >
                Add
              </button>
            </div>
            <div className="mt-4">
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
          <button type="button" onClick={handleSave} className="btn-pill whitespace-nowrap px-6 py-2.5 text-sm">
            Save setup
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-2.5 text-sm font-extrabold text-navy hover:border-navy"
          >
            Done
          </button>
          {savedFlash && <p className="text-sm font-extrabold text-orange">Saved.</p>}
        </div>
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
